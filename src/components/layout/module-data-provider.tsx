'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useEmployeeStore } from '@/lib/stores/employee-store';
import { useAttendanceStore } from '@/lib/stores/attendance-store';
import { useSettingsStore } from '@/lib/stores/settings-store';
import { useLeaveStore } from '@/lib/stores/leave-store';
import { useLeavePlanStore } from '@/lib/stores/leave-plan-store';
import { useApprovalStore } from '@/lib/stores/approval-store';
import { useAppointmentStore } from '@/lib/stores/appointment-store';
import { useWorkflowStore } from '@/lib/stores/workflow-store';
import { usePayrollStore } from '@/lib/stores/payroll-store';
import { useRetirementStore } from '@/lib/stores/retirement-store';
import { useCodeStore } from '@/lib/stores/code-store';
import { useIssueStore } from '@/lib/stores/issue-store';
import { useAuditLogStore } from '@/lib/stores/audit-log-store';
import { useChangeHistoryStore } from '@/lib/stores/change-history-store';
import { useNotificationStore } from '@/lib/stores/notification-store';
import { useFlexScheduleStore } from '@/lib/stores/flex-schedule-store';
import { useAttendanceModificationStore } from '@/lib/stores/attendance-modification-store';
import { fetchEmployeeData } from '@/lib/actions/employee-actions';
import { fetchAttendanceData } from '@/lib/actions/attendance-actions';
import { fetchSettingsData } from '@/lib/actions/settings-actions';
import { fetchLeaveData } from '@/lib/actions/leave-actions';
import { fetchApprovalData } from '@/lib/actions/approval-actions';
import { fetchPayrollData } from '@/lib/actions/payroll-actions';
import { fetchSystemData } from '@/lib/actions/system-actions';

/**
 * Loads every DB-backed module store once a session exists.
 *
 * Each module is fetched independently so a slow or failing module never
 * blocks the others; a store that is already hydrated is skipped. Renders
 * nothing.
 */
export function ModuleDataProvider() {
  const session = useAuthStore((s) => s.session);

  const employeeHydrated = useEmployeeStore((s) => s.hydrated);
  const hydrateEmployees = useEmployeeStore((s) => s.hydrate);

  const attendanceHydrated = useAttendanceStore((s) => s.hydrated);
  const hydrateAttendance = useAttendanceStore((s) => s.hydrate);

  const settingsHydrated = useSettingsStore((s) => s.hydrated);
  const hydrateSettings = useSettingsStore((s) => s.hydrate);

  const leaveHydrated = useLeaveStore((s) => s.hydrated);
  const hydrateLeave = useLeaveStore((s) => s.hydrate);
  const hydrateLeavePlans = useLeavePlanStore((s) => s.hydrate);

  const approvalHydrated = useApprovalStore((s) => s.hydrated);
  const hydrateApprovals = useApprovalStore((s) => s.hydrate);
  const hydrateAppointments = useAppointmentStore((s) => s.hydrate);
  const hydrateWorkflows = useWorkflowStore((s) => s.hydrate);

  const payrollHydrated = usePayrollStore((s) => s.hydrated);
  const hydratePayroll = usePayrollStore((s) => s.hydrate);
  const hydrateRetirement = useRetirementStore((s) => s.hydrate);

  const codeHydrated = useCodeStore((s) => s.hydrated);
  const hydrateCodes = useCodeStore((s) => s.hydrate);
  const hydrateIssues = useIssueStore((s) => s.hydrate);
  const hydrateAuditLogs = useAuditLogStore((s) => s.hydrate);
  const hydrateChangeHistory = useChangeHistoryStore((s) => s.hydrate);
  const hydrateNotifications = useNotificationStore((s) => s.hydrate);
  const hydrateFlexSchedule = useFlexScheduleStore((s) => s.hydrate);
  const hydrateAttendanceMods = useAttendanceModificationStore((s) => s.hydrate);

  useEffect(() => {
    if (!session || employeeHydrated) return;
    let cancelled = false;
    void fetchEmployeeData().then((data) => {
      if (data && !cancelled) hydrateEmployees(data);
    });
    return () => {
      cancelled = true;
    };
  }, [session, employeeHydrated, hydrateEmployees]);

  useEffect(() => {
    if (!session || attendanceHydrated) return;
    let cancelled = false;
    void fetchAttendanceData().then((data) => {
      if (data && !cancelled) hydrateAttendance(data);
    });
    return () => {
      cancelled = true;
    };
  }, [session, attendanceHydrated, hydrateAttendance]);

  useEffect(() => {
    if (!session || settingsHydrated) return;
    let cancelled = false;
    void fetchSettingsData().then((data) => {
      if (data && !cancelled) hydrateSettings(data);
    });
    return () => {
      cancelled = true;
    };
  }, [session, settingsHydrated, hydrateSettings]);

  // One fetch feeds both the leave store and the usage-plan store.
  useEffect(() => {
    if (!session || leaveHydrated) return;
    let cancelled = false;
    void fetchLeaveData().then((data) => {
      if (!data || cancelled) return;
      hydrateLeave(data);
      hydrateLeavePlans(data);
    });
    return () => {
      cancelled = true;
    };
  }, [session, leaveHydrated, hydrateLeave, hydrateLeavePlans]);

  // One fetch feeds approvals, appointments and workflows.
  useEffect(() => {
    if (!session || approvalHydrated) return;
    let cancelled = false;
    void fetchApprovalData().then((data) => {
      if (!data || cancelled) return;
      hydrateApprovals(data);
      hydrateAppointments(data);
      hydrateWorkflows(data);
    });
    return () => {
      cancelled = true;
    };
  }, [session, approvalHydrated, hydrateApprovals, hydrateAppointments, hydrateWorkflows]);

  // One fetch feeds both payroll and retirement settlements.
  useEffect(() => {
    if (!session || payrollHydrated) return;
    let cancelled = false;
    void fetchPayrollData().then((data) => {
      if (!data || cancelled) return;
      hydratePayroll(data);
      hydrateRetirement(data);
    });
    return () => {
      cancelled = true;
    };
  }, [session, payrollHydrated, hydratePayroll, hydrateRetirement]);

  // One fetch feeds the seven system/support stores.
  useEffect(() => {
    if (!session || codeHydrated) return;
    let cancelled = false;
    void fetchSystemData().then((data) => {
      if (!data || cancelled) return;
      hydrateCodes(data);
      hydrateIssues(data);
      hydrateAuditLogs(data);
      hydrateChangeHistory(data);
      hydrateNotifications(data);
      hydrateFlexSchedule(data);
      hydrateAttendanceMods(data);
    });
    return () => {
      cancelled = true;
    };
  }, [
    session,
    codeHydrated,
    hydrateCodes,
    hydrateIssues,
    hydrateAuditLogs,
    hydrateChangeHistory,
    hydrateNotifications,
    hydrateFlexSchedule,
    hydrateAttendanceMods,
  ]);

  return null;
}
