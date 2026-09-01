'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { DataGrid } from '@/components/grid/data-grid';
import type { GridColumn } from '@/components/grid/types';
import { usePayrollStore } from '@/lib/stores/payroll-store';
import { useEmployeeStore } from '@/lib/stores/employee-store';
import type { SavedPayroll } from '@/types';

/** 실수령액이 전월 대비 이만큼 넘게 움직이면 확인 대상으로 봅니다. */
const VARIANCE_THRESHOLD = 0.1;

interface RegisterRow {
  id: string;
  employeeId: string;
  employeeNumber: string;
  name: string;
  department: string;
  status: SavedPayroll['status'];
  /** 항목명 → 금액. 열이 급여항목 마스터에 따라 달라지므로 맵으로 듭니다. */
  earnings: Map<string, number>;
  deductions: Map<string, number>;
  totalEarnings: number;
  totalDeductions: number;
  netPay: number;
  /** 전월 대비 실수령액 증감률. 전월 자료가 없으면 null. */
  variance: number | null;
  /** 이번 달 처음 급여를 받는 사람 */
  isNew: boolean;
}

const STATUS_LABEL: Record<string, string> = {
  draft: '작성중',
  confirmed: '확정',
  paid: '지급완료',
};

/**
 * 급여대장.
 *
 * 요약 8열짜리 목록이 아니라 **지급·공제 항목을 그대로 펼친 가로 대장**입니다.
 * 회계 검토나 노무 자문에 넘길 때 필요한 것은 실수령액 합계가 아니라 항목별
 * 금액이고, 요약본만 있으면 결국 담당자가 엑셀에서 다시 만듭니다.
 *
 * 열은 급여항목 마스터가 아니라 **그 달에 실제로 쓰인 항목**에서 뽑습니다.
 * 마스터에만 있고 아무도 받지 않은 수당이 빈 열로 남으면 대장이 넓어지기만
 * 하기 때문입니다.
 */
