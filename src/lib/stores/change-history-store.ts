'use client';

/**
 * Change history store — a DB-backed client cache over an append-only table.
 * Hydrated once per session from fetchSystemData(); entries are appended
 * optimistically and mirrored through appendChangeHistory().
 *
 * Capture settings (what gets recorded, retention, cap) are company policy,
 * so they persist as a JSON section in `company_settings` alongside the other
 * settings sections.
 */
import { create } from 'zustand';
import { toast } from 'sonner';
import * as api from '@/lib/actions/system-actions';
import { saveSettingsSection } from '@/lib/actions/settings-actions';
import type {
  ChangeHistoryEntry,
  ChangeHistorySettings,
  ChangeHistoryEntityType,
} from '@/types';

const DEFAULT_SETTINGS: ChangeHistorySettings = {
  enabled: true,
  max_entries: 5000,
  retention_days: 365,
};

interface ChangeHistoryState {
  hydrated: boolean;
  entries: ChangeHistoryEntry[];
  settings: ChangeHistorySettings;
}

interface ChangeHistoryActions {
  hydrate: (data: api.SystemModuleData) => void;
  reload: () => Promise<void>;
  addEntry: (entry: Omit<ChangeHistoryEntry, 'id' | 'changed_at'>) => void;
  getByEntity: (entityType: ChangeHistoryEntityType, entityId: string) => ChangeHistoryEntry[];
  getByEntityType: (entityType: ChangeHistoryEntityType) => ChangeHistoryEntry[];
  getAllEntries: () => ChangeHistoryEntry[];
  clearOldEntries: () => void;
  clearAll: () => void;
  updateSettings: (data: Partial<ChangeHistorySettings>) => void;
}

export type ChangeHistoryStore = ChangeHistoryState & ChangeHistoryActions;

export const useChangeHistoryStore = create<ChangeHistoryStore>()((set, get) => {
  const reload = async () => {
    const data = await api.fetchSystemData();
    if (data) set({ entries: data.changeHistory, hydrated: true });
  };

  const failSync = () => {
    toast.error('변경 이력 저장에 실패했습니다. 데이터를 다시 불러옵니다.', {
      id: 'change-history-sync',
    });
    void reload();
  };

  return {
    hydrated: false,
    entries: [],
    settings: DEFAULT_SETTINGS,

    hydrate: (data) =>
      set((state) => ({
        entries: data.changeHistory,
        settings: { ...state.settings, ...(data.changeHistorySettings ?? {}) },
        hydrated: true,
      })),
    reload,

    addEntry: (entry) => {
      const { settings } = get();
      if (!settings.enabled) return;

      const tempId = `ch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const optimistic: ChangeHistoryEntry = {
        ...entry,
        id: tempId,
        changed_at: new Date().toISOString(),
      };

      set((s) => {
        let entries = [optimistic, ...s.entries];
        // Enforce max entries
        if (entries.length > s.settings.max_entries) {
          entries = entries.slice(0, s.settings.max_entries);
        }
        return { entries };
      });

      void api.appendChangeHistory(entry).then((saved) => {
        if (saved) {
          set((s) => ({ entries: s.entries.map((e) => (e.id === tempId ? saved : e)) }));
        } else {
          failSync();
        }
      });
    },

    getByEntity: (entityType, entityId) =>
      get()
        .entries.filter((e) => e.entity_type === entityType && e.entity_id === entityId)
        .sort((a, b) => b.changed_at.localeCompare(a.changed_at)),

    getByEntityType: (entityType) =>
      get()
        .entries.filter((e) => e.entity_type === entityType)
        .sort((a, b) => b.changed_at.localeCompare(a.changed_at)),

    getAllEntries: () =>
      [...get().entries].sort((a, b) => b.changed_at.localeCompare(a.changed_at)),

    clearOldEntries: () => {
      const { settings } = get();
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - settings.retention_days);
      const cutoffStr = cutoff.toISOString();

      set((s) => ({ entries: s.entries.filter((e) => e.changed_at >= cutoffStr) }));
      void api.clearOldChangeHistory(settings.retention_days).then((ok) => {
        if (!ok) failSync();
      });
    },

    clearAll: () => {
      set({ entries: [] });
      void api.clearChangeHistory().then((ok) => {
        if (!ok) failSync();
      });
    },

    updateSettings: (data) => {
      set((s) => ({ settings: { ...s.settings, ...data } }));
      void saveSettingsSection(
        'changeHistory',
        get().settings as unknown as Record<string, unknown>,
      ).then((ok) => {
        if (!ok) toast.error('변경이력 설정 저장에 실패했습니다.');
      });
    },
  };
});
