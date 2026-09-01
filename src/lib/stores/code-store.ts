'use client';

/**
 * Code management store (설정 > 코드관리) — a DB-backed client cache.
 * Hydrated once per session from fetchSystemData(); mutations apply
 * optimistically and sync through server actions.
 */
import { create } from 'zustand';
import { toast } from 'sonner';
import * as api from '@/lib/actions/system-actions';

// ---- Interfaces ----

export interface CodeGroup {
  id: string;
  group_code: string;
  group_name: string;
  description: string;
  sort_order: number;
  is_active: boolean;
  is_system: boolean;
  effective_from: string | null;
  effective_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface CodeItem {
  id: string;
  group_id: string;
  code: string;
  label: string;
  sort_order: number;
  is_active: boolean;
  is_system: boolean;
  effective_from: string | null;
  effective_to: string | null;
  created_at: string;
  updated_at: string;
}

// ---- Store ----

interface CodeState {
  hydrated: boolean;
  codeGroups: CodeGroup[];
  codeItems: CodeItem[];
}

interface CodeActions {
  hydrate: (data: api.SystemModuleData) => void;
  reload: () => Promise<void>;

  // Group CRUD
  addCodeGroup: (group: Omit<CodeGroup, 'id' | 'created_at' | 'updated_at' | 'is_system'>) => void;
  updateCodeGroup: (id: string, data: Partial<Pick<CodeGroup, 'group_name' | 'description' | 'sort_order' | 'is_active'>>) => void;
  deleteCodeGroup: (id: string) => boolean;
  toggleCodeGroupActive: (id: string) => void;

  // Item CRUD
  addCodeItem: (item: Omit<CodeItem, 'id' | 'created_at' | 'updated_at' | 'is_system'>) => void;
  updateCodeItem: (id: string, data: Partial<Pick<CodeItem, 'label' | 'sort_order' | 'is_active'>>) => void;
  deleteCodeItem: (id: string) => boolean;
  toggleCodeItemActive: (id: string) => void;

