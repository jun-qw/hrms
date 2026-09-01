'use client';

import { use } from 'react';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { EmployeeForm } from '@/components/employee/employee-form';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useEmployeeStore } from '@/lib/stores/employee-store';

export default function EditEmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const employees = useEmployeeStore((s) => s.employees);
  const departments = useEmployeeStore((s) => s.departments);
  const positionRanks = useEmployeeStore((s) => s.positionRanks);
  const positionTitles = useEmployeeStore((s) => s.positionTitles);
  const updateEmployee = useEmployeeStore((s) => s.updateEmployee);

  const rawEmp = employees.find((e) => e.id === id);
  const employee = rawEmp ? {
    ...rawEmp,
    department: departments.find((d) => d.id === rawEmp.department_id),
    position_rank: positionRanks.find((r) => r.id === rawEmp.position_rank_id),
    position_title: positionTitles.find((t) => t.id === rawEmp.position_title_id),
  } : undefined;

  if (!employee) {
    return (
      <div>
        <Breadcrumb />
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">사원 정보를 찾을 수 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Breadcrumb />
      <h1 className="text-2xl font-bold mb-6">사원 수정</h1>
      <EmployeeForm
        employee={employee}
        departments={departments}
        positionRanks={positionRanks}
        positionTitles={positionTitles}
        onSubmit={(data) => {
          updateEmployee(id, data);
          toast.success('사원 정보가 수정되었습니다.');
          router.push(`/employees/${id}`);
        }}
      />
    </div>
  );
}
