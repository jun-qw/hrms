'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Breadcrumb } from '@/components/layout/breadcrumb';
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
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">인력대장</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            셀을 두 번 누르면 그 자리에서 고쳐지고, 엑셀에서 복사한 내용은 Ctrl+V로 붙여넣습니다. 행 왼쪽 ↗ 버튼으로 사원카드를 엽니다.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/settings/data-import">
            <Button variant="outline">
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              데이터 가져오기
            </Button>
          </Link>
          <Link href="/employees/pipeline">
            <Button variant="outline">
              <ListChecks className="mr-2 h-4 w-4" />
              입퇴사 진행
            </Button>
          </Link>
          <Link href="/employees/roster">
            <Button variant="outline">
              <ScrollText className="mr-2 h-4 w-4" />
              노동자명부
            </Button>
          </Link>
          <Link href="/employees/workplace-assignment">
            <Button variant="outline">
              <Building2 className="mr-2 h-4 w-4" />
              사업장 배정
            </Button>
          </Link>
          <Link href="/employees/retirement">
            <Button variant="outline">
              <UserMinus className="mr-2 h-4 w-4" />
              퇴직 관리
            </Button>
          </Link>
          <Link href="/employees/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              사원 등록
            </Button>
          </Link>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatsCard title="전체 인원" value={counts.total} icon={Users} color="blue" />
        <StatsCard title="재직" value={counts.active} icon={UserCheck} color="green" />
        <StatsCard title="휴직" value={counts.onLeave} icon={UserMinus} color="amber" />
        <StatsCard title="퇴직" value={counts.left} icon={UserX} color="purple" />
      </div>

      <EmployeeRegister />
    </div>
  );
}
