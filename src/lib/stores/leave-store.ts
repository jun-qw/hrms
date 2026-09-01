'use client';

/**
 * Leave module store — a DB-backed client cache (same pattern as the employee
 * and attendance stores): hydrated once per session, mutations apply
 * optimistically and sync through server actions.
 */
import { create } from 'zustand';
import { toast } from 'sonner';
import * as api from '@/lib/actions/leave-actions';
import { calculateAnnualLeave } from '@/lib/utils/leave-calculator';
import type {
  LeaveType,
  LeaveBalance,
  LeaveRequest,
  LeaveBalanceAdjustment,
} from '@/types';

/**
 * Minimal employee shape used by the bulk annual-leave grant.
 * Employee master data now lives in the employee store / DB.
 */
export interface DemoEmployee {
  id: string;
  name: string;
  department: string;
  hire_date: string;
  position_rank: string;
}

/**
 * @deprecated Employee master data comes from the DB (see `useEmployeeStore`).
 * Kept as an empty array so existing imports keep compiling while the
 * remaining consumers are migrated.
 */
export const demoEmployees: DemoEmployee[] = [];

// ---- Store types ----

interface LeaveState {
  hydrated: boolean;
  leaveTypes: LeaveType[];
  leaveBalances: LeaveBalance[];
  leaveRequests: LeaveRequest[];
  balanceAdjustments: LeaveBalanceAdjustment[];
}

interface LeaveActions {
  // Hydration
  hydrate: (data: api.LeaveModuleData) => void;
  reload: () => Promise<void>;

  // Leave type CRUD
  addLeaveType: (leaveType: LeaveType) => void;
  updateLeaveType: (id: string, data: Partial<LeaveType>) => void;
  deleteLeaveType: (id: string) => void;

  // Balance
  upsertLeaveBalance: (balance: LeaveBalance) => void;
  bulkGrantAnnualLeave: (employees: DemoEmployee[], year: number, refDate: Date) => void;

  // Adjustment
  addBalanceAdjustment: (adjustment: LeaveBalanceAdjustment) => void;

  // Requests
  addLeaveRequest: (request: LeaveRequest) => void;
  approveLeaveRequest: (id: string) => void;
  rejectLeaveRequest: (id: string) => void;
  cancelLeaveRequest: (id: string) => void;
}

export type LeaveStore = LeaveState & LeaveActions;

// ---- Store ----

