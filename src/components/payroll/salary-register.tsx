'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { DataGrid } from '@/components/grid/data-grid';
import type { GridColumn, GridEditPatch } from '@/components/grid/types';
import { useEmployeeStore } from '@/lib/stores/employee-store';
import {
  fetchSalariesAsOf,
  setSalaries,
  type SalaryRecord,
} from '@/lib/actions/salary-actions';
import { resolveRateSet } from '@/lib/actions/payroll-rate-actions';
import { DEFAULT_RATE_SET } from '@/lib/payroll/rate-set';
import { JOB_CLASS_LABEL, PAY_METHOD_LABEL, type Employee } from '@/types';

interface SalaryRow {
  id: string;
  employeeNumber: string;
  name: string;
  department: string;
  jobClass: Employee['job_class'];
  payMethod: Employee['pay_method'];
  isHourly: boolean;
  /** 적용일 기준으로 유효한 금액 */
  baseSalary: number;
  hourlyWage: number;
  /** 이 사람에게 의미 있는 금액 — 월급제면 기본급, 시급제면 시급 */
  amount: number;
  /** 아직 금액이 정해지지 않음 */
  unset: boolean;
  belowMinimum: boolean;
}

/**
 * 급여 입력.
 *
 * 115명의 급여를 한 명씩 사원카드에서 넣게 하면 아무도 끝까지 하지 않습니다.
 * 그래서 대장 하나에 모아 놓고 엑셀에서 붙여넣게 합니다.
 *
 * 금액은 **적용일과 함께** 저장됩니다. 급여는 "지금 얼마"가 아니라 "언제부터
 * 얼마"여야 소급 인상과 과거 급여 재산출이 가능합니다.
 */
