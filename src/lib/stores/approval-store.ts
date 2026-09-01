'use client';

/**
 * Approval module store — a DB-backed client cache (same pattern as the
 * employee/attendance stores): hydrated once per session, mutations apply
 * optimistically and sync through server actions.
 */
import { create } from 'zustand';
import { toast } from 'sonner';
import * as api from '@/lib/actions/approval-actions';
import type {
  Approval,
  ApprovalLine,
  ApprovalStatus,
  ApprovalLineStatus,
} from '@/types';

// ---------------------------------------------------------------------------
// Store types
// ---------------------------------------------------------------------------

interface ApprovalState {
  hydrated: boolean;
  approvals: Approval[];
  approvalLines: ApprovalLine[];
}

interface ApprovalActions {
  hydrate: (data: api.ApprovalModuleData) => void;
  reload: () => Promise<void>;
  createApproval: (approval: Approval, lines: ApprovalLine[]) => void;
  approveStep: (approvalId: string, approverId: string, comment?: string) => void;
  rejectStep: (approvalId: string, approverId: string, comment?: string) => void;
  cancelApproval: (approvalId: string) => void;
}

interface ApprovalGetters {
  getApprovalById: (id: string) => Approval | undefined;
  getApprovalsByStatus: (status: ApprovalStatus) => Approval[];
  getPendingForApprover: (approverId: string) => Approval[];
  getLinesByApproval: (approvalId: string) => ApprovalLine[];
}

export type ApprovalStore = ApprovalState & ApprovalActions & ApprovalGetters;

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useApprovalStore = create<ApprovalStore>()((set, get) => {
  const reload = async () => {
    const data = await api.fetchApprovalData();
    if (data) {
      set({
        approvals: data.approvals,
        approvalLines: data.approvalLines,
        hydrated: true,
      });
    }
  };

  const failSync = () => {
    toast.error('전자결재 저장에 실패했습니다. 데이터를 다시 불러옵니다.');
    void reload();
  };

  /** Swap an optimistic document (and its lines) for the rows the server made. */
  const commit = (
    localId: string,
    saved: { approval: Approval; lines: ApprovalLine[] },
  ) => {
    set((s) => ({
      approvals: s.approvals.map((a) => (a.id === localId ? saved.approval : a)),
      approvalLines: [
        ...s.approvalLines.filter(
          (l) => l.approval_id !== localId && l.approval_id !== saved.approval.id,
        ),
        ...saved.lines,
      ],
    }));
  };

  return {
    hydrated: false,
    approvals: [],
    approvalLines: [],

    hydrate: (data) =>
      set({
        approvals: data.approvals,
        approvalLines: data.approvalLines,
        hydrated: true,
      }),
    reload,

    createApproval: (approval, lines) => {
      set((s) => ({
        approvals: [...s.approvals, approval],
        approvalLines: [...s.approvalLines, ...lines],
      }));
      void api.createApproval(approval, lines).then((saved) => {
        if (saved) commit(approval.id, saved);
        else failSync();
      });
    },

    approveStep: (approvalId, approverId, comment) => {
      set((s) => {
        const lines = s.approvalLines.filter((l) => l.approval_id === approvalId);

        // Find the current pending line for this approver (결재 or 합의, not 참조)
        const currentLine = lines.find(
          (l) => l.approver_id === approverId && l.status === 'pending' && l.line_type !== 'cc',
        );
        if (!currentLine) return s;

        const now = new Date().toISOString();
        const newLines = s.approvalLines.map((l) =>
          l.id === currentLine.id
            ? { ...l, status: 'approved' as ApprovalLineStatus, comment: comment ?? null, acted_at: now }
            : l,
        );

        // 결재 완료 판정:
        // 1) 모든 합의(agreement) 라인이 승인되어야 함
        // 2) 모든 결재(approval) 라인이 승인되어야 함
        // 3) 참조(cc)는 판정에서 제외
        const updatedLines = newLines.filter((l) => l.approval_id === approvalId);
        const agreementLines = updatedLines.filter((l) => l.line_type === 'agreement');
        const approvalLines = updatedLines.filter((l) => l.line_type === 'approval');

        const allAgreementsApproved = agreementLines.every((l) => l.status === 'approved');
        const allApprovalsApproved = approvalLines.every((l) => l.status === 'approved');
        const allDone = allAgreementsApproved && allApprovalsApproved;

        // 참조자는 최종결재 완료 시 자동으로 'approved'(열람 가능) 처리
        let finalLines = newLines;
        if (allDone) {
          finalLines = finalLines.map((l) =>
            l.approval_id === approvalId && l.line_type === 'cc' && l.status === 'pending'
              ? { ...l, status: 'approved' as ApprovalLineStatus, acted_at: now, comment: '참조 열람' }
              : l,
          );
        }

        const newApprovals = s.approvals.map((a) => {
          if (a.id !== approvalId) return a;
          if (allDone) {
            return { ...a, status: 'approved' as ApprovalStatus, completed_at: now };
          }
          return { ...a, status: 'in_progress' as ApprovalStatus };
        });

        return { approvals: newApprovals, approvalLines: finalLines };
      });

      void api.progressApproval(approvalId, approverId, 'approved', comment).then((saved) => {
        if (saved) commit(approvalId, saved);
        else failSync();
      });
    },

    rejectStep: (approvalId, approverId, comment) => {
      set((s) => {
        const now = new Date().toISOString();
        const currentLine = s.approvalLines.find(
          (l) => l.approval_id === approvalId && l.approver_id === approverId && l.status === 'pending' && l.line_type !== 'cc',
        );
        if (!currentLine) return s;

        const newLines = s.approvalLines.map((l) =>
          l.id === currentLine.id
            ? { ...l, status: 'rejected' as ApprovalLineStatus, comment: comment ?? null, acted_at: now }
            : l,
        );

        const newApprovals = s.approvals.map((a) =>
          a.id === approvalId
            ? { ...a, status: 'rejected' as ApprovalStatus, completed_at: now }
            : a,
        );

        return { approvals: newApprovals, approvalLines: newLines };
      });

      void api.progressApproval(approvalId, approverId, 'rejected', comment).then((saved) => {
        if (saved) commit(approvalId, saved);
        else failSync();
      });
    },

    cancelApproval: (approvalId) => {
      set((s) => ({
        approvals: s.approvals.map((a) =>
          a.id === approvalId
            ? { ...a, status: 'cancelled' as ApprovalStatus, completed_at: new Date().toISOString() }
            : a,
        ),
      }));
      void api.cancelApproval(approvalId).then((saved) => {
        if (saved) {
          set((s) => ({
            approvals: s.approvals.map((a) => (a.id === approvalId ? saved : a)),
          }));
        } else {
          failSync();
        }
      });
    },

    // --- Getters (unchanged) ---
    getApprovalById: (id) => get().approvals.find((a) => a.id === id),

    getApprovalsByStatus: (status) => get().approvals.filter((a) => a.status === status),

    getPendingForApprover: (approverId) => {
      const s = get();
      // 결재/합의 대기건만 (참조는 제외)
      const pendingLineApprovalIds = s.approvalLines
        .filter((l) => l.approver_id === approverId && l.status === 'pending' && l.line_type !== 'cc')
        .map((l) => l.approval_id);
      return s.approvals.filter(
        (a) =>
          pendingLineApprovalIds.includes(a.id) &&
          (a.status === 'pending' || a.status === 'in_progress'),
      );
    },

    getLinesByApproval: (approvalId) =>
      get()
        .approvalLines.filter((l) => l.approval_id === approvalId)
        .sort((a, b) => a.step - b.step),
  };
});
