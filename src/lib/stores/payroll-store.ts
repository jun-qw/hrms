'use client';

/**
 * Payroll module store — a DB-backed client cache (same pattern as the employee
 * and attendance stores): hydrated once per session, mutations apply
 * optimistically and sync through server actions.
 *
 * Item masters, saved payrolls and per-employee allowance settings all live in
 * the DB; the seed data that used to be hard-coded here now lives in
 * `@/lib/demo-data/payroll-seed`.
 */
import { create } from 'zustand';
import { toast } from 'sonner';
import * as api from '@/lib/actions/payroll-actions';
import type {
  PayrollItemConfig,
  SavedPayroll,
  PayrollStatus,
  EmployeePayrollSetting,
} from '@/types';

// ---- 월 소정근로시간 (근로기준법) ----
export const MONTHLY_WORK_HOURS = 209;

// ---- Store types ----

interface PayrollState {
  hydrated: boolean;
  payrollItems: PayrollItemConfig[];
  savedPayrolls: SavedPayroll[];
  employeePayrollSettings: EmployeePayrollSetting[];
}

interface PayrollActions {
  // Hydration
  hydrate: (data: Pick<
    api.PayrollModuleData,
    'payrollItems' | 'savedPayrolls' | 'employeePayrollSettings'
  >) => void;
  reload: () => Promise<void>;

  // Item CRUD
  addPayrollItem: (item: PayrollItemConfig) => void;
  updatePayrollItem: (id: string, data: Partial<PayrollItemConfig>) => void;
  deletePayrollItem: (id: string) => void;
  togglePayrollItem: (id: string) => void;

  // Payroll records
  savePayroll: (payroll: SavedPayroll) => void;
  updatePayrollStatus: (id: string, status: PayrollStatus) => void;
  deletePayroll: (id: string) => void;

  // Employee payroll settings
  addEmployeePayrollSetting: (setting: EmployeePayrollSetting) => void;
  updateEmployeePayrollSetting: (id: string, data: Partial<EmployeePayrollSetting>) => void;
  deleteEmployeePayrollSetting: (id: string) => void;
  getEmployeePayrollSettings: (employeeId: string) => EmployeePayrollSetting[];
}

export type PayrollStore = PayrollState & PayrollActions;

// ---- Store ----