export function PayrollRegister({ year, month }: { year: number; month: number | 'all' }) {
  const router = useRouter();
  const savedPayrolls = usePayrollStore((s) => s.savedPayrolls);
  const updatePayrollStatus = usePayrollStore((s) => s.updatePayrollStatus);
  const deletePayroll = usePayrollStore((s) => s.deletePayroll);
  const employees = useEmployeeStore((s) => s.employees);
  const departments = useEmployeeStore((s) => s.departments);

  const [groupByDept, setGroupByDept] = useState(false);
  const [onlyVariance, setOnlyVariance] = useState(false);

  const { rows, earningNames, deductionNames } = useMemo(() => {
    const inPeriod = savedPayrolls.filter(
      (p) => p.year === year && (month === 'all' || p.month === month),
    );

    // 전월 자료 — 실수령액 비교용
    const prevYear = month === 'all' ? year - 1 : month === 1 ? year - 1 : year;
    const prevMonth = month === 'all' ? 'all' : month === 1 ? 12 : month - 1;
    const previous = new Map(
      savedPayrolls
        .filter((p) => p.year === prevYear && (prevMonth === 'all' || p.month === prevMonth))
        .map((p) => [p.employee_id, p]),
    );

    const earningSet = new Set<string>();
    const deductionSet = new Set<string>();

    const built = inPeriod.map<RegisterRow>((p) => {
      const employee = employees.find((e) => e.id === p.employee_id);
      const earnings = new Map<string, number>();
      const deductions = new Map<string, number>();

      for (const item of p.items) {
        const target = item.category === 'earning' ? earnings : deductions;
        const set = item.category === 'earning' ? earningSet : deductionSet;
        set.add(item.name);
        target.set(item.name, (target.get(item.name) ?? 0) + item.amount);
      }

      const prev = previous.get(p.employee_id);
      const variance =
        prev && prev.net_pay > 0 ? (p.net_pay - prev.net_pay) / prev.net_pay : null;

      return {
        id: p.id,
        employeeId: p.employee_id,
        employeeNumber: employee?.employee_number ?? '',
        name: employee?.name ?? p.employee_id,
        department:
          departments.find((d) => d.id === employee?.department_id)?.name ?? '미배정',
        status: p.status,
        earnings,
        deductions,
        totalEarnings: p.total_earnings,
        totalDeductions: p.total_deductions,
        netPay: p.net_pay,
        variance,
        isNew: !prev,
      };
    });

    built.sort((a, b) => a.employeeNumber.localeCompare(b.employeeNumber));
    return {
      rows: built,
      earningNames: [...earningSet],
      deductionNames: [...deductionSet],
    };
  }, [savedPayrolls, employees, departments, year, month]);

  const visibleRows = useMemo(
    () => (onlyVariance ? rows.filter((r) => flagged(r)) : rows),
    [rows, onlyVariance],
  );

  const flaggedCount = rows.filter(flagged).length;

  const columns = useMemo<GridColumn<RegisterRow>[]>(() => {
    const money = (id: string, header: string, get: (r: RegisterRow) => number): GridColumn<RegisterRow> => ({
      id,
      header,
      width: 108,
      type: 'money',
      total: 'sum',
      value: get,
    });

    return [
      { id: 'employeeNumber', header: '사번', width: 88, pinned: true, filter: 'text', value: (r) => r.employeeNumber },
      { id: 'name', header: '성명', width: 84, pinned: true, filter: 'text', value: (r) => r.name },
      { id: 'department', header: '부서', width: 118, filter: 'text', value: (r) => r.department },

      ...earningNames.map((name) => money(`e:${name}`, name, (r) => r.earnings.get(name) ?? 0)),
      money('totalEarnings', '지급계', (r) => r.totalEarnings),

      ...deductionNames.map((name) => money(`d:${name}`, name, (r) => r.deductions.get(name) ?? 0)),
      money('totalDeductions', '공제계', (r) => r.totalDeductions),

      money('netPay', '실수령액', (r) => r.netPay),
      {
        id: 'variance',
        header: '전월 대비',
        width: 96,
        align: 'center',
        value: (r) => (r.isNew ? '신규' : r.variance === null ? '' : Math.round(r.variance * 1000) / 10),
        cell: (r) => {
          if (r.isNew) return <Badge variant="secondary" className="text-[10px]">신규</Badge>;
          if (r.variance === null) return <span className="text-muted-foreground">—</span>;
          const pct = Math.round(r.variance * 1000) / 10;
          const big = Math.abs(r.variance) > VARIANCE_THRESHOLD;
          return (
            <span
              className={cn(
                'tabular-nums',
                big ? 'font-semibold text-destructive' : 'text-muted-foreground',
              )}
            >
              {pct > 0 ? '+' : ''}
              {pct}%
            </span>
          );
        },
      },
      {
        id: 'status',
        header: '상태',
        width: 84,
        filter: 'select',
        options: Object.values(STATUS_LABEL).map((label) => ({ value: label, label })),
        value: (r) => STATUS_LABEL[r.status] ?? r.status,
      },
    ];
  }, [earningNames, deductionNames]);

  const periodLabel = month === 'all' ? `${year}년 전체` : `${year}년 ${month}월`;

  return (
    <div className="space-y-3">
      {flaggedCount > 0 && (
        <div className="flex items-center gap-2 rounded-md border border-accent-amber/40 bg-accent-amber-subtle px-3 py-2 text-xs">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-accent-amber" />
          <span>
            전월 대비 실수령액이 {VARIANCE_THRESHOLD * 100}% 넘게 움직였거나 이번 달 처음
            지급되는 건이 <strong>{flaggedCount}건</strong> 있습니다. 마감 전에 확인하세요.
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-7 shrink-0 text-xs"
            onClick={() => setOnlyVariance((v) => !v)}
          >
            {onlyVariance ? '전체 보기' : '해당 건만 보기'}
          </Button>
        </div>
      )}

      <DataGrid
        gridKey="payroll-register"
        title={`급여대장 (${periodLabel})`}
        columns={columns}
        rows={visibleRows}
        rowLabel={(r) => `${r.name} (${r.employeeNumber})`}
        groupBy={groupByDept ? { columnId: 'department', label: (r) => r.department } : undefined}
        onOpenRow={(r) => router.push(`/payroll/payslip/${r.id}`)}
        exportSubtitle={`${periodLabel} · ${visibleRows.length}명 · 지급 항목 ${earningNames.length} / 공제 항목 ${deductionNames.length}`}
        emptyMessage="해당 기간에 저장된 급여가 없습니다. 급여 계산에서 계산 후 저장하세요."
        bulkActions={(selected, clear) => {
          if (selected.length === 0) return null;
          const allDraft = selected.every((r) => r.status === 'draft');
          const allConfirmed = selected.every((r) => r.status === 'confirmed');
          return (
            <div className="flex items-center gap-1.5">
              {allDraft && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => {
                    selected.forEach((r) => updatePayrollStatus(r.id, 'confirmed'));
                    toast.success(`${selected.length}건을 확정했습니다.`);
                    clear();
                  }}
                >
                  확정
                </Button>
              )}
              {allConfirmed && (
                <Button
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => {
                    selected.forEach((r) => updatePayrollStatus(r.id, 'paid'));
                    toast.success(`${selected.length}건을 지급완료 처리했습니다.`);
                    clear();
                  }}
                >
                  지급완료
                </Button>
              )}
              {allDraft && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 border-destructive/40 text-xs text-destructive hover:bg-destructive/5"
                  onClick={() => {
                    // 확정 이후에는 지우지 않습니다 — 지급 이력이 사라지면
                    // 원천징수부와 대장이 어긋납니다.
                    if (!window.confirm(`작성중인 급여 ${selected.length}건을 삭제할까요?`)) return;
                    selected.forEach((r) => deletePayroll(r.id));
                    toast.success(`${selected.length}건을 삭제했습니다.`);
                    clear();
                  }}
                >
                  삭제
                </Button>
              )}
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={clear}>
                선택 해제
              </Button>
            </div>
          );
        }}
        toolbarExtra={
          <>
            <Button
              variant={groupByDept ? 'default' : 'outline'}
              size="sm"
              className="h-8 text-xs"
              onClick={() => setGroupByDept((v) => !v)}
            >
              부서별 소계
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => downloadTransferFile(visibleRows, employees, periodLabel)}
            >
              이체파일
            </Button>
          </>
        }
      />
    </div>
  );
}

