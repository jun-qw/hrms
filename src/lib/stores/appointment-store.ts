'use client';

/**
 * Appointment (인사발령) store — a DB-backed client cache: hydrated once per
 * session, mutations apply optimistically and sync through server actions.
 */
import { create } from 'zustand';
import { toast } from 'sonner';
import * as api from '@/lib/actions/approval-actions';
import type { Appointment, Employee } from '@/types';
import { useEmployeeStore } from './employee-store';

// ---------------------------------------------------------------------------
// Store types
// ---------------------------------------------------------------------------

interface AppointmentState {
  hydrated: boolean;
  appointments: Appointment[];
}

interface AppointmentActions {
  hydrate: (data: api.ApprovalModuleData) => void;
  reload: () => Promise<void>;
  addAppointment: (appointment: Appointment) => void;
  deleteAppointment: (id: string) => void;
}

interface AppointmentGetters {
  getAppointmentsByEmployee: (empId: string) => Appointment[];
  getAllAppointments: () => Appointment[];
}

export type AppointmentStore = AppointmentState & AppointmentActions & AppointmentGetters;

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useAppointmentStore = create<AppointmentStore>()((set, get) => {
  const reload = async () => {
    const data = await api.fetchApprovalData();
    if (data) set({ appointments: data.appointments, hydrated: true });
  };

  const failSync = () => {
    toast.error('인사발령 저장에 실패했습니다. 데이터를 다시 불러옵니다.');
    void reload();
  };

  return {
    hydrated: false,
    appointments: [],

    hydrate: (data) => set({ appointments: data.appointments, hydrated: true }),
    reload,

    addAppointment: (appointment) => {
      set((s) => ({ appointments: [...s.appointments, appointment] }));

      void api.createAppointment(appointment).then((saved) => {
        if (saved) {
          set((s) => ({
            appointments: s.appointments.map((a) => (a.id === appointment.id ? saved : a)),
          }));
        } else {
          failSync();
        }
      });

      // Auto-update employee record (employee-store owns its own DB sync)
      const empStore = useEmployeeStore.getState();
      const update: Partial<Employee> = {};
      if (appointment.new_department_id) update.department_id = appointment.new_department_id;
      if (appointment.new_position_rank_id) update.position_rank_id = appointment.new_position_rank_id;
      if (appointment.new_position_title_id) update.position_title_id = appointment.new_position_title_id;
      if (appointment.type === 'resignation') {
        update.status = 'resigned';
        update.resignation_date = appointment.effective_date;
      }
      if (Object.keys(update).length > 0) {
        empStore.updateEmployee(appointment.employee_id, update);
      }
    },

    deleteAppointment: (id) => {
      set((s) => ({ appointments: s.appointments.filter((a) => a.id !== id) }));
      void api.deleteAppointment(id).then((ok) => {
        if (!ok) failSync();
      });
    },

    // --- Getters (unchanged) ---
    getAppointmentsByEmployee: (empId) =>
      get()
        .appointments.filter((a) => a.employee_id === empId)
        .sort((a, b) => b.effective_date.localeCompare(a.effective_date)),

    getAllAppointments: () =>
      [...get().appointments].sort((a, b) => b.effective_date.localeCompare(a.effective_date)),
  };
});
