'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { PageHeader } from '@/components/layout/page-header';
import { EmployeeRegister } from '@/components/employee/employee-register';
import { StatsCard } from '@/components/dashboard/stats-card';
import { Button } from '@/components/ui/button';
import {
  Plus,
  Users,
  UserCheck,
  UserX,
  UserMinus,
  Building2,
  FileSpreadsheet,
  ScrollText,
  ListChecks,
} from 'lucide-react';
import { useEmployeeStore } from '@/lib/stores/employee-store';

export default function EmployeesPage() {
  const employees = useEmployeeStore((s) => s.employees);

  const counts = useMemo(
    () => ({
      total: employees.length,
      active: employees.filter((e) => e.status === 'active').length,
      onLeave: employees.filter((e) => e.status === 'on_leave').length,
      left: employees.filter((e) => e.status === 'resigned' || e.status === 'retired').length,
    }),
    [employees],
  );

  return (
    <div>
      <Breadcrumb />
      <PageHeader
        title="인력대장"
        hint="셀을 두 번 누르면 그 자리에서 고쳐지고, 엑셀에서 복사한 내용은 Ctrl+V로 붙여넣습니다. 행 왼쪽 ↗ 버튼으로 사원카드를 엽니다."
        actions={
          <>
          <Link href="/settings/data-import">
            <Button variant="outline" size="sm">
              <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
              데이터 가져오기
            </Button>
          </Link>
          <Link href="/employees/pipeline">
            <Button variant="outline" size="sm">
              <ListChecks className="mr-1.5 h-3.5 w-3.5" />
              입퇴사 진행
            </Button>
          </Link>
          <Link href="/employees/roster">
            <Button variant="outline" size="sm">
              <ScrollText className="mr-1.5 h-3.5 w-3.5" />
              노동자명부
            </Button>
          </Link>
          <Link href="/employees/workplace-assignment">
            <Button variant="outline" size="sm">
              <Building2 className="mr-1.5 h-3.5 w-3.5" />
              사업장 배정
            </Button>
          </Link>
          <Link href="/employees/retirement">
            <Button variant="outline" size="sm">
              <UserMinus className="mr-1.5 h-3.5 w-3.5" />
              퇴직 관리
            </Button>
          </Link>
          <Link href="/employees/new">
            <Button size="sm">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              사원 등록
            </Button>
          </Link>
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatsCard title="전체 인원" value={counts.total} unit="명" icon={Users} color="blue" />
        <StatsCard title="재직" value={counts.active} unit="명" icon={UserCheck} color="green" />
        <StatsCard title="휴직" value={counts.onLeave} unit="명" icon={UserMinus} color="amber" />
        <StatsCard title="퇴직" value={counts.left} unit="명" icon={UserX} color="purple" />
      </div>

      <EmployeeRegister />
    </div>
  );
}
