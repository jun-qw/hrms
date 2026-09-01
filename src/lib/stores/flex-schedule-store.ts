'use client';

/**
 * Flexible work store (근무유형 배정 / 유연근무 신청) — a DB-backed client
 * cache. Hydrated once per session from fetchSystemData(); mutations apply
 * optimistically and sync through server actions.
 */
import { create } from 'zustand';
import { toast } from 'sonner';
import * as api from '@/lib/actions/system-actions';

// 직원별 근무유형 배정
export interface EmployeeScheduleAssignment {
  id: string;
  employee_id: string;
  work_schedule_id: string;
  start_date: string;
  end_date: string | null;
  approved_by: string | null;
  approved_by_name: string | null;
  note: string | null;
  created_at: string;
}

// 유연근무 신청
export interface FlexWorkRequest {
  id: string;
  employee_id: string;
  request_type: 'schedule_change' | 'temporary';
  work_schedule_id: string;
  start_date: string;
  end_date: string | null;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  review_comment: string | null;
  created_at: string;
}

interface FlexScheduleState {
  hydrated: boolean;
  assignments: EmployeeScheduleAssignment[];
  requests: FlexWorkRequest[];
}

interface FlexScheduleActions {
  hydrate: (data: api.SystemModuleData) => void;
  reload: () => Promise<void>;

  // Assignments
  assignSchedule: (assignment: EmployeeScheduleAssignment) => void;
  updateAssignment: (id: string, data: Partial<EmployeeScheduleAssignment>) => void;
  endAssignment: (id: string, endDate: string) => void;
  getActiveAssignment: (employeeId: string) => EmployeeScheduleAssignment | undefined;
  getAssignmentHistory: (employeeId: string) => EmployeeScheduleAssignment[];

  // Requests
  addRequest: (req: FlexWorkRequest) => void;
  reviewRequest: (id: string, status: 'approved' | 'rejected', reviewedBy: string, reviewedByName: string, comment?: string) => void;
  getPendingRequests: () => FlexWorkRequest[];
}

export type FlexScheduleStore = FlexScheduleState & FlexScheduleActions;

export const useFlexScheduleStore = create<FlexScheduleStore>()((set, get) => {
  const reload = async () => {
    const data = await api.fetchSystemData();
    if (data) {
      set({
        assignments: data.flexAssignments,
        requests: data.flexRequests,
        hydrated: true,
      });
    }
  };

  const failSync = () => {
    toast.error('근무유형 정보 저장에 실패했습니다. 데이터를 다시 불러옵니다.');
    void reload();
  };

  return {
    hydrated: false,
    assignments: [],
    requests: [],

    hydrate: (data) =>
      set({ assignments: data.flexAssignments, requests: data.flexRequests, hydrated: true }),
    reload,

    assignSchedule: (assignment) => {
      set((s) => {
        // 기존 active 배정 종료
        const updated = s.assignments.map((a) =>
          a.employee_id === assignment.employee_id && !a.end_date
            ? { ...a, end_date: assignment.start_date }
            : a,
        );
        return { assignments: [...updated, assignment] };
      });
      void api.createFlexAssignment(assignment).then((saved) => {
        if (saved) {
          set((s) => ({
            assignments: s.assignments.map((a) => (a.id === assignment.id ? saved : a)),
          }));
        } else {
          failSync();
        }
      });
    },

    updateAssignment: (id, data) => {
      set((s) => ({
        assignments: s.assignments.map((a) => (a.id === id ? { ...a, ...data } : a)),
      }));
      void api.updateFlexAssignment(id, data).then((saved) => {
        if (saved) {
          set((s) => ({ assignments: s.assignments.map((a) => (a.id === id ? saved : a)) }));
        } else {
          failSync();
        }
      });
    },

    endAssignment: (id, endDate) => {
      set((s) => ({
        assignments: s.assignments.map((a) => (a.id === id ? { ...a, end_date: endDate } : a)),
      }));
      void api.updateFlexAssignment(id, { end_date: endDate }).then((saved) => {
        if (saved) {
          set((s) => ({ assignments: s.assignments.map((a) => (a.id === id ? saved : a)) }));
        } else {
          failSync();
        }
      });
    },

    getActiveAssignment: (employeeId) => {
      const today = new Date().toISOString().split('T')[0];
      return get().assignments.find(
        (a) =>
          a.employee_id === employeeId &&
          a.start_date <= today &&
          (!a.end_date || a.end_date >= today),
      );
    },

    getAssignmentHistory: (employeeId) =>
      get()
        .assignments.filter((a) => a.employee_id === employeeId)
        .sort((a, b) => b.start_date.localeCompare(a.start_date)),

    addRequest: (req) => {
      set((s) => ({ requests: [req, ...s.requests] }));
      void api.createFlexRequest(req).then((saved) => {
        if (saved) {
          set((s) => ({ requests: s.requests.map((r) => (r.id === req.id ? saved : r)) }));
        } else {
          failSync();
        }
      });
    },

    reviewRequest: (id, status, reviewedBy, reviewedByName, comment) => {
      set((s) => ({
        requests: s.requests.map((r) =>
          r.id === id
            ? {
                ...r,
                status,
                reviewed_by: reviewedBy,
                reviewed_by_name: reviewedByName,
                reviewed_at: new Date().toISOString(),
                review_comment: comment ?? null,
              }
            : r,
        ),
      }));
      void api
        .reviewFlexRequest(id, status, reviewedBy, reviewedByName, comment)
        .then((saved) => {
          if (saved) {
            set((s) => ({ requests: s.requests.map((r) => (r.id === id ? saved : r)) }));
          } else {
            failSync();
          }
        });
    },

    getPendingRequests: () => get().requests.filter((r) => r.status === 'pending'),
  };
});