export function SalaryRegister() {
  const employees = useEmployeeStore((s) => s.employees);
  const departments = useEmployeeStore((s) => s.departments);
  const reloadEmployees = useEmployeeStore((s) => s.reload);

  /** 이 날짜부터 적용. 대개 인상 발효일이나 이번 달 1일입니다. */
  const [effectiveFrom, setEffectiveFrom] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [reason, setReason] = useState('');
  const [salaries, setSalariesState] = useState<Record<string, SalaryRecord>>({});
  const [minimumWage, setMinimumWage] = useState(DEFAULT_RATE_SET.minimumHourlyWage);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [onlyUnset, setOnlyUnset] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([
      fetchSalariesAsOf(effectiveFrom),
      resolveRateSet(Number(effectiveFrom.slice(0, 4))),
    ])
      .then(([map, rates]) => {
        if (!alive) return;
        setSalariesState(map);
        setMinimumWage(rates.rates.minimumHourlyWage);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [effectiveFrom]);

  const rows = useMemo<SalaryRow[]>(() => {
    const built = employees
      .filter((e) => e.status === 'active' || e.status === 'on_leave')
      .map<SalaryRow>((e) => {
        const record = salaries[e.id];
        const isHourly = e.pay_method === 'hourly' || e.pay_method === 'daily';
        const baseSalary = record?.base_salary ?? e.base_salary ?? 0;
        const hourlyWage = record?.hourly_wage ?? e.hourly_wage ?? 0;
        const amount = isHourly ? hourlyWage : baseSalary;
        return {
          id: e.id,
          employeeNumber: e.employee_number,
          name: e.name,
          department: departments.find((d) => d.id === e.department_id)?.name ?? '미배정',
          jobClass: e.job_class,
          payMethod: e.pay_method,
          isHourly,
          baseSalary,
          hourlyWage,
          amount,
          unset: amount <= 0,
          // 일급제는 시간급이 아니라 비교 대상이 아닙니다.
          belowMinimum: e.pay_method === 'hourly' && amount > 0 && amount < minimumWage,
        };
      })
      .sort((a, b) => a.employeeNumber.localeCompare(b.employeeNumber));
    return onlyUnset ? built.filter((r) => r.unset) : built;
  }, [employees, departments, salaries, minimumWage, onlyUnset]);

  const allRows = useMemo(
    () => employees.filter((e) => e.status === 'active' || e.status === 'on_leave'),
    [employees],
  );
  const unsetCount = allRows.filter((e) => {
    const r = salaries[e.id];
    const isHourly = e.pay_method === 'hourly' || e.pay_method === 'daily';
    const amount = isHourly ? (r?.hourly_wage ?? e.hourly_wage) : (r?.base_salary ?? e.base_salary);
    return (amount ?? 0) <= 0;
  }).length;
  const belowCount = rows.filter((r) => r.belowMinimum).length;

  // ── 저장 ─────────────────────────────────────────────────────────────────

  const handleEdit = useCallback(
    async (patches: GridEditPatch[]) => {
      const byRow = new Map<string, number>();
      for (const patch of patches) {
        if (patch.field !== 'amount') continue;
        byRow.set(patch.rowId, Number(patch.value) || 0);
      }
      if (byRow.size === 0) return;

      setSaving(true);
      try {
        const inputs = [...byRow].map(([employeeId, amount]) => {
          const e = employees.find((x) => x.id === employeeId)!;
          const isHourly = e.pay_method === 'hourly' || e.pay_method === 'daily';
          return {
            employeeId,
            effectiveFrom,
            payMethod: e.pay_method,
            baseSalary: isHourly ? (salaries[employeeId]?.base_salary ?? 0) : amount,
            hourlyWage: isHourly ? amount : (salaries[employeeId]?.hourly_wage ?? 0),
            reason: reason || null,
          };
        });

        const result = await setSalaries(inputs);
        if (!result.ok) {
          toast.error('급여를 저장하지 못했습니다.');
          return;
        }
        const refreshed = await fetchSalariesAsOf(effectiveFrom);
        setSalariesState(refreshed);
        await reloadEmployees();

        if (result.failed.length > 0) {
          toast.warning(`${result.saved}건 저장, ${result.failed.length}건 실패`);
        } else {
          toast.success(`${result.saved}명의 급여를 ${effectiveFrom}부터 적용했습니다.`);
        }
      } finally {
        setSaving(false);
      }
    },
    [employees, salaries, effectiveFrom, reason, reloadEmployees],
  );

  // ── 열 ───────────────────────────────────────────────────────────────────

  const columns = useMemo<GridColumn<SalaryRow>[]>(
    () => [
      { id: 'employeeNumber', header: '사번', width: 108, pinned: true, filter: 'text', value: (r) => r.employeeNumber },
      { id: 'name', header: '성명', width: 82, pinned: true, filter: 'text', value: (r) => r.name },
      { id: 'department', header: '부서', width: 116, filter: 'text', value: (r) => r.department },
      {
        id: 'jobClass',
        header: '직군',
        width: 92,
        filter: 'select',
        options: Object.entries(JOB_CLASS_LABEL).map(([value, label]) => ({ value, label })),
        value: (r) => JOB_CLASS_LABEL[r.jobClass],
      },
      {
        id: 'payMethod',
        header: '급여방식',
        width: 84,
        filter: 'select',
        options: Object.entries(PAY_METHOD_LABEL).map(([value, label]) => ({ value, label })),
        value: (r) => PAY_METHOD_LABEL[r.payMethod],
      },
      {
        id: 'amount',
        header: '금액 (월급 / 시급)',
        width: 150,
        type: 'money',
        value: (r) => r.amount,
        cell: (r) => (
          <span
            className={cn(
              'w-full text-right tabular-nums',
              r.unset && 'text-muted-foreground',
              r.belowMinimum && 'font-semibold text-destructive',
            )}
          >
            {r.unset ? '미입력' : r.amount.toLocaleString('ko-KR')}
          </span>
        ),
        edit: {
          field: 'amount',
          control: 'number',
          parse: (input) => {
            if (input === '') return { ok: true, value: 0 };
            const n = Number(input.replace(/[,\s원]/g, ''));
            if (!Number.isFinite(n)) return { ok: false, error: '숫자만 입력하세요.' };
            if (n < 0) return { ok: false, error: '금액은 0 이상이어야 합니다.' };
            if (n > 100_000_000) return { ok: false, error: '금액이 너무 큽니다. 자릿수를 확인하세요.' };
            return { ok: true, value: Math.round(n) };
          },
        },
      },
      {
        id: 'unit',
        header: '단위',
        width: 70,
        align: 'center',
        value: (r) => (r.isHourly ? (r.payMethod === 'daily' ? '일급' : '시급') : '월'),
        cell: (r) => (
          <Badge variant={r.isHourly ? 'secondary' : 'outline'} className="text-[10px]">
            {r.isHourly ? (r.payMethod === 'daily' ? '일급' : '시급') : '월'}
          </Badge>
        ),
      },
      {
        id: 'check',
        header: '확인',
        width: 130,
        value: (r) => (r.belowMinimum ? '최저임금 미달' : r.unset ? '미입력' : ''),
        cell: (r) =>
          r.belowMinimum ? (
            <span className="text-xs font-medium text-destructive">최저임금 미달</span>
          ) : r.unset ? (
            <span className="text-xs text-muted-foreground">미입력</span>
          ) : (
            <span className="text-xs text-accent-green">확인</span>
          ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3 rounded-md border bg-card px-3 py-2.5">
        <div className="space-y-1">
          <Label htmlFor="eff" className="text-xs">
            적용일
          </Label>
          <Input
            id="eff"
            type="date"
            className="h-8 w-40 text-sm"
            value={effectiveFrom}
            onChange={(e) => setEffectiveFrom(e.target.value)}
          />
        </div>
        <div className="min-w-48 flex-1 space-y-1">
          <Label htmlFor="reason" className="text-xs">
            사유 (선택)
          </Label>
          <Input
            id="reason"
            className="h-8 text-sm"
            placeholder="2026년 정기 인상 · 최저임금 반영 등"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        <p className="max-w-md text-xs text-muted-foreground">
          입력한 금액은 <strong>이 날짜부터</strong> 적용됩니다. 지난 달 급여를 다시 계산하면
          그때 유효했던 금액이 쓰입니다.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        {loading && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            불러오는 중
          </span>
        )}
        {saving && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            저장 중
          </span>
        )}
        {unsetCount > 0 && (
          <span className="text-accent-amber">
            미입력 <strong className="tabular-nums">{unsetCount}</strong>명
          </span>
        )}
        {belowCount > 0 && (
          <span className="text-destructive">
            최저임금 미달 <strong className="tabular-nums">{belowCount}</strong>명
          </span>
        )}
        <label className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
          <input
            type="checkbox"
            className="h-3.5 w-3.5 accent-primary"
            checked={onlyUnset}
            onChange={(e) => setOnlyUnset(e.target.checked)}
          />
          미입력만
        </label>
      </div>

      {unsetCount > 0 && (
        <div className="flex items-start gap-2 rounded-md border border-accent-amber/40 bg-accent-amber-subtle px-3 py-2 text-xs">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-amber" />
          <span>
            금액이 정해지지 않은 사람이 <strong>{unsetCount}명</strong> 있습니다. 이 상태로
            급여를 계산하면 기본급이 0원으로 나갑니다. 엑셀에서 <strong>금액 열만</strong>{' '}
            복사해 표에 붙여넣으면 한 번에 채워집니다.
          </span>
        </div>
      )}

      <DataGrid
        gridKey="salary-register"
        title="급여 기준액"
        columns={columns}
        rows={rows}
        rowLabel={(r) => `${r.name} (${r.employeeNumber})`}
        onEdit={handleEdit}
        exportSubtitle={`${effectiveFrom} 적용 기준 · ${rows.length}명 · 미입력 ${unsetCount}명`}
        emptyMessage="대상 인원이 없습니다."
      />

      <p className="text-xs text-muted-foreground">
        시급이 최저임금({minimumWage.toLocaleString('ko-KR')}원) 아래면 표시만 하고 저장은
        막지 않습니다 — 수습기간 감액 같은 예외가 있기 때문입니다. 최저임금 값은
        설정에서 해당 연도 고시액으로 바꾸세요.
      </p>
    </div>
  );
}
