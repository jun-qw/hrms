'use client';

/**
 * Attendance module store — a DB-backed client cache (same pattern as the
 * employee store): hydrated once per session, mutations apply optimistically
 * and sync through server actions.
 */
import { create } from 'zustand';
import { toast } from 'sonner';
import * as api from '@/lib/actions/attendance-actions';
import type { Attendance, AttendanceStatus, LeaveTimePeriod } from '@/types';

export interface AttendanceCloseout {
  id: string;
  year: number;
  month: number;
  closed_by: string;
  closed_by_name: string;
  closed_at: string;
  note: string | null;
}

interface AttendanceState {
  hydrated: boolean;
  records: Attendance[];
  closeouts: AttendanceCloseout[];
}

interface AttendanceActions {
  hydrate: (data: api.AttendanceModuleData) => void;
  reload: () => Promise<void>;
  clockIn: (employeeId: string, type?: string, scheduledStart?: string, scheduledEnd?: string, graceMinutes?: number) => void;
  clockOut: (employeeId: string) => void;
  addRecord: (record: Attendance) => void;
  updateRecord: (id: string, data: Partial<Attendance>) => void;
  addHalfDayRecord: (employeeId: string, date: string, leaveTimePeriod: LeaveTimePeriod, scheduledStart?: string, scheduledEnd?: string) => void;
  closeMonth: (year: number, month: number, closedBy: string, closedByName: string, note?: string) => void;
  reopenMonth: (year: number, month: number) => void;
}

interface AttendanceGetters {
  getRecordsByDate: (date: string) => Attendance[];
  getRecordsByEmployee: (empId: string) => Attendance[];
  getRecordsByEmployeeAndMonth: (empId: string, year: number, month: number) => Attendance[];
  getTodayRecord: (empId: string) => Attendance | undefined;
  getTodaySummary: () => { total: number; normal: number; late: number; half_day: number; quarter_day: number; byType: Record<string, number> };
  getCloseout: (year: number, month: number) => AttendanceCloseout | undefined;
}

export type AttendanceStore = AttendanceState & AttendanceActions & AttendanceGetters;