export const useLeaveStore = create<LeaveStore>()((set, get) => {
  const reload = async () => {
    const data = await api.fetchLeaveData();
    if (!data) return;
    set({
      leaveTypes: data.leaveTypes,
      leaveBalances: data.leaveBalances,
      leaveRequests: data.leaveRequests,
      balanceAdjustments: data.balanceAdjustments,
      hydrated: true,
    });
  };

  const failSync = () => {
    toast.error('휴가 정보 저장에 실패했습니다. 데이터를 다시 불러옵니다.');
    void reload();
  };

  /** Annual leave type id — resolved from DB rows, with a demo-seed fallback. */
  const annualTypeId = () =>
    get().leaveTypes.find((lt) => lt.code === 'annual')?.id ?? 'lt-annual';

  /** Persist a balance row (used_days / total_days changes). */
  const syncBalance = (balance: LeaveBalance) => {
    void api.updateLeaveBalance(balance.id, {
      total_days: balance.total_days,
      used_days: balance.used_days,
    }).then((saved) => {
      if (saved) {
        set((s) => ({
          leaveBalances: s.leaveBalances.map((b) => (b.id === saved.id ? saved : b)),
        }));
      } else {
        failSync();
      }
    });
  };

  /** Apply a used-days delta to the balance matching a request. */
  const applyRequestToBalance = (request: LeaveRequest, delta: number) => {
    const year = new Date(request.start_date).getFullYear();
    const balance = get().leaveBalances.find(
      (b) =>
        b.employee_id === request.employee_id &&
        b.leave_type_id === request.leave_type_id &&
        b.year === year,
    );
    if (!balance) return;
    const next: LeaveBalance = {
      ...balance,
      used_days: balance.used_days + delta,
      remaining_days: balance.remaining_days - delta,
    };
    set((s) => ({ leaveBalances: s.leaveBalances.map((b) => (b.id === next.id ? next : b)) }));
    syncBalance(next);
  };

  const syncRequestStatus = (id: string, status: LeaveRequest['status']) => {
    set((s) => ({
      leaveRequests: s.leaveRequests.map((r) => (r.id === id ? { ...r, status } : r)),
    }));
    void api.updateLeaveRequest(id, { status }).then((saved) => {
      if (saved) {
        set((s) => ({ leaveRequests: s.leaveRequests.map((r) => (r.id === id ? saved : r)) }));
      } else {
        failSync();
      }
    });
  };

  return {
    // --- Initial State ---
    hydrated: false,
    leaveTypes: [],
    leaveBalances: [],
    leaveRequests: [],
    balanceAdjustments: [],

    // --- Hydration ---
    hydrate: (data) =>
      set({
        leaveTypes: data.leaveTypes,
        leaveBalances: data.leaveBalances,
        leaveRequests: data.leaveRequests,
        balanceAdjustments: data.balanceAdjustments,
        hydrated: true,
      }),
    reload,

    // --- Actions ---

    addLeaveType: (leaveType) => {
      set((s) => ({ leaveTypes: [...s.leaveTypes, leaveType] }));
      void api.createLeaveType(leaveType).then((saved) => {
        if (saved) {
          set((s) => ({
            leaveTypes: s.leaveTypes.map((lt) => (lt.id === leaveType.id ? saved : lt)),
          }));
        } else {
          failSync();
        }
      });
    },

    updateLeaveType: (id, data) => {
      set((s) => ({
        leaveTypes: s.leaveTypes.map((lt) => (lt.id === id ? { ...lt, ...data } : lt)),
      }));
      void api.updateLeaveType(id, data).then((saved) => {
        if (saved) {
          set((s) => ({ leaveTypes: s.leaveTypes.map((lt) => (lt.id === id ? saved : lt)) }));
        } else {
          failSync();
        }
      });
    },

    deleteLeaveType: (id) => {
      set((s) => ({ leaveTypes: s.leaveTypes.filter((lt) => lt.id !== id) }));
      void api.deleteLeaveType(id).then((ok) => {
        if (!ok) failSync();
      });
    },

    upsertLeaveBalance: (balance) => {
      set((s) => {
        const idx = s.leaveBalances.findIndex(
          (b) =>
            b.employee_id === balance.employee_id &&
            b.leave_type_id === balance.leave_type_id &&
            b.year === balance.year,
        );
        if (idx >= 0) {
          const updated = [...s.leaveBalances];
          updated[idx] = balance;
          return { leaveBalances: updated };
        }
        return { leaveBalances: [...s.leaveBalances, balance] };
      });
      void api.upsertLeaveBalance(balance).then((saved) => {
        if (saved) {
          set((s) => ({
            leaveBalances: s.leaveBalances.map((b) =>
              b.employee_id === saved.employee_id &&
              b.leave_type_id === saved.leave_type_id &&
              b.year === saved.year
                ? saved
                : b,
            ),
          }));
        } else {
          failSync();
        }
      });
    },

    bulkGrantAnnualLeave: (employees, year, refDate) => {
      const typeId = annualTypeId();
      const current = get().leaveBalances;
      const granted: LeaveBalance[] = [];
      const newBalances = [...current];

      for (const emp of employees) {
        const totalDays = calculateAnnualLeave(new Date(emp.hire_date), refDate);
        const idx = newBalances.findIndex(
          (b) => b.employee_id === emp.id && b.leave_type_id === typeId && b.year === year,
        );
        if (idx >= 0) {
          const existing = newBalances[idx];
          const next: LeaveBalance = {
            ...existing,
            total_days: totalDays,
            remaining_days: totalDays - existing.used_days,
          };
          newBalances[idx] = next;
          granted.push(next);
        } else {
          const next: LeaveBalance = {
            id: `lb-${emp.id}-annual-${year}`,
            employee_id: emp.id,
            leave_type_id: typeId,
            year,
            total_days: totalDays,
            used_days: 0,
            remaining_days: totalDays,
          };
          newBalances.push(next);
          granted.push(next);
        }
      }

      set({ leaveBalances: newBalances });
      if (granted.length === 0) return;
      void api.upsertLeaveBalances(granted).then((saved) => {
        if (saved) {
          set((s) => {
            const merged = [...s.leaveBalances];
            for (const row of saved) {
              const i = merged.findIndex(
                (b) =>
                  b.employee_id === row.employee_id &&
                  b.leave_type_id === row.leave_type_id &&
                  b.year === row.year,
              );
              if (i >= 0) merged[i] = row;
              else merged.push(row);
            }
            return { leaveBalances: merged };
          });
        } else {
          failSync();
        }
      });
    },

    addBalanceAdjustment: (adjustment) => {
      set((s) => ({
        balanceAdjustments: [...s.balanceAdjustments, adjustment],
        leaveBalances: s.leaveBalances.map((b) =>
          b.employee_id === adjustment.employee_id &&
          b.leave_type_id === adjustment.leave_type_id &&
          b.year === adjustment.year
            ? {
                ...b,
                total_days: b.total_days + adjustment.adjustment_days,
                remaining_days: b.remaining_days + adjustment.adjustment_days,
              }
            : b,
        ),
      }));
      // The server action also applies the delta to the matching balance row.
      void api.createBalanceAdjustment(adjustment).then((saved) => {
        if (saved) {
          set((s) => ({
            balanceAdjustments: s.balanceAdjustments.map((a) =>
              a.id === adjustment.id ? saved : a,
            ),
          }));
        } else {
          failSync();
        }
      });
    },

    addLeaveRequest: (request) => {
      set((s) => ({ leaveRequests: [...s.leaveRequests, request] }));
      void api.createLeaveRequest(request).then((saved) => {
        if (saved) {
          set((s) => ({
            leaveRequests: s.leaveRequests.map((r) => (r.id === request.id ? saved : r)),
          }));
        } else {
          failSync();
        }
      });
    },

    approveLeaveRequest: (id) => {
      const req = get().leaveRequests.find((r) => r.id === id);
      if (!req || req.status !== 'pending') return;
      syncRequestStatus(id, 'approved');
      applyRequestToBalance(req, req.days);
    },

    rejectLeaveRequest: (id) => {
      const req = get().leaveRequests.find((r) => r.id === id);
      if (!req || req.status !== 'pending') return;
      syncRequestStatus(id, 'rejected');
    },

    cancelLeaveRequest: (id) => {
      const req = get().leaveRequests.find((r) => r.id === id);
      if (!req) return;
      const wasApproved = req.status === 'approved';
      syncRequestStatus(id, 'cancelled');
      if (wasApproved) applyRequestToBalance(req, -req.days);
    },
  };
});
