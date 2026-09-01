'use client';

/**
 * Attendance modification (사후결재) store — a DB-backed client cache.
 * Hydrated once per session from fetchSystemData(); mutations apply
 * optimistically and sync through server actions.
 *
 * `before` / `after` are JSONB snapshots stored verbatim (no field mapping).
 */
import { create } from 'zustand';
import { toast } from 'sonner';
import * as api from '@/lib/actions/system-actions';

// 근태 수정요청 (사후결재)
export interface AttendanceModificationRequest {
  id: string;
  attendance_id: string;
  employee_id: string;
  // 변경 전 값
  before: {
    clock_in: string | null;
    clock_out: string | null;
    work_hours: number | null;
    status: string;
    note: string | null;
    attendance_type?: string;
  };
  // 변경 후 값
  after: {
    clock_in: string | null;
    clock_out: string | null;
    work_hours: number | null;
    status: string;
    note: string | null;
    attendance_type?: string;
  };
  reason: string;            // 수정 사유 (필수)
  status: 'pending' | 'approved' | 'rejected';
  approval_id: string | null;
  reviewed_by: string | null;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  review_comment: string | null;
  attachment_name: string | null;
  created_at: string;
}

interface State {
  hydrated: boolean;
  modifications: AttendanceModificationRequest[];
}

interface Actions {
  hydrate: (data: api.SystemModuleData) => void;
  reload: () => Promise<void>;
  addModification: (m: AttendanceModificationRequest) => void;
  reviewModification: (
    id: string,
    status: 'approved' | 'rejected',
    reviewedBy: string,
    reviewedByName: string,
    comment?: string,
  ) => void;
  getByAttendance: (attendanceId: string) => AttendanceModificationRequest[];
  getByEmployee: (employeeId: string) => AttendanceModificationRequest[];
  getPending: () => AttendanceModificationRequest[];
  getAll: () => AttendanceModificationRequest[];
}

export type AttendanceModificationStore = State & Actions;

export const useAttendanceModificationStore = create<AttendanceModificationStore>()(
  (set, get) => {
    const reload = async () => {
      const data = await api.fetchSystemData();
      if (data) set({ modifications: data.attendanceModifications, hydrated: true });
    };

    const failSync = () => {
      toast.error('근태 수정요청 저장에 실패했습니다. 데이터를 다시 불러옵니다.');
      void reload();
    };

    return {
      hydrated: false,
      modifications: [],

      hydrate: (data) =>
        set({ modifications: data.attendanceModifications, hydrated: true }),
      reload,

      addModification: (m) => {
        set((s) => ({ modifications: [m, ...s.modifications] }));
        void api.createAttendanceModification(m).then((saved) => {
          if (saved) {
            set((s) => ({
              modifications: s.modifications.map((x) => (x.id === m.id ? saved : x)),
            }));
          } else {
            failSync();
          }
        });
      },

      reviewModification: (id, status, reviewedBy, reviewedByName, comment) => {
        set((s) => ({
          modifications: s.modifications.map((m) =>
            m.id === id
              ? {
                  ...m,
                  status,
                  reviewed_by: reviewedBy,
                  reviewed_by_name: reviewedByName,
                  reviewed_at: new Date().toISOString(),
                  review_comment: comment ?? null,
                }
              : m,
          ),
        }));
        void api
          .reviewAttendanceModification(id, status, reviewedBy, reviewedByName, comment)
          .then((saved) => {
            if (saved) {
              set((s) => ({
                modifications: s.modifications.map((m) => (m.id === id ? saved : m)),
              }));
            } else {
              failSync();
            }
          });
      },

      getByAttendance: (attendanceId) =>
        get()
          .modifications.filter((m) => m.attendance_id === attendanceId)
          .sort((a, b) => b.created_at.localeCompare(a.created_at)),

      getByEmployee: (employeeId) =>
        get()
          .modifications.filter((m) => m.employee_id === employeeId)
          .sort((a, b) => b.created_at.localeCompare(a.created_at)),

      getPending: () =>
        get()
          .modifications.filter((m) => m.status === 'pending')
          .sort((a, b) => b.created_at.localeCompare(a.created_at)),

      getAll: () =>
        [...get().modifications].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    };
  },
);
