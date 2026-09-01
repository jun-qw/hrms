'use client';

/**
 * HR issue store — a DB-backed client cache. Hydrated once per session from
 * fetchSystemData(); mutations apply optimistically and sync through server
 * actions.
 */
import { create } from 'zustand';
import { toast } from 'sonner';
import * as api from '@/lib/actions/system-actions';
import type { HrIssue } from '@/types';

interface IssueState {
  hydrated: boolean;
  issues: HrIssue[];
}

interface IssueActions {
  hydrate: (data: api.SystemModuleData) => void;
  reload: () => Promise<void>;
  addIssue: (issue: HrIssue) => void;
  updateIssue: (id: string, data: Partial<HrIssue>) => void;
  deleteIssue: (id: string) => void;
}

interface IssueGetters {
  getIssueById: (id: string) => HrIssue | undefined;
  getAllIssues: () => HrIssue[];
}

export type IssueStore = IssueState & IssueActions & IssueGetters;

export const useIssueStore = create<IssueStore>()((set, get) => {
  const reload = async () => {
    const data = await api.fetchSystemData();
    if (data) set({ issues: data.issues, hydrated: true });
  };

  const failSync = () => {
    toast.error('이슈 저장에 실패했습니다. 데이터를 다시 불러옵니다.');
    void reload();
  };

  return {
    hydrated: false,
    issues: [],

    hydrate: (data) => set({ issues: data.issues, hydrated: true }),
    reload,

    addIssue: (issue) => {
      set((s) => ({ issues: [...s.issues, issue] }));
      void api.createIssue(issue).then((saved) => {
        if (saved) {
          set((s) => ({ issues: s.issues.map((i) => (i.id === issue.id ? saved : i)) }));
        } else {
          failSync();
        }
      });
    },

    updateIssue: (id, data) => {
      // HR issue dates are plain YYYY-MM-DD strings throughout the UI
      const patch = { ...data, updated_at: new Date().toISOString().split('T')[0] };
      set((s) => ({
        issues: s.issues.map((issue) => (issue.id === id ? { ...issue, ...patch } : issue)),
      }));
      void api.updateIssue(id, data).then((saved) => {
        if (saved) {
          set((s) => ({ issues: s.issues.map((issue) => (issue.id === id ? saved : issue)) }));
        } else {
          failSync();
        }
      });
    },

    deleteIssue: (id) => {
      set((s) => ({ issues: s.issues.filter((issue) => issue.id !== id) }));
      void api.deleteIssue(id).then((ok) => {
        if (!ok) failSync();
      });
    },

    getIssueById: (id) => get().issues.find((issue) => issue.id === id),

    getAllIssues: () =>
      [...get().issues].sort((a, b) => b.created_at.localeCompare(a.created_at)),
  };
});
