'use client';

/**
 * Annual-leave usage plans & promotion alerts (연차 사용계획서 / 촉진) —
 * a DB-backed client cache: hydrated once per session, mutations apply
 * optimistically and sync through server actions.
 */
import { create } from 'zustand';
import { toast } from 'sonner';
import * as api from '@/lib/actions/leave-actions';

// 연차 사용계획서 (연차촉진 대응)
export interface LeaveUsagePlan {
  id: string;
  employee_id: string;
  year: number;
  total_planned_days: number;
  // 월별 계획 (1~12월)
  monthly_plan: Record<number, number>; // { 1: 0, 2: 1, ... 12: 2 }
  reason: string | null;
  status: 'draft' | 'submitted' | 'reviewed' | 'final';
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  reviewed_by_name: string | null;
  review_comment: string | null;
  created_at: string;
  updated_at: string;
}

// 연차촉진 알림
export interface LeavePromotionAlert {
  id: string;
  employee_id: string;
  year: number;
  alert_round: 1 | 2;          // 1차 / 2차
  remaining_days: number;
  sent_at: string;
  acknowledged: boolean;        // 직원이 확인했는지
  acknowledged_at: string | null;
  // 직원 응답 (사용계획 제출 or 회사에 위임)
  response: 'plan_submitted' | 'company_decision' | null;
  responded_at: string | null;
}

interface State {
  hydrated: boolean;
  plans: LeaveUsagePlan[];
  alerts: LeavePromotionAlert[];
}

interface Actions {
  // Hydration
  hydrate: (data: api.LeaveModuleData) => void;
  reload: () => Promise<void>;

  // Plans
  upsertPlan: (plan: LeaveUsagePlan) => void;
  reviewPlan: (id: string, reviewedBy: string, reviewedByName: string, comment?: string) => void;
  getPlanByEmployee: (employeeId: string, year: number) => LeaveUsagePlan | undefined;
  getAllPlans: (year?: number) => LeaveUsagePlan[];

  // Alerts
  addAlert: (alert: LeavePromotionAlert) => void;
  acknowledgeAlert: (id: string, response?: 'plan_submitted' | 'company_decision') => void;
  getAlertsByEmployee: (employeeId: string) => LeavePromotionAlert[];
  getPendingAlerts: () => LeavePromotionAlert[];

  // Generate alerts (관리자가 일괄 생성)
  generateAlerts: (
    round: 1 | 2,
    year: number,
    employees: { id: string; remaining_days: number }[],
    threshold: number,
  ) => number; // 생성된 건수
}

export type LeavePlanStore = State & Actions;