export const usePayrollStore = create<PayrollStore>()((set, get) => {
  const reload = async () => {
    const data = await api.fetchPayrollData();
    if (!data) return;
    set({
      payrollItems: data.payrollItems,
      savedPayrolls: data.savedPayrolls,
      employeePayrollSettings: data.employeePayrollSettings,
      hydrated: true,
    });
  };

  const failSync = () => {
    toast.error('급여 정보 저장에 실패했습니다. 데이터를 다시 불러옵니다.');
    void reload();
  };

  return {
    // --- Initial State ---
    hydrated: false,
    payrollItems: [],
    savedPayrolls: [],
    employeePayrollSettings: [],

    // --- Hydration ---
    hydrate: (data) =>
      set({
        payrollItems: data.payrollItems,
        savedPayrolls: data.savedPayrolls,
        employeePayrollSettings: data.employeePayrollSettings,
        hydrated: true,
      }),
    reload,

    // --- Payroll item master ---

    addPayrollItem: (item) => {
      set((s) => ({ payrollItems: [...s.payrollItems, item] }));
      void api.createPayrollItemConfig(item).then((saved) => {
        if (saved) {
          set((s) => ({
            payrollItems: s.payrollItems.map((pi) => (pi.id === item.id ? saved : pi)),
          }));
        } else {
          failSync();
        }
      });
    },

    updatePayrollItem: (id, data) => {
      set((s) => ({
        payrollItems: s.payrollItems.map((pi) => (pi.id === id ? { ...pi, ...data } : pi)),
      }));
      void api.updatePayrollItemConfig(id, data).then((saved) => {
        if (saved) {
          set((s) => ({
            payrollItems: s.payrollItems.map((pi) => (pi.id === id ? saved : pi)),
          }));
        } else {
          failSync();
        }
      });
    },

    deletePayrollItem: (id) => {
      set((s) => ({ payrollItems: s.payrollItems.filter((pi) => pi.id !== id) }));
      void api.deletePayrollItemConfig(id).then((ok) => {
        if (!ok) failSync();
      });
    },

    togglePayrollItem: (id) => {
      const current = get().payrollItems.find((pi) => pi.id === id);
      if (!current) return;
      const isActive = !current.is_active;
      set((s) => ({
        payrollItems: s.payrollItems.map((pi) =>
          pi.id === id ? { ...pi, is_active: isActive } : pi,
        ),
      }));
      void api.updatePayrollItemConfig(id, { is_active: isActive }).then((saved) => {
        if (saved) {
          set((s) => ({
            payrollItems: s.payrollItems.map((pi) => (pi.id === id ? saved : pi)),
          }));
        } else {
          failSync();
        }
      });
    },

    // --- Saved payrolls ---

    savePayroll: (payroll) => {
      // Upsert by (employee, year, month) — same key the DB enforces.
      const sameKey = (p: SavedPayroll) =>
        p.employee_id === payroll.employee_id &&
        p.year === payroll.year &&
        p.month === payroll.month;

      set((s) => {
        const idx = s.savedPayrolls.findIndex(sameKey);
        if (idx >= 0) {
          const updated = [...s.savedPayrolls];
          updated[idx] = payroll;
          return { savedPayrolls: updated };
        }
        return { savedPayrolls: [...s.savedPayrolls, payroll] };
      });

      void api.savePayroll(payroll).then((saved) => {
        if (saved) {
          set((s) => ({ savedPayrolls: s.savedPayrolls.map((p) => (sameKey(p) ? saved : p)) }));
        } else {
          failSync();
        }
      });
    },

    updatePayrollStatus: (id, status) => {
      set((s) => ({
        savedPayrolls: s.savedPayrolls.map((p) => (p.id === id ? { ...p, status } : p)),
      }));
      void api.updatePayrollStatus(id, status).then((saved) => {
        if (saved) {
          set((s) => ({ savedPayrolls: s.savedPayrolls.map((p) => (p.id === id ? saved : p)) }));
        } else {
          failSync();
        }
      });
    },

    deletePayroll: (id) => {
      set((s) => ({ savedPayrolls: s.savedPayrolls.filter((p) => p.id !== id) }));
      void api.deletePayroll(id).then((ok) => {
        if (!ok) failSync();
      });
    },

    // --- Employee payroll settings ---

    addEmployeePayrollSetting: (setting) => {
      set((s) => ({ employeePayrollSettings: [...s.employeePayrollSettings, setting] }));
      void api.createEmployeePayrollSetting(setting).then((saved) => {
        if (saved) {
          set((s) => ({
            employeePayrollSettings: s.employeePayrollSettings.map((eps) =>
              eps.id === setting.id ? saved : eps,
            ),
          }));
        } else {
          failSync();
        }
      });
    },

    updateEmployeePayrollSetting: (id, data) => {
      const updatedAt = new Date().toISOString();
      set((s) => ({
        employeePayrollSettings: s.employeePayrollSettings.map((eps) =>
          eps.id === id ? { ...eps, ...data, updated_at: updatedAt } : eps,
        ),
      }));
      void api.updateEmployeePayrollSetting(id, data).then((saved) => {
        if (saved) {
          set((s) => ({
            employeePayrollSettings: s.employeePayrollSettings.map((eps) =>
              eps.id === id ? saved : eps,
            ),
          }));
        } else {
          failSync();
        }
      });
    },

    deleteEmployeePayrollSetting: (id) => {
      set((s) => ({
        employeePayrollSettings: s.employeePayrollSettings.filter((eps) => eps.id !== id),
      }));
      void api.deleteEmployeePayrollSetting(id).then((ok) => {
        if (!ok) failSync();
      });
    },

    getEmployeePayrollSettings: (employeeId) =>
      get().employeePayrollSettings.filter((eps) => eps.employee_id === employeeId),
  };
});
