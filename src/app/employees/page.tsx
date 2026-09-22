'use client';

import { Suspense, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { PageHeader, KpiGrid } from '@/components/layout/page-header';
import { EmployeeRegister } from '@/components/employee/employee-register';
import { EmployeeWorkspace } from '@/components/employee/employee-workspace';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Plus,
  UserMinus,
  Building2,
  ChevronDown,
  FileSpreadsheet,
  ScrollText,
  ListChecks,
  LayoutPanelLeft,
  Table2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useEmployeeStore } from '@/lib/stores/employee-store';

export default function EmployeesPage() {
  return (
    <Suspense>
      <EmployeesPageBody />
    </Suspense>
  );
}

/**
 * 인력대장.
 *
 * 기본은 워크스페이스(조직 트리 · 임직원 목록 · 사원카드)이고, 표(대장)로
 * 바꾸면 셀 편집·엑셀 붙여넣기·일괄 처리가 되는 격자가 나옵니다. 둘은 같은
 * 자료를 다른 모양으로 보는 것이라 머리말과 지표는 함께 씁니다.
 */
function EmployeesPageBody() {
  const employees = useEmployeeStore((s) => s.employees);
  const assignments = useEmployeeStore((s) => s.assignments);
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const view = params.get('view') === 'grid' ? 'grid' : 'workspace';

  const setView = (next: 'grid' | 'workspace') => {
    const qs = new URLSearchParams(params.toString());
    if (next === 'grid') qs.set('view', 'grid');
    else qs.delete('view');
    const s = qs.toString();
    router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
  };

  const kpis = useMemo(() => {
    const today = new Date();
    const ym = today.toISOString().slice(0, 7);
    const active = employees.filter((e) => e.status === 'active');
    const hiredThisMonth = employees.filter((e) => e.hire_date.startsWith(ym)).length;
    const leftThisMonth = employees.filter((e) => (e.resignation_date ?? '').startsWith(ym)).length;
    const onLeave = employees.filter((e) => e.status === 'on_leave').length;
    const tenure =
      active.length === 0
        ? 0
        : active.reduce((sum, e) => sum + (today.getTime() - Date.parse(e.hire_date)) / (365.25 * 86_400_000), 0) /
          active.length;
    const futureMoves = assignments.filter((a) => a.effective_from > today.toISOString().slice(0, 10)).length;
    return [
      {
        label: '재직 인원',
        value: active.length,
        unit: '명',
        delta: hiredThisMonth > 0 ? `▲ ${hiredThisMonth} · 이번 달 입사` : leftThisMonth > 0 ? `▼ ${leftThisMonth} · 이번 달 퇴사` : '이번 달 변동 없음',
        tone: hiredThisMonth > 0 ? ('up' as const) : leftThisMonth > 0 ? ('down' as const) : ('neutral' as const),
      },
      { label: '휴직', value: onLeave, unit: '명', delta: '복직 예정은 사원카드에서' },
      { label: '예정 발령', value: futureMoves, unit: '건', delta: '시행일이 오늘 이후' },
      { label: '평균 근속', value: tenure.toFixed(1), unit: '년', delta: '재직자 기준' },
    ];
  }, [employees, assignments]);

  return (
    <div>
      <div className="border-b border-ink-150 bg-paper px-7 pb-3.5 pt-4">
        <Breadcrumb />
        <PageHeader
          className="mb-0"
          title="임직원과 조직을"
          accent="한 화면에서."
          hint={
            view === 'workspace'
              ? '왼쪽에서 부서를, 가운데에서 사람을 고르면 오른쪽에 사원카드가 열립니다. 셀 편집·엑셀 붙여넣기는 표 보기에서.'
              : '셀을 두 번 누르면 그 자리에서 고쳐지고, 엑셀에서 복사한 내용은 Ctrl+V로 붙여넣습니다. 줄을 고르면 아래 막대에서 사원카드를 엽니다.'
          }
          actions={
            <>
              <div className="inline-flex rounded-md border border-ink-150 bg-card p-0.5" role="tablist" aria-label="보기">
                <ViewButton on={view === 'workspace'} onClick={() => setView('workspace')} icon={LayoutPanelLeft} label="워크스페이스" />
                <ViewButton on={view === 'grid'} onClick={() => setView('grid')} icon={Table2} label="표" />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    관련 업무
                    <ChevronDown className="h-3.5 w-3.5 text-ink-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link href="/employees/pipeline">
                      <ListChecks className="h-3.5 w-3.5" />
                      입퇴사 진행
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/employees/roster">
                      <ScrollText className="h-3.5 w-3.5" />
                      작업자 명부
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/employees/workplace-assignment">
                      <Building2 className="h-3.5 w-3.5" />
                      사업장 배정
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/employees/retirement">
                      <UserMinus className="h-3.5 w-3.5" />
                      퇴직 관리
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/settings/data-import">
                      <FileSpreadsheet className="h-3.5 w-3.5" />
                      데이터 가져오기
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Link href="/employees/new">
                <Button size="sm">
                  <Plus className="h-3.5 w-3.5" />
                  사원 등록
                </Button>
              </Link>
            </>
          }
          actionsPlacement="under-title"
          aside={<KpiGrid items={kpis} />}
        />
      </div>

      {view === 'workspace' ? (
        <EmployeeWorkspace />
      ) : (
        <div className="px-7 py-5">
          <EmployeeRegister />
        </div>
      )}
    </div>
  );
}

function ViewButton({
  on,
  onClick,
  icon: Icon,
  label,
}: {
  on: boolean;
  onClick: () => void;
  icon: typeof Table2;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={on}
      onClick={onClick}
      className={cn(
        'inline-flex h-7 items-center gap-1.5 rounded-[4px] px-2.5 text-[12px] font-medium transition-colors',
        on ? 'bg-ink-900 text-paper' : 'text-ink-500 hover:text-ink-900',
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
