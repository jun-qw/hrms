'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DataGrid } from '@/components/grid/data-grid';
import type { GridColumn } from '@/components/grid/types';
import { useLeaveStore } from '@/lib/stores/leave-store';
import { useEmployeeStore } from '@/lib/stores/employee-store';
import { calculateAnnualLeave } from '@/lib/utils/leave-calculator';
import { JOB_CLASS_LABEL, type Employee } from '@/types';

/** 잔여가 이 비율 아래로 남으면 소진이 늦다고 봅니다. */
const PROMOTION_THRESHOLD = 0.5;

interface LeaveRow {
  id: string;
  employeeNumber: string;
  name: string;
  department: string;
  jobClass: Employee['job_class'];
  hireDate: string;
  serviceYears: number;
  /** 근로기준법 제60조로 계산한 올해 부여일수 */
  statutory: number;
  granted: number;
  used: number;
  remaining: number;
  usageRate: number;
  /** 법정 일수와 부여 일수가 어긋난 정도 */
  gap: number;
}

/**
 * 연차대장.
 *
 * 개인별 부여·사용·잔여를 한 화면에 놓고, 두 가지를 짚어 줍니다.
 *
 *  - **법정 일수와 부여 일수의 차이** — 입사일 기준으로 자동 계산한 값과 실제
 *    부여된 값이 다르면 부여 누락이거나 별도 부여입니다. 어느 쪽이든 담당자가
 *    알고 있어야 하는 차이입니다.
 *  - **소진이 늦은 사람** — 연차 사용 촉진(근로기준법 제61조)을 하려면 누구에게
 *    통보해야 하는지부터 뽑아야 합니다.
 */
