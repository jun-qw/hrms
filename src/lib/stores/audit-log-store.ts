'use client';

/**
 * Audit log store — a DB-backed client cache over an append-only table.
 * Hydrated once per session from fetchSystemData(); entries are appended
 * optimistically and mirrored through appendAuditLog().
 *
 * Capture settings (what gets recorded, retention, cap) are company policy,
 * so they persist as a JSON section in `company_settings` alongside the other
 * settings sections.
 */
import { create } from 'zustand';
import { toast } from 'sonner';
import * as api from '@/lib/actions/system-actions';
import { saveSettingsSection } from '@/lib/actions/settings-actions';
import type { AuditLogEntry, AuditLogSettings } from '@/types';

const DEFAULT_SETTINGS: AuditLogSettings = {
  enabled: true,
  track_page_views: true,
  track_creates: true,
  track_updates: true,
  track_deletes: true,
  track_logins: true,
  retention_days: 90,
  max_entries: 1000,
};

interface AuditLogState {
  hydrated: boolean;
  logs: AuditLogEntry[];
  settings: AuditLogSettings;
  hydrate: (data: api.SystemModuleData) => void;
  reload: () => Promise<void>;
  addLog: (entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) => void;
  clearLogs: () => void;
  clearOldLogs: () => void;
  updateSettings: (partial: Partial<AuditLogSettings>) => void;
}

export const useAuditLogStore = create<AuditLogState>()((set, get) => {
  const reload = async () => {
    const data = await api.fetchSystemData();
    if (data) set({ logs: data.auditLogs, hydrated: true });
  };

  // Audit entries are written on nearly every interaction, so failures are
  // reported through a single de-duplicated toast rather than one per entry.
  const failSync = () => {
    toast.error('감사 로그 저장에 실패했습니다. 데이터를 다시 불러옵니다.', { id: 'audit-log-sync' });
    void reload();
  };

  return {
    hydrated: false,
    logs: [],
    settings: DEFAULT_SETTINGS,

    hydrate: (data) =>
      set((state) => ({
        logs: data.auditLogs,
        settings: { ...state.settings, ...(data.auditLogSettings ?? {}) },
        hydrated: true,
      })),
    reload,

    addLog: (entry) => {
      const { settings, logs } = get();
      if (!settings.enabled) return;

      // Action type gate
      const gateMap: Record<string, keyof AuditLogSettings> = {
        page_view: 'track_page_views',
        create: 'track_creates',
        update: 'track_updates',
        delete: 'track_deletes',
        login: 'track_logins',
        logout: 'track_logins',
      };
      const gate = gateMap[entry.action_type];
      if (gate && !settings[gate]) return;

      const tempId = crypto.randomUUID();
      const optimistic: AuditLogEntry = {
        ...entry,
        id: tempId,
        timestamp: new Date().toISOString(),
      };

      let newLogs = [optimistic, ...logs];
      if (newLogs.length > settings.max_entries) {
        newLogs = newLogs.slice(0, settings.max_entries);
      }
      set({ logs: newLogs });

      void api.appendAuditLog(entry).then((saved) => {
        if (saved) {
          set((s) => ({ logs: s.logs.map((l) => (l.id === tempId ? saved : l)) }));
        } else {
          failSync();
        }
      });
    },

    clearLogs: () => {
      set({ logs: [] });
      void api.clearAuditLogs().then((ok) => {
        if (!ok) failSync();
      });
    },

    clearOldLogs: () => {
      const { settings } = get();
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - settings.retention_days);
      const cutoffStr = cutoff.toISOString();
      set((s) => ({ logs: s.logs.filter((l) => l.timestamp >= cutoffStr) }));
      void api.clearOldAuditLogs(settings.retention_days).then((ok) => {
        if (!ok) failSync();
      });
    },

    updateSettings: (partial) => {
      set((state) => ({ settings: { ...state.settings, ...partial } }));
      void saveSettingsSection(
        'auditLog',
        get().settings as unknown as Record<string, unknown>,
      ).then((ok) => {
        if (!ok) toast.error('감사로그 설정 저장에 실패했습니다.');
      });
    },
  };
});