export const useAttendanceStore = create<AttendanceStore>()((set, get) => {
  const reload = async () => {
    const data = await api.fetchAttendanceData();
    if (data) set({ ...data, hydrated: true });
  };

  const failSync = () => {
    toast.error('근태 기록 저장에 실패했습니다. 데이터를 다시 불러옵니다.');
    void reload();
  };

  /** Optimistically insert a record, then replace it with the server row. */
  const syncCreate = (record: Attendance) => {
    set((s) => ({ records: [record, ...s.records] }));
    void api.createAttendance(record).then((saved) => {
      if (saved) {
        set((s) => ({ records: s.records.map((r) => (r.id === record.id ? saved : r)) }));
      } else {
        failSync();
      }
    });
  };

  const syncUpdate = (id: string, patch: Partial<Attendance>) => {
    set((s) => ({ records: s.records.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));
    void api.updateAttendance(id, patch).then((saved) => {
      if (saved) {
        set((s) => ({ records: s.records.map((r) => (r.id === id ? saved : r)) }));
      } else {
        failSync();
      }
    });
  };

  return {
    hydrated: false,
    records: [],
    closeouts: [],

    hydrate: (data) => set({ ...data, hydrated: true }),
    reload,

    clockIn: (employeeId, type = 'office', scheduledStart = '07:00', scheduledEnd = '16:00', graceMinutes = 0) => {
      const now = new Date();
      const date = now.toISOString().split('T')[0];
      const existing = get().records.find((r) => r.employee_id === employeeId && r.date === date);
      if (existing) return;

      const hours = now.getHours();
      const minutes = now.getMinutes();
      const [sh, sm] = scheduledStart.split(':').map(Number);
      const clockMinutes = hours * 60 + minutes;
      const deadlineMinutes = sh * 60 + sm + graceMinutes;
      const isLate = clockMinutes > deadlineMinutes;

      const record: Attendance = {
        id: `att-${Date.now()}`,
        employee_id: employeeId,
        date,
        clock_in: now.toISOString(),
        clock_out: null,
        work_hours: null,
        overtime_hours: 0,
        status: isLate ? 'late' : 'normal',
        note: isLate ? '지각' : null,
        attendance_type: type,
        scheduled_start: scheduledStart,
        scheduled_end: scheduledEnd,
        created_at: now.toISOString(),
      };
      syncCreate(record);
    },

    clockOut: (employeeId) => {
      const now = new Date();
      const date = now.toISOString().split('T')[0];
      const record = get().records.find(
        (r) => r.employee_id === employeeId && r.date === date && !r.clock_out,
      );
      if (!record) return;

      const inTime = new Date(record.clock_in!);
      const diffMs = now.getTime() - inTime.getTime();
      const workHours = Math.round((diffMs / 3600000) * 100) / 100;
      const overtime = workHours > 8 ? Math.round((workHours - 8) * 100) / 100 : 0;
      const [eh, em] = (record.scheduled_end ?? '16:00').split(':').map(Number);
      const isEarlyLeave = now.getHours() < eh || (now.getHours() === eh && now.getMinutes() < em);
      const newStatus: AttendanceStatus =
        isEarlyLeave && record.status === 'normal' ? 'early_leave' : record.status;

      syncUpdate(record.id, {
        clock_out: now.toISOString(),
        work_hours: workHours,
        overtime_hours: overtime,
        status: newStatus,
        note: newStatus === 'early_leave' ? '조퇴' : record.note,
      });
    },

    addHalfDayRecord: (employeeId, date, leaveTimePeriod, scheduledStart = '07:00', scheduledEnd = '16:00') => {
      const existing = get().records.find((r) => r.employee_id === employeeId && r.date === date);
      if (existing) return;

      const isHalf = leaveTimePeriod === 'am_half' || leaveTimePeriod === 'pm_half';
      const isAm = leaveTimePeriod === 'am_half' || leaveTimePeriod === 'am_quarter';
      const workHours = isHalf ? 4 : 6; // quarter = 2h off, 6h work
      const status: AttendanceStatus = isHalf ? 'half_day' : 'quarter_day';

      let clockIn: string;
      let clockOut: string;
      const [startH] = scheduledStart.split(':').map(Number);
      const [endH] = scheduledEnd.split(':').map(Number);

      if (isAm) {
        const lateStart = isHalf ? startH + 4 : startH + 2;
        clockIn = `${date}T${String(lateStart).padStart(2, '0')}:00:00+09:00`;
        clockOut = `${date}T${String(endH).padStart(2, '0')}:00:00+09:00`;
      } else {
        const earlyEnd = isHalf ? endH - 4 : endH - 2;
        clockIn = `${date}T${String(startH).padStart(2, '0')}:00:00+09:00`;
        clockOut = `${date}T${String(earlyEnd).padStart(2, '0')}:00:00+09:00`;
      }

      syncCreate({
        id: `att-${Date.now()}`,
        employee_id: employeeId,
        date,
        clock_in: clockIn,
        clock_out: clockOut,
        work_hours: workHours,
        overtime_hours: 0,
        status,
        note: isHalf ? (isAm ? '오전반차' : '오후반차') : (isAm ? '오전반반차' : '오후반반차'),
        attendance_type: 'office',
        leave_time_period: leaveTimePeriod,
        scheduled_start: scheduledStart,
        scheduled_end: scheduledEnd,
        created_at: new Date().toISOString(),
      });
    },

    addRecord: (record) => syncCreate(record),

    updateRecord: (id, data) => syncUpdate(id, data),

    closeMonth: (year, month, closedBy, closedByName, note) => {
      const existing = get().closeouts.find((c) => c.year === year && c.month === month);
      if (existing) return;
      const closeout: AttendanceCloseout = {
        id: `close-${year}-${month}`,
        year,
        month,
        closed_by: closedBy,
        closed_by_name: closedByName,
        closed_at: new Date().toISOString(),
        note: note ?? null,
      };
      set((s) => ({ closeouts: [...s.closeouts, closeout] }));
      void api.closeAttendanceMonth(closeout).then((saved) => {
        if (saved) {
          set((s) => ({ closeouts: s.closeouts.map((c) => (c.id === closeout.id ? saved : c)) }));
        } else {
          failSync();
        }
      });
    },

    reopenMonth: (year, month) => {
      set((s) => ({
        closeouts: s.closeouts.filter((c) => !(c.year === year && c.month === month)),
      }));
      void api.reopenAttendanceMonth(year, month).then((ok) => {
        if (!ok) failSync();
      });
    },

    // --- Getters (unchanged) ---
    getRecordsByDate: (date) => get().records.filter((r) => r.date === date),

    getRecordsByEmployee: (empId) =>
      get().records
        .filter((r) => r.employee_id === empId)
        .sort((a, b) => b.date.localeCompare(a.date)),

    getRecordsByEmployeeAndMonth: (empId, year, month) =>
      get().records
        .filter((r) => {
          if (r.employee_id !== empId) return false;
          const d = new Date(r.date);
          return d.getFullYear() === year && d.getMonth() + 1 === month;
        })
        .sort((a, b) => b.date.localeCompare(a.date)),

    getTodayRecord: (empId) => {
      const today = new Date().toISOString().split('T')[0];
      return get().records.find((r) => r.employee_id === empId && r.date === today);
    },

    getTodaySummary: () => {
      const today = new Date().toISOString().split('T')[0];
      const todayRecords = get().records.filter((r) => r.date === today);
      const byType: Record<string, number> = {};
      let normal = 0;
      let late = 0;
      let half_day = 0;
      let quarter_day = 0;
      for (const r of todayRecords) {
        if (r.status === 'late') late++;
        else if (r.status === 'half_day') half_day++;
        else if (r.status === 'quarter_day') quarter_day++;
        else normal++;
        const t = r.attendance_type ?? 'office';
        byType[t] = (byType[t] ?? 0) + 1;
      }
      return { total: todayRecords.length, normal, late, half_day, quarter_day, byType };
    },

    getCloseout: (year, month) =>
      get().closeouts.find((c) => c.year === year && c.month === month),
  };
});
