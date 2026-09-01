'use client';

import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { DataGrid } from '@/components/grid/data-grid';
import type { GridColumn, GridEditPatch } from '@/components/grid/types';
import { useAttendanceStore } from '@/lib/stores/attendance-store';
import { useEmployeeStore } from '@/lib/stores/employee-store';
import { useSettingsStore } from '@/lib/stores/settings-store';
import {
  ATTENDANCE_CODES,
  displayOf,
  hoursOf,
  parseCell,
  type CellValue,
} from '@/lib/attendance/codes';
import { JOB_CLASS_LABEL, type Attendance, type Employee } from '@/types';

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

interface RegisterRow {
  id: string;
  employeeId: string;
  employeeNumber: string;
  name: string;
  department: string;
  jobClass: Employee['job_class'];
  isHourly: boolean;
  /** 1..31 → 그날의 셀 값 */
  days: Map<number, CellValue | null>;
  workedDays: number;
  workedHours: number;
  leaveDays: number;
  absentDays: number;
  /** 입력이 하나도 없는 근무일 수 — 마감 전에 반드시 0이어야 합니다. */
  missingDays: number;
}

/**
 * 근태대장 — 월 × 일 매트릭스.
 *
 * 종이 근태대장과 같은 배치입니다. 한 칸에 한 글자를 적고, 그 글자가 그날의
 * 근태입니다. 숫자를 적으면 실근로시간으로 봅니다.
 *
 * **현장 시급직에게는 이 화면이 곧 급여입니다.** 실근로시간이 그대로 기본급이
 * 되므로, 빈 칸을 0시간으로 처리하면 입력이 덜 된 달이 조용히 마감되어 급여가
 * 0원으로 나갑니다. 그래서 빈 칸은 "미입력"으로 세어 따로 경고합니다.
 */