export const useLeavePlanStore = create<LeavePlanStore>()((set, get) => {
  const reload = async () => {
    const data = await api.fetchLeaveData();
    if (!data) return;
    set({ plans: data.plans, alerts: data.alerts, hydrated: true });
  };

  const failSync = () => {
    toast.error('연차 계획 정보 저장에 실패했습니다. 데이터를 다시 불러옵니다.');
    void reload();
  };

  const replacePlan = (localId: string, saved: LeaveUsagePlan) =>
    set((s) => ({ plans: s.plans.map((p) => (p.id === localId ? saved : p)) }));

  const syncPlanUpdate = (id: string, patch: Partial<LeaveUsagePlan>) => {
    void api.updateLeaveUsagePlan(id, patch).then((saved) => {
      if (saved) replacePlan(id, saved);
      else failSync();
    });
  };

  return {
    hydrated: false,
    plans: [],
    alerts: [],

    hydrate: (data) => set({ plans: data.plans, alerts: data.alerts, hydrated: true }),
    reload,

    upsertPlan: (plan) => {
      const existing = get().plans.find((p) => p.id === plan.id);
      const now = new Date().toISOString();

      if (existing) {
        const next = { ...plan, updated_at: now };
        set((s) => ({ plans: s.plans.map((p) => (p.id === plan.id ? next : p)) }));
        syncPlanUpdate(plan.id, {
          year: next.year,
          total_planned_days: next.total_planned_days,
          monthly_plan: next.monthly_plan,
          reason: next.reason,
          status: next.status,
          submitted_at: next.submitted_at,
        });
        return;
      }

      set((s) => ({ plans: [...s.plans, plan] }));
      void api.createLeaveUsagePlan(plan).then((saved) => {
        if (saved) replacePlan(plan.id, saved);
        else failSync();
      });
    },

    reviewPlan: (id, reviewedBy, reviewedByName, comment) => {
      const now = new Date().toISOString();
      const patch = {
        status: 'reviewed' as const,
        reviewed_at: now,
        reviewed_by: reviewedBy,
        reviewed_by_name: reviewedByName,
        review_comment: comment ?? null,
      };
      set((s) => ({
        plans: s.plans.map((p) => (p.id === id ? { ...p, ...patch, updated_at: now } : p)),
      }));
      syncPlanUpdate(id, patch);
    },

    getPlanByEmployee: (employeeId, year) =>
      get().plans.find((p) => p.employee_id === employeeId && p.year === year),

    getAllPlans: (year) =>
      get().plans
        .filter((p) => year ? p.year === year : true)
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),

    addAlert: (alert) => {
      set((s) => ({ alerts: [alert, ...s.alerts] }));
      void api.createLeavePromotionAlert(alert).then((saved) => {
        if (saved) {
          set((s) => ({ alerts: s.alerts.map((a) => (a.id === alert.id ? saved : a)) }));
        } else {
          failSync();
        }
      });
    },

    acknowledgeAlert: (id, response) => {
      const now = new Date().toISOString();
      const current = get().alerts.find((a) => a.id === id);
      const patch = {
        acknowledged: true,
        acknowledged_at: now,
        response: response ?? current?.response ?? null,
        responded_at: response ? now : (current?.responded_at ?? null),
      };
      set((s) => ({ alerts: s.alerts.map((a) => (a.id === id ? { ...a, ...patch } : a)) }));
      void api.updateLeavePromotionAlert(id, patch).then((saved) => {
        if (saved) {
          set((s) => ({ alerts: s.alerts.map((a) => (a.id === id ? saved : a)) }));
        } else {
          failSync();
        }
      });
    },

    getAlertsByEmployee: (employeeId) =>
      get().alerts
        .filter((a) => a.employee_id === employeeId)
        .sort((a, b) => b.sent_at.localeCompare(a.sent_at)),

    getPendingAlerts: () =>
      get().alerts.filter((a) => !a.acknowledged).sort((a, b) => b.sent_at.localeCompare(a.sent_at)),

    generateAlerts: (round, year, employees, threshold) => {
      const now = new Date().toISOString();
      const newAlerts: LeavePromotionAlert[] = [];
      for (const emp of employees) {
        if (emp.remaining_days < threshold) continue;
        // 이미 같은 회차가 있으면 스킵
        const existing = get().alerts.find(
          (a) => a.employee_id === emp.id && a.year === year && a.alert_round === round,
        );
        if (existing) continue;
        newAlerts.push({
          id: `lpa-${Date.now()}-${emp.id}-${round}`,
          employee_id: emp.id,
          year,
          alert_round: round,
          remaining_days: emp.remaining_days,
          sent_at: now,
          acknowledged: false,
          acknowledged_at: null,
          response: null,
          responded_at: null,
        });
      }
      if (newAlerts.length > 0) {
        set((s) => ({ alerts: [...newAlerts, ...s.alerts] }));
        const localIds = newAlerts.map((a) => a.id);
        void api.createLeavePromotionAlerts(newAlerts).then((saved) => {
          if (saved) {
            set((s) => ({
              alerts: [
                ...saved,
                ...s.alerts.filter((a) => !localIds.includes(a.id)),
              ],
            }));
          } else {
            failSync();
          }
        });
      }
      return newAlerts.length;
    },
  };
});
