'use client';

/**
 * Retirement settlement store — a DB-backed client cache (same pattern as the
 * employee and attendance stores): hydrated once per session, mutations apply
 * optimistically and sync through server actions.
 */
import { create } from 'zustand';
import { toast } from 'sonner';
import * as api from '@/lib/actions/payroll-actions';
import type { RetirementSettlement, RetirementSettlementStatus } from '@/types';

// === 퇴직금 계산 유틸 ===
// 법정 퇴직금 = (일평균임금 × 30일) × (근속일수 / 365)

export function calcRetirementPay(input: {
  baseSalaryAvg: number;
  bonusAvg: number;
  annualLeaveCompensation: number;
  hireDate: string;
  resignationDate: string;
}) {
  const hire = new Date(input.hireDate);
  const resign = new Date(input.resignationDate);
  const serviceDays = Math.max(0, Math.round((resign.getTime() - hire.getTime()) / (1000 * 60 * 60 * 24)));
  const serviceYears = serviceDays / 365;

  // 평균임금 = (퇴직 전 3개월 임금 + 연간 상여 / 4 + 연차수당 / 4) / 3개월 일수(약 90일)
  // 단순화: 월 기준 → (월기본급 + 월상여) × 3 + 연차수당, 90일로 나눔
  const threeMonthWage = (input.baseSalaryAvg + input.bonusAvg) * 3 + input.annualLeaveCompensation;
  const dailyAvgWage = Math.round(threeMonthWage / 90);

  // 통상임금 비교 - 단순화: 월 기본급 / 30 (실무에서는 더 복잡)
  const dailyOrdinaryWage = Math.round(input.baseSalaryAvg / 30);
  const dailyForCalc = Math.max(dailyAvgWage, dailyOrdinaryWage); // 큰 쪽으로

  const retirementPay = Math.round(dailyForCalc * 30 * (serviceDays / 365));

  // 퇴직소득세 (간이 계산 - 실제는 근속연수공제 등 복잡)
  let taxRate = 0;
  if (serviceYears < 5) taxRate = 0.06;
  else if (serviceYears < 10) taxRate = 0.05;
  else if (serviceYears < 20) taxRate = 0.04;
  else taxRate = 0.03;
  const incomeTax = Math.round(retirementPay * taxRate);
  const localTax = Math.round(incomeTax * 0.1);
  const netPay = retirementPay - incomeTax - localTax;

  return {
    serviceDays,
    serviceYears: Math.round(serviceYears * 100) / 100,
    dailyAvgWage: dailyForCalc,
    retirementPay,
    incomeTax,
    localTax,
    netPay,
  };
}

// ---- Store types ----

interface State {
  hydrated: boolean;
  settlements: RetirementSettlement[];
}

interface Actions {
  hydrate: (data: Pick<api.PayrollModuleData, 'retirementSettlements'>) => void;
  reload: () => Promise<void>;
  upsertSettlement: (s: RetirementSettlement) => void;
  updateStatus: (id: string, status: RetirementSettlementStatus, paidBy?: string, paidByName?: string) => void;
  deleteSettlement: (id: string) => void;
  getByEmployee: (employeeId: string) => RetirementSettlement | undefined;
  getAll: () => RetirementSettlement[];
}

export type RetirementStore = State & Actions;

// ---- Store ----

export const useRetirementStore = create<RetirementStore>()((set, get) => {
  const reload = async () => {
    const data = await api.fetchPayrollData();
    if (!data) return;
    set({ settlements: data.retirementSettlements, hydrated: true });
  };

  const failSync = () => {
    toast.error('퇴직정산 저장에 실패했습니다. 데이터를 다시 불러옵니다.');
    void reload();
  };

  return {
    hydrated: false,
    settlements: [],

    hydrate: (data) => set({ settlements: data.retirementSettlements, hydrated: true }),
    reload,

    upsertSettlement: (settlement) => {
      const exists = get().settlements.some((x) => x.id === settlement.id);
      const now = new Date().toISOString();
      const optimistic: RetirementSettlement = { ...settlement, updated_at: now };

      set((state) => ({
        settlements: exists
          ? state.settlements.map((x) => (x.id === optimistic.id ? optimistic : x))
          : [...state.settlements, optimistic],
      }));

      const request = exists
        ? api.updateRetirementSettlement(optimistic.id, optimistic)
        : api.createRetirementSettlement(optimistic);

      void request.then((saved) => {
        if (saved) {
          set((state) => ({
            settlements: state.settlements.map((x) => (x.id === optimistic.id ? saved : x)),
          }));
        } else {
          failSync();
        }
      });
    },

    updateStatus: (id, status, paidBy, paidByName) => {
      const current = get().settlements.find((s) => s.id === id);
      if (!current) return;
      const now = new Date().toISOString();
      const patch: Partial<RetirementSettlement> = {
        status,
        paid_at: status === 'paid' ? now : current.paid_at,
        paid_by: status === 'paid' ? (paidBy ?? current.paid_by) : current.paid_by,
        paid_by_name: status === 'paid' ? (paidByName ?? current.paid_by_name) : current.paid_by_name,
        updated_at: now,
      };

      set((state) => ({
        settlements: state.settlements.map((s) => (s.id === id ? { ...s, ...patch } : s)),
      }));

      void api.updateRetirementSettlement(id, patch).then((saved) => {
        if (saved) {
          set((state) => ({
            settlements: state.settlements.map((s) => (s.id === id ? saved : s)),
          }));
        } else {
          failSync();
        }
      });
    },

    deleteSettlement: (id) => {
      set((state) => ({ settlements: state.settlements.filter((s) => s.id !== id) }));
      void api.deleteRetirementSettlement(id).then((ok) => {
        if (!ok) failSync();
      });
    },

    getByEmployee: (employeeId) =>
      get().settlements.find((s) => s.employee_id === employeeId),

    getAll: () =>
      [...get().settlements].sort((a, b) => b.resignation_date.localeCompare(a.resignation_date)),
  };
});
