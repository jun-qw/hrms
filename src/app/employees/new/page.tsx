'use client';

import { Breadcrumb } from '@/components/layout/breadcrumb';
import { EmployeeForm } from '@/components/employee/employee-form';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useEmployeeStore } from '@/lib/stores/employee-store';

export default function NewEmployeePage() {
  const router = useRouter();
  const departments = useEmployeeStore((s) => s.departments);
  const positionRanks = useEmployeeStore((s) => s.positionRanks);
  const positionTitles = useEmployeeStore((s) => s.positionTitles);
  const addEmployee = useEmployeeStore((s) => s.addEmployee);
  const employees = useEmployeeStore((s) => s.employees);

  return (
    <div>
      <Breadcrumb />
      <h1 className="text-2xl font-bold mb-6">사원 등록</h1>
      <EmployeeForm
        departments={departments}
        positionRanks={positionRanks}
        positionTitles={positionTitles}
        onSubmit={(data) => {
          const maxNum = employees.reduce((max, e) => {
            const n = parseInt(e.employee_number.replace('EMP-', ''), 10);
            return isNaN(n) ? max : Math.max(max, n);
          }, 0);
          const newNum = `EMP-${String(maxNum + 1).padStart(3, '0')}`;
          const newId = `e${String(maxNum + 1).padStart(3, '0')}`;
          const now = new Date().toISOString();
          addEmployee({
            ...data,
            id: newId,
            employee_number: newNum,
            created_at: now,
            updated_at: now,
          } as any);
          toast.success('사원이 등록되었습니다.');
          router.push('/employees');
        }}
      />
    </div>
  );
}
