'use client';

import { useMemo } from 'react';
import { useEmployeeStore } from '@/lib/stores/employee-store';
import { useLeaveStore } from '@/lib/stores/leave-store';

/**
 * Flat employee directory (id, name, department name, hire date, rank name)
 * derived from the employee store.
 *
 * Replaces the former `demoEmployees` constant: leave/payroll screens need a
 * lightweight roster with resolved department and rank labels, which used to
 * be hardcoded and now comes from the database.
 */
export interface DirectoryEmployee {
  id: string;
  /** Human-readable staff number (EMP-001), not the database id. */
  employee_number: string;
  name: string;
  department: string;
  hire_date: string;
  position_rank: string;
  base_salary: number;
}

export function useEmployeeDirectory(options?: { activeOnly?: boolean }): DirectoryEmployee[] {
  const employees = useEmployeeStore((s) => s.employees);
  const departments = useEmployeeStore((s) => s.departments);
  const ranks = useEmployeeStore((s) => s.positionRanks);
  const activeOnly = options?.activeOnly ?? true;

  return useMemo(() => {
    const deptById = new Map(departments.map((d) => [d.id, d.name]));
    const rankById = new Map(ranks.map((r) => [r.id, r.name]));
    return employees
      .filter((e) => (activeOnly ? e.status === 'active' : true))
      .map((e) => ({
        id: e.id,
        employee_number: e.employee_number,
        name: e.name,
        department: e.department_id ? (deptById.get(e.department_id) ?? '') : '',
        hire_date: e.hire_date,
        position_rank: e.position_rank_id ? (rankById.get(e.position_rank_id) ?? '') : '',
        base_salary: e.base_salary ?? 0,
      }));
  }, [employees, departments, ranks, activeOnly]);
}

/**
 * Resolves the annual-leave type id from the DB rather than assuming a fixed
 * seed id, since ids are generated per installation.
 */
export function useAnnualLeaveTypeId(): string | undefined {
  const leaveTypes = useLeaveStore((s) => s.leaveTypes);
  return useMemo(() => leaveTypes.find((lt) => lt.code === 'annual')?.id, [leaveTypes]);
}