  // Selectors
  getItemsByGroup: (groupId: string) => CodeItem[];
  getActiveItemsByGroupCode: (groupCode: string) => CodeItem[];
}

export type CodeStore = CodeState & CodeActions;

export const useCodeStore = create<CodeStore>()((set, get) => {
  const reload = async () => {
    const data = await api.fetchSystemData();
    if (data) {
      set({ codeGroups: data.codeGroups, codeItems: data.codeItems, hydrated: true });
    }
  };

  const failSync = () => {
    toast.error('코드 저장에 실패했습니다. 데이터를 다시 불러옵니다.');
    void reload();
  };

  return {
    hydrated: false,
    codeGroups: [],
    codeItems: [],

    hydrate: (data) =>
      set({ codeGroups: data.codeGroups, codeItems: data.codeItems, hydrated: true }),
    reload,

    // ---- Group Actions ----

    addCodeGroup: (group) => {
      const now = new Date().toISOString();
      const tempId = `cg-${group.group_code.toLowerCase()}-${Date.now()}`;
      const optimistic: CodeGroup = {
        ...group,
        id: tempId,
        is_system: false,
        effective_from: null,
        effective_to: null,
        created_at: now,
        updated_at: now,
      };
      set((s) => ({ codeGroups: [...s.codeGroups, optimistic] }));
      void api.createCodeGroup(group).then((saved) => {
        if (saved) {
          set((s) => ({ codeGroups: s.codeGroups.map((g) => (g.id === tempId ? saved : g)) }));
        } else {
          failSync();
        }
      });
    },

    updateCodeGroup: (id, data) => {
      set((s) => ({
        codeGroups: s.codeGroups.map((g) =>
          g.id === id ? { ...g, ...data, updated_at: new Date().toISOString() } : g,
        ),
      }));
      void api.updateCodeGroup(id, data).then((saved) => {
        if (saved) {
          set((s) => ({ codeGroups: s.codeGroups.map((g) => (g.id === id ? saved : g)) }));
        } else {
          failSync();
        }
      });
    },

    deleteCodeGroup: (id) => {
      const group = get().codeGroups.find((g) => g.id === id);
      if (!group || group.is_system) return false;
      const today = new Date().toISOString().split('T')[0];
      const now = new Date().toISOString();
      set((s) => ({
        codeGroups: s.codeGroups.map((g) =>
          g.id === id ? { ...g, is_active: false, effective_to: today, updated_at: now } : g,
        ),
        codeItems: s.codeItems.map((i) =>
          i.group_id === id ? { ...i, is_active: false, effective_to: today, updated_at: now } : i,
        ),
      }));
      void api.deleteCodeGroup(id).then((ok) => {
        if (!ok) failSync();
      });
      return true;
    },

    toggleCodeGroupActive: (id) => {
      const group = get().codeGroups.find((g) => g.id === id);
      if (!group) return;
      const next = !group.is_active;
      set((s) => ({
        codeGroups: s.codeGroups.map((g) =>
          g.id === id ? { ...g, is_active: next, updated_at: new Date().toISOString() } : g,
        ),
      }));
      void api.updateCodeGroup(id, { is_active: next }).then((saved) => {
        if (saved) {
          set((s) => ({ codeGroups: s.codeGroups.map((g) => (g.id === id ? saved : g)) }));
        } else {
          failSync();
        }
      });
    },

    // ---- Item Actions ----

    addCodeItem: (item) => {
      const now = new Date().toISOString();
      const tempId = `ci-${item.group_id.replace('cg-', '')}-${item.code}-${Date.now()}`;
      const optimistic: CodeItem = {
        ...item,
        id: tempId,
        is_system: false,
        effective_from: null,
        effective_to: null,
        created_at: now,
        updated_at: now,
      };
      set((s) => ({ codeItems: [...s.codeItems, optimistic] }));
      void api.createCodeItem(item).then((saved) => {
        if (saved) {
          set((s) => ({ codeItems: s.codeItems.map((i) => (i.id === tempId ? saved : i)) }));
        } else {
          failSync();
        }
      });
    },

    updateCodeItem: (id, data) => {
      set((s) => ({
        codeItems: s.codeItems.map((i) =>
          i.id === id ? { ...i, ...data, updated_at: new Date().toISOString() } : i,
        ),
      }));
      void api.updateCodeItem(id, data).then((saved) => {
        if (saved) {
          set((s) => ({ codeItems: s.codeItems.map((i) => (i.id === id ? saved : i)) }));
        } else {
          failSync();
        }
      });
    },

    deleteCodeItem: (id) => {
      const item = get().codeItems.find((i) => i.id === id);
      if (!item || item.is_system) return false;
      const today = new Date().toISOString().split('T')[0];
      const now = new Date().toISOString();
      set((s) => ({
        codeItems: s.codeItems.map((i) =>
          i.id === id ? { ...i, is_active: false, effective_to: today, updated_at: now } : i,
        ),
      }));
      void api.deleteCodeItem(id).then((ok) => {
        if (!ok) failSync();
      });
      return true;
    },

    toggleCodeItemActive: (id) => {
      const item = get().codeItems.find((i) => i.id === id);
      if (!item) return;
      const next = !item.is_active;
      set((s) => ({
        codeItems: s.codeItems.map((i) =>
          i.id === id ? { ...i, is_active: next, updated_at: new Date().toISOString() } : i,
        ),
      }));
      void api.updateCodeItem(id, { is_active: next }).then((saved) => {
        if (saved) {
          set((s) => ({ codeItems: s.codeItems.map((i) => (i.id === id ? saved : i)) }));
        } else {
          failSync();
        }
      });
    },

    // ---- Selectors ----

    getItemsByGroup: (groupId) =>
      get()
        .codeItems.filter((i) => i.group_id === groupId)
        .sort((a, b) => a.sort_order - b.sort_order),

    getActiveItemsByGroupCode: (groupCode) => {
      const group = get().codeGroups.find((g) => g.group_code === groupCode && g.is_active);
      if (!group) return [];
      return get()
        .codeItems.filter((i) => i.group_id === group.id && i.is_active)
        .sort((a, b) => a.sort_order - b.sort_order);
    },
  };
});