export function AttendanceRegister({
  year,
  month,
  onPeriodChange,
}: {
  year: number;
  month: number;
  onPeriodChange: (year: number, month: number) => void;
}) {
  const records = useAttendanceStore((s) => s.records);
  const addRecord = useAttendanceStore((s) => s.addRecord);
  const updateRecord = useAttendanceStore((s) => s.updateRecord);
  const employees = useEmployeeStore((s) => s.employees);
  const departments = useEmployeeStore((s) => s.departments);
  const holidays = useSettingsStore((s) => s.holidays);

  const [onlyHourly, setOnlyHourly] = useState(false);

  const daysInMonth = new Date(year, month, 0).getDate();
  const dateKey = (day: number) =>
    `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  /** 그날이 쉬는 날인지 — 주말이거나 등록된 공휴일. */
  const restDays = useMemo(() => {
    const set = new Set<number>();
    const holidaySet = new Set(holidays.filter((h) => h.is_active).map((h) => h.date));
    for (let d = 1; d <= daysInMonth; d++) {
      const dow = new Date(year, month - 1, d).getDay();
      if (dow === 0 || dow === 6 || holidaySet.has(dateKey(d))) set.add(d);
    }
    return set;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month, daysInMonth, holidays]);

  const scheduledDays = daysInMonth - restDays.size;

  // ── 행 만들기 ────────────────────────────────────────────────────────────

  const rows = useMemo<RegisterRow[]>(() => {
    const byEmployee = new Map<string, Map<string, Attendance>>();
    for (const r of records) {
      if (!r.date.startsWith(`${year}-${String(month).padStart(2, '0')}`)) continue;
      const m = byEmployee.get(r.employee_id) ?? new Map();
      m.set(r.date, r);
      byEmployee.set(r.employee_id, m);
    }

    return employees
      .filter((e) => e.status === 'active' || e.status === 'on_leave')
      .filter((e) => (onlyHourly ? e.job_class === 'field' : true))
      .map((e) => {
        const mine = byEmployee.get(e.id) ?? new Map<string, Attendance>();
        const days = new Map<number, CellValue | null>();
        let workedDays = 0;
        let workedHours = 0;
        let leaveDays = 0;
        let absentDays = 0;
        let missingDays = 0;

        for (let d = 1; d <= daysInMonth; d++) {
          const rec = mine.get(dateKey(d));
          const value = recordToCell(rec);
          days.set(d, value);

          if (restDays.has(d)) continue;
          if (!value) {
            missingDays += 1;
            continue;
          }
          const hours = hoursOf(value);
          workedHours += hours;
          if (value.code) {
            if (value.code.countsAsWorkday) workedDays += 1;
            if (value.code.deductsLeave > 0) leaveDays += value.code.deductsLeave;
            if (value.code.key === '결') absentDays += 1;
          } else if (hours > 0) {
            workedDays += 1;
          }
        }

        return {
          id: e.id,
          employeeId: e.id,
          employeeNumber: e.employee_number,
          name: e.name,
          department: departments.find((d) => d.id === e.department_id)?.name ?? '미배정',
          jobClass: e.job_class,
          isHourly: e.pay_method === 'hourly' || e.pay_method === 'daily',
          days,
          workedDays,
          workedHours,
          leaveDays,
          absentDays,
          missingDays,
        };
      })
      .sort((a, b) => a.employeeNumber.localeCompare(b.employeeNumber));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records, employees, departments, year, month, daysInMonth, restDays, onlyHourly]);

  const missingTotal = rows.reduce((s, r) => s + r.missingDays, 0);
  const hourlyMissing = rows.filter((r) => r.isHourly && r.missingDays > 0).length;

  // ── 저장 ─────────────────────────────────────────────────────────────────

  const handleEdit = useCallback(
    async (patches: GridEditPatch[]) => {
      let saved = 0;
      for (const patch of patches) {
        const day = Number(patch.field.replace('d', ''));
        if (!Number.isFinite(day)) continue;
        const value = patch.value as CellValue | null;
        const date = dateKey(day);
        const existing = records.find((r) => r.employee_id === patch.rowId && r.date === date);
        const hours = hoursOf(value);

        const fields = {
          work_hours: value ? hours : null,
          status: statusOf(value),
          note: value?.code ? value.code.label : null,
        };

        if (existing) {
          updateRecord(existing.id, fields);
        } else if (value) {
          addRecord({
            id: `att-${patch.rowId}-${date}`,
            employee_id: patch.rowId,
            date,
            clock_in: null,
            clock_out: null,
            overtime_hours: 0,
            created_at: new Date().toISOString(),
            ...fields,
          } as Attendance);
        }
        saved += 1;
      }
      if (saved > 0) toast.success(`${saved}칸을 저장했습니다.`);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [records, addRecord, updateRecord, year, month],
  );

  // ── 열 ───────────────────────────────────────────────────────────────────

  const columns = useMemo<GridColumn<RegisterRow>[]>(() => {
    const dayColumns: GridColumn<RegisterRow>[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dow = new Date(year, month - 1, d).getDay();
      const rest = restDays.has(d);
      dayColumns.push({
        id: `d${d}`,
        header: `${d}\n${DAY_NAMES[dow]}`,
        width: 38,
        align: 'center',
        value: (r) => displayOf(r.days.get(d) ?? null),
        cell: (r) => {
          const v = r.days.get(d) ?? null;
          const text = displayOf(v);
          const missing = !v && !rest;
          return (
            <span
              className={cn(
                'w-full text-center',
                rest && 'text-muted-foreground/50',
                dow === 0 && 'text-red-500',
                v?.code?.tone === 'leave' && 'text-accent-blue',
                v?.code?.tone === 'absent' && 'font-bold text-destructive',
                v?.code?.tone === 'trip' && 'text-accent-purple',
                // 시급직의 미입력은 그대로 급여 누락이라 눈에 띄어야 합니다.
                missing && r.isHourly && 'bg-accent-amber-subtle',
              )}
            >
              {text || (rest ? '·' : '')}
            </span>
          );
        },
        edit: {
          field: `d${d}`,
          parse: (input) => {
            const parsed = parseCell(input);
            return parsed.ok ? { ok: true, value: parsed.value } : { ok: false, error: parsed.error };
          },
        },
      });
    }

    return [
      { id: 'employeeNumber', header: '사번', width: 96, pinned: true, filter: 'text', value: (r) => r.employeeNumber },
      { id: 'name', header: '성명', width: 80, pinned: true, filter: 'text', value: (r) => r.name },
      { id: 'department', header: '부서', width: 110, filter: 'text', value: (r) => r.department },
      {
        id: 'jobClass',
        header: '직군',
        width: 90,
        filter: 'select',
        options: Object.entries(JOB_CLASS_LABEL).map(([value, label]) => ({ value, label })),
        value: (r) => JOB_CLASS_LABEL[r.jobClass],
      },
      ...dayColumns,
      { id: 'workedDays', header: '근무일', width: 62, type: 'number', total: 'sum', value: (r) => r.workedDays },
      { id: 'workedHours', header: '실근로', width: 68, type: 'number', total: 'sum', value: (r) => r.workedHours },
      { id: 'leaveDays', header: '연차', width: 56, type: 'number', total: 'sum', value: (r) => r.leaveDays },
      { id: 'absentDays', header: '결근', width: 56, type: 'number', total: 'sum', value: (r) => r.absentDays },
      {
        id: 'missingDays',
        header: '미입력',
        width: 66,
        type: 'number',
        total: 'sum',
        value: (r) => r.missingDays,
        cell: (r) =>
          r.missingDays > 0 ? (
            <Badge variant={r.isHourly ? 'destructive' : 'secondary'} className="text-[10px]">
              {r.missingDays}일
            </Badge>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
    ];
     
  }, [daysInMonth, year, month, restDays]);

  const shiftMonth = (delta: number) => {
    const d = new Date(year, month - 1 + delta, 1);
    onPeriodChange(d.getFullYear(), d.getMonth() + 1);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon-sm" onClick={() => shiftMonth(-1)} aria-label="이전 달">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[7rem] text-center text-sm font-semibold tabular-nums">
            {year}년 {month}월
          </span>
          <Button variant="outline" size="icon-sm" onClick={() => shiftMonth(1)} aria-label="다음 달">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <span className="text-xs text-muted-foreground">소정근로일 {scheduledDays}일</span>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <input
            type="checkbox"
            className="h-3.5 w-3.5 accent-primary"
            checked={onlyHourly}
            onChange={(e) => setOnlyHourly(e.target.checked)}
          />
          시급직만
        </label>

        <div className="ml-auto flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          {ATTENDANCE_CODES.map((c) => (
            <span key={c.key}>
              <b className="text-foreground">{c.key}</b> {c.label}
            </span>
          ))}
          <span>
            <b className="text-foreground">숫자</b> 실근로시간
          </span>
        </div>
      </div>

      {missingTotal > 0 && (
        <div className="flex items-start gap-2 rounded-md border border-accent-amber/40 bg-accent-amber-subtle px-3 py-2 text-xs">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-amber" />
          <span>
            소정근로일인데 아직 입력하지 않은 칸이 <strong>{missingTotal}칸</strong> 있습니다
            {hourlyMissing > 0 && (
              <>
                {' '}— 그중 <strong className="text-destructive">시급직 {hourlyMissing}명</strong>은
                실근로시간이 그대로 기본급이라, 비워 둔 채 마감하면 그만큼 급여가 덜 나갑니다
              </>
            )}
            .
          </span>
        </div>
      )}

      <DataGrid
        gridKey="attendance-register"
        title={`근태대장 (${year}년 ${month}월)`}
        columns={columns}
        rows={rows}
        rowLabel={(r) => `${r.name} (${r.employeeNumber})`}
        onEdit={handleEdit}
        exportSubtitle={`${year}년 ${month}월 · 소정근로일 ${scheduledDays}일 · ${rows.length}명`}
        emptyMessage="대상 인원이 없습니다."
      />
    </div>
  );
}

// ---------------------------------------------------------------------------

function recordToCell(rec: Attendance | undefined): CellValue | null {
  if (!rec) return null;
  // 코드로 입력한 건은 note에 코드 이름이 남습니다.
  const code = rec.note ? ATTENDANCE_CODES.find((c) => c.label === rec.note) : undefined;
  if (code) return { code };
  if (rec.work_hours !== null && rec.work_hours !== undefined) return { hours: rec.work_hours };
  return null;
}

function statusOf(value: CellValue | null): Attendance['status'] {
  if (!value) return 'normal';
  switch (value.code?.key) {
    case '연':
      return 'leave';
    case '반':
      return 'half_day';
    case '결':
      return 'absent';
    case '지':
      return 'late';
    case '조':
      return 'early_leave';
    case '휴':
      return 'holiday';
    default:
      return 'normal';
  }
}