export function LeaveRegister({ year }: { year: number }) {
  const router = useRouter();
  const leaveBalances = useLeaveStore((s) => s.leaveBalances);
  const leaveTypes = useLeaveStore((s) => s.leaveTypes);
  const employees = useEmployeeStore((s) => s.employees);
  const departments = useEmployeeStore((s) => s.departments);

  const [onlyPromotion, setOnlyPromotion] = useState(false);

  const annualTypeId = useMemo(
    () => leaveTypes.find((t) => t.code === 'annual')?.id,
    [leaveTypes],
  );

  const rows = useMemo<LeaveRow[]>(() => {
    const balanceOf = new Map(
      leaveBalances
        .filter((b) => b.year === year && (!annualTypeId || b.leave_type_id === annualTypeId))
        .map((b) => [b.employee_id, b]),
    );

    return employees
      .filter((e) => e.status === 'active' || e.status === 'on_leave')
      .map((e) => {
        const b = balanceOf.get(e.id);
        const granted = b?.total_days ?? 0;
        const used = b?.used_days ?? 0;
        const remaining = b?.remaining_days ?? granted - used;
        const statutory = calculateAnnualLeave(new Date(e.hire_date), new Date(`${year}-12-31`));
        const service =
          Math.round(
            ((new Date(`${year}-12-31`).getTime() - new Date(e.hire_date).getTime()) /
              31_557_600_000) *
              10,
          ) / 10;

        return {
          id: e.id,
          employeeNumber: e.employee_number,
          name: e.name,
          department: departments.find((d) => d.id === e.department_id)?.name ?? '미배정',
          jobClass: e.job_class,
          hireDate: e.hire_date,
          serviceYears: Math.max(0, service),
          statutory,
          granted,
          used,
          remaining,
          usageRate: granted > 0 ? Math.round((used / granted) * 1000) / 10 : 0,
          gap: granted - statutory,
        };
      })
      .sort((a, b) => a.employeeNumber.localeCompare(b.employeeNumber));
  }, [employees, departments, leaveBalances, annualTypeId, year]);

  const needsPromotion = (r: LeaveRow) =>
    r.granted > 0 && r.used / r.granted < PROMOTION_THRESHOLD && r.remaining > 0;
  const promotionCount = rows.filter(needsPromotion).length;
  const gapCount = rows.filter((r) => r.gap !== 0).length;

  const visible = onlyPromotion ? rows.filter(needsPromotion) : rows;

  const columns = useMemo<GridColumn<LeaveRow>[]>(
    () => [
      { id: 'employeeNumber', header: '사번', width: 96, pinned: true, filter: 'text', value: (r) => r.employeeNumber },
      { id: 'name', header: '성명', width: 80, pinned: true, filter: 'text', value: (r) => r.name },
      { id: 'department', header: '부서', width: 116, filter: 'text', value: (r) => r.department },
      {
        id: 'jobClass',
        header: '직군',
        width: 90,
        filter: 'select',
        options: Object.entries(JOB_CLASS_LABEL).map(([value, label]) => ({ value, label })),
        value: (r) => JOB_CLASS_LABEL[r.jobClass],
      },
      { id: 'hireDate', header: '입사일', width: 104, type: 'date', align: 'center', value: (r) => r.hireDate },
      { id: 'serviceYears', header: '근속(년)', width: 74, type: 'number', value: (r) => r.serviceYears },
      {
        id: 'statutory',
        header: '법정',
        width: 62,
        type: 'number',
        value: (r) => r.statutory,
      },
      { id: 'granted', header: '부여', width: 62, type: 'number', total: 'sum', value: (r) => r.granted },
      {
        id: 'gap',
        header: '차이',
        width: 62,
        align: 'center',
        value: (r) => r.gap,
        cell: (r) =>
          r.gap === 0 ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            <span className={cn('font-semibold tabular-nums', r.gap < 0 ? 'text-destructive' : 'text-accent-blue')}>
              {r.gap > 0 ? '+' : ''}
              {r.gap}
            </span>
          ),
      },
      { id: 'used', header: '사용', width: 62, type: 'number', total: 'sum', value: (r) => r.used },
      { id: 'remaining', header: '잔여', width: 62, type: 'number', total: 'sum', value: (r) => r.remaining },
      {
        id: 'usageRate',
        header: '소진율',
        width: 116,
        value: (r) => r.usageRate,
        cell: (r) => (
          <div className="flex w-full items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className={cn('h-full rounded-full', needsPromotion(r) ? 'bg-accent-amber' : 'bg-primary')}
                style={{ width: `${Math.min(100, r.usageRate)}%` }}
              />
            </div>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{r.usageRate}%</span>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span>
          대상 <strong className="tabular-nums">{rows.length}</strong>명
        </span>
        {gapCount > 0 && (
          <span className="text-muted-foreground">
            법정 일수와 다른 사람 <strong className="tabular-nums">{gapCount}</strong>명
          </span>
        )}
        {promotionCount > 0 && (
          <span className="text-accent-amber">
            소진 {PROMOTION_THRESHOLD * 100}% 미만 <strong className="tabular-nums">{promotionCount}</strong>명
          </span>
        )}
        <label className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
          <input
            type="checkbox"
            className="h-3.5 w-3.5 accent-primary"
            checked={onlyPromotion}
            onChange={(e) => setOnlyPromotion(e.target.checked)}
          />
          촉진 대상만
        </label>
      </div>

      {gapCount > 0 && (
        <div className="flex items-start gap-2 rounded-md border border-accent-amber/40 bg-accent-amber-subtle px-3 py-2 text-xs">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-amber" />
          <span>
            입사일로 계산한 법정 일수와 실제 부여 일수가 다른 사람이 <strong>{gapCount}명</strong>{' '}
            있습니다. 부여가 누락됐거나 사규로 더 준 경우인데, 어느 쪽인지는 확인이 필요합니다.
            <strong className="ml-1">
              명부의 입사일이 아직 자리표시 값이면 법정 일수도 그만큼 틀립니다.
            </strong>
          </span>
        </div>
      )}

      <DataGrid
        gridKey="leave-register"
        title={`연차대장 (${year}년)`}
        columns={columns}
        rows={visible}
        rowLabel={(r) => `${r.name} (${r.employeeNumber})`}
        onOpenRow={(r) => router.push(`/employees/${r.id}`)}
        exportSubtitle={`${year}년 · ${visible.length}명 · 촉진 대상 ${promotionCount}명`}
        emptyMessage="대상 인원이 없습니다."
        toolbarExtra={
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => router.push('/leave/admin')}
          >
            일괄 부여 · 조정
          </Button>
        }
        bulkActions={(selected, clear) =>
          selected.length > 0 ? (
            <div className="flex items-center gap-1.5">
              <Badge variant="secondary" className="text-[11px]">
                잔여 합계 {selected.reduce((s, r) => s + r.remaining, 0)}일
              </Badge>
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={clear}>
                선택 해제
              </Button>
            </div>
          ) : null
        }
      />
    </div>
  );
}
