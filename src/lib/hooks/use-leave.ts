'use client';

import { useMemo } from 'react';
import { useLeaveStore } from '@/lib/stores/leave-store';

export { useLeaveStore } from '@/lib/stores/leave-store';

export function useEmployeeLeave(employeeId: string) {
  const leaveBalances = useLeaveStore((s) => s.leaveBalances);
  const leaveRequests = useLeaveStore((s) => s.leaveRequests);
  const leaveTypes = useLeaveStore((s) => s.leaveTypes);

  return useMemo(() => {
    const balances = leaveBalances.filter((b) => b.employee_id === employeeId);
    const requests = leaveRequests
      .filter((r) => r.employee_id === employeeId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));

    const balancesWithType = balances.map((b) => ({
      ...b,
      leave_type: leaveTypes.find((lt) => lt.id === b.leave_type_id),
    }));

    return { balances: balancesWithType, requests };
  }, [employeeId, leaveBalances, leaveRequests, leaveTypes]);
}

export function usePendingRequests() {
  const leaveRequests = useLeaveStore((s) => s.leaveRequests);
  const leaveTypes = useLeaveStore((s) => s.leaveTypes);

  return useMemo(() => {
    return leaveRequests
      .filter((r) => r.status === 'pending')
      .map((r) => ({
        ...r,
        leave_type: leaveTypes.find((lt) => lt.id === r.leave_type_id),
      }))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [leaveRequests, leaveTypes]);
}