function flagged(r: RegisterRow): boolean {
  return r.isNew || (r.variance !== null && Math.abs(r.variance) > VARIANCE_THRESHOLD);
}

/**
 * 은행 이체용 CSV.
 *
 * 은행마다 펌뱅킹 서식이 달라 특정 은행 포맷으로 고정하지 않고, 어느 서식에도
 * 옮겨 담을 수 있는 최소 항목(예금주·은행·계좌·금액)으로 내려받게 했습니다.
 * 계좌가 비어 있는 사람은 파일에 넣지 않고 따로 알려 줍니다 — 조용히 빠지면
 * 그 사람만 급여를 못 받습니다.
 */
function downloadTransferFile(
  rows: RegisterRow[],
  employees: { id: string; bank_name: string | null; bank_account: string | null }[],
  periodLabel: string,
): void {
  const ready: string[] = [];
  const missing: string[] = [];

  for (const row of rows) {
    const employee = employees.find((e) => e.id === row.employeeId);
    if (!employee?.bank_name || !employee?.bank_account) {
      missing.push(row.name);
      continue;
    }
    ready.push(
      [row.name, employee.bank_name, employee.bank_account, String(row.netPay)]
        .map((v) => (/[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v))
        .join(','),
    );
  }

  if (ready.length === 0) {
    toast.error('계좌가 등록된 대상이 없습니다. 인력대장에서 은행·계좌를 먼저 입력하세요.');
    return;
  }

  const csv = '﻿' + ['예금주,은행,계좌번호,이체금액', ...ready].join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `급여이체_${periodLabel.replace(/\s/g, '')}.csv`;
  a.click();
  URL.revokeObjectURL(url);

  if (missing.length > 0) {
    toast.warning(
      `${ready.length}건을 내려받았습니다. 계좌가 없어 제외된 ${missing.length}명: ${missing.slice(0, 3).join(', ')}${missing.length > 3 ? ' 외' : ''}`,
    );
  } else {
    toast.success(`${ready.length}건의 이체 자료를 내려받았습니다.`);
  }
}
