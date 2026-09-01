'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DataGrid } from '@/components/grid/data-grid';
import type { GridEditPatch, GridOption } from '@/components/grid/types';
import { useEmployeeStore } from '@/lib/stores/employee-store';
import { updateEmployee as persistEmployee } from '@/lib/actions/employee-actions';
import { DEFAULT_PAY_METHOD, PAY_METHOD_LABEL, type Employee, type JobClass } from '@/types';
import { REGISTER_PRESETS, buildRegisterColumns } from './employee-register-columns';
import { DepartmentTreeFilter, departmentSubtree } from './department-tree-filter';
import { BulkResignDialog } from './bulk-resign-dialog';

type StatusTab = 'active' | 'on_leave' | 'left' | 'all';

const STATUS_TABS: { id: StatusTab; label: string; match: (e: Employee) => boolean }[] = [
  { id: 'active', label: '재직', match: (e) => e.status === 'active' },
  { id: 'on_leave', label: '휴직', match: (e) => e.status === 'on_leave' },
  { id: 'left', label: '퇴직', match: (e) => e.status === 'resigned' || e.status === 'retired' },
  { id: 'all', label: '전체', match: () => true },
];

/**
 * 인력대장.
 *
 * 조회·수정·일괄처리·출력이 이 한 화면에서 끝납니다. 상세 카드는 행을 눌러
 * 들어가는 파생 화면일 뿐이고, 부서·직급·직책처럼 자주 바뀌는 값은 여기서
 * 바로 고치거나 엑셀에서 붙여넣습니다.
 */
export function EmployeeRegister() {
  const router = useRouter();
  const employees = useEmployeeStore((s) => s.employees);
  const departments = useEmployeeStore((s) => s.departments);
  const positionRanks = useEmployeeStore((s) => s.positionRanks);
  const positionTitles = useEmployeeStore((s) => s.positionTitles);
  const updateEmployeeLocal = useEmployeeStore((s) => s.updateEmployee);

  const [tab, setTab] = useState<StatusTab>('active');
  const [preset, setPreset] = useState<string>('basic');
  const [groupByDept, setGroupByDept] = useState(false);
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [resigning, setResigning] = useState<Employee[]>([]);

  // ── lookups ──────────────────────────────────────────────────────────────

  const departmentOptions = useMemo<GridOption[]>(
    () =>
      [...departments]
        .filter((d) => d.is_active)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((d) => ({ value: d.id, label: d.name })),
    [departments],
  );
  const rankOptions = useMemo<GridOption[]>(
    () =>
      [...positionRanks]
        .filter((r) => r.is_active)
        .sort((a, b) => a.level - b.level)
        .map((r) => ({ value: r.id, label: r.name })),
    [positionRanks],
  );
  const titleOptions = useMemo<GridOption[]>(
    () =>
      [...positionTitles]
        .filter((t) => t.is_active)
        .sort((a, b) => a.level - b.level)
        .map((t) => ({ value: t.id, label: t.name })),
    [positionTitles],
  );

  const nameFrom = (options: GridOption[]) => (id: string | null) =>
    id ? (options.find((o) => o.value === id)?.label ?? '') : '';

  const columns = useMemo(
    () =>
      buildRegisterColumns({
        departmentName: nameFrom(departmentOptions),
        rankName: nameFrom(rankOptions),
        titleName: nameFrom(titleOptions),
        departmentOptions,
        rankOptions,
        titleOptions,
      }),
    [departmentOptions, rankOptions, titleOptions],
  );

  // 프리셋은 "무엇을 볼지"와 "어떤 순서로 볼지"를 같이 정합니다. 표시 여부만
  // 바꾸면 현장직 프리셋에서 시급 열이 상태 뒤로 밀립니다 — 열 순서는 정의
  // 순서를 따르는데, 시급은 급여 항목이라 정의 뒤쪽에 있기 때문입니다.
  const presetColumns = useMemo(() => {
    const active = REGISTER_PRESETS.find((p) => p.id === preset);
    if (!active) return columns;
    const wanted = new Set(active.columns);
    const byId = new Map(columns.map((c) => [c.id, c]));

    const shown = active.columns
      .map((id) => byId.get(id))
      .filter((c): c is (typeof columns)[number] => Boolean(c))
      .map((c) => ({ ...c, hidden: false }));
    const rest = columns.filter((c) => !wanted.has(c.id)).map((c) => ({ ...c, hidden: true }));
    return [...shown, ...rest];
  }, [columns, preset]);

  const statusRows = useMemo(() => {
    const match = STATUS_TABS.find((t) => t.id === tab)?.match ?? (() => true);
    return employees.filter(match);
  }, [employees, tab]);

  // 부서를 고르면 그 하위 부서까지 함께 걸립니다.
  const rows = useMemo(() => {
    if (!departmentId) return statusRows;
    const scope = departmentSubtree(departments, departmentId);
    return statusRows.filter((e) => e.department_id && scope.has(e.department_id));
  }, [statusRows, departments, departmentId]);

  // 트리에 붙는 인원수는 지금 보고 있는 재직 상태 기준입니다.
  const countByDepartment = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of statusRows) {
      if (!e.department_id) continue;
      counts.set(e.department_id, (counts.get(e.department_id) ?? 0) + 1);
    }
    return counts;
  }, [statusRows]);

  const counts = useMemo(
    () =>
      Object.fromEntries(
        STATUS_TABS.map((t) => [t.id, employees.filter(t.match).length]),
      ) as Record<StatusTab, number>,
    [employees],
  );

  // ── writes ───────────────────────────────────────────────────────────────

  const handleEdit = useCallback(
    async (patches: GridEditPatch[]) => {
      // Group by row so a pasted row is one round trip, not one per cell.
      const byRow = new Map<string, Record<string, unknown>>();
      for (const patch of patches) {
        const existing = byRow.get(patch.rowId) ?? {};
        existing[patch.field] = patch.value;
        byRow.set(patch.rowId, existing);
      }

      // 직군을 바꾸면 급여방식도 그 직군의 기본값으로 따라옵니다 — 현장직은
      // 통상 시급제입니다. 다만 담당자가 이미 기본값과 다르게 지정해 둔
      // 사람은 건드리지 않습니다. 의도적으로 정한 값을 조용히 덮으면 안 됩니다.
      const followed: string[] = [];
      for (const [id, patch] of byRow) {
        const nextClass = patch.job_class as JobClass | undefined;
        if (!nextClass || patch.pay_method !== undefined) continue;
        const employee = employees.find((e) => e.id === id);
        if (!employee || employee.job_class === nextClass) continue;
        if (employee.pay_method !== DEFAULT_PAY_METHOD[employee.job_class]) continue;

        patch.pay_method = DEFAULT_PAY_METHOD[nextClass];
        followed.push(employee.name);
      }

      const results = await Promise.all(
        [...byRow].map(async ([id, patch]) => {
          const saved = await persistEmployee(id, patch as Partial<Employee>);
          if (saved) updateEmployeeLocal(id, saved);
          return Boolean(saved);
        }),
      );

      const failed = results.filter((ok) => !ok).length;
      if (failed > 0) {
        toast.error(`${failed}건을 저장하지 못했습니다.`);
        return;
      }
      if (followed.length > 0) {
        const method = PAY_METHOD_LABEL[
          byRow.get(employees.find((e) => e.name === followed[0])?.id ?? '')
            ?.pay_method as keyof typeof PAY_METHOD_LABEL
        ];
        toast.success(
          `${byRow.size}건을 저장했습니다. 직군이 바뀐 ${followed.length}명은 급여방식도 ${method}로 함께 바꿨습니다.`,
        );
        return;
      }
      toast.success(`${byRow.size}건을 저장했습니다.`);
    },
    [updateEmployeeLocal, employees],
  );

  // ── render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">
      {/* Status tabs */}
      <div className="flex flex-wrap items-center gap-1 border-b">
        {STATUS_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              '-mb-px border-b-2 px-3 py-2 text-sm transition-colors',
              tab === t.id
                ? 'border-primary font-semibold text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
            <span className="ml-1.5 text-xs tabular-nums text-muted-foreground">
              {counts[t.id] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* Column presets */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs text-muted-foreground">열 구성</span>
        {REGISTER_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            title={p.hint}
            onClick={() => setPreset(p.id)}
            className={cn(
              'rounded-full border px-2.5 py-1 text-xs transition-colors',
              preset === p.id
                ? 'border-primary bg-primary/10 font-medium text-primary'
                : 'border-border text-muted-foreground hover:bg-muted',
            )}
          >
            {p.name}
          </button>
        ))}
      </div>

      <div className="flex items-start gap-3">
        <DepartmentTreeFilter
          departments={departments}
          countByDepartment={countByDepartment}
          totalCount={statusRows.length}
          selectedId={departmentId}
          onSelect={setDepartmentId}
        />

        <div className="min-w-0 flex-1">
      <DataGrid
        key={preset}
        gridKey={`employees:${preset}`}
        title={`인력대장 (${STATUS_TABS.find((t) => t.id === tab)?.label})`}
        columns={presetColumns}
        rows={rows}
        rowLabel={(e) => `${e.name} (${e.employee_number})`}
        groupBy={
          groupByDept
            ? { columnId: 'department', label: (e) => nameFrom(departmentOptions)(e.department_id) || '미배정' }
            : undefined
        }
        onEdit={handleEdit}
        onOpenRow={(e) => router.push(`/employees/${e.id}`)}
        exportSubtitle={`${new Date().toLocaleDateString('ko-KR')} 기준 · ${STATUS_TABS.find((t) => t.id === tab)?.label} ${rows.length}명`}
        emptyMessage="해당 조건의 인원이 없습니다."
        toolbarExtra={
          <Button
            variant={groupByDept ? 'default' : 'outline'}
            size="sm"
            className="h-8 text-xs"
            onClick={() => setGroupByDept((v) => !v)}
          >
            부서별 소계
          </Button>
        }
        bulkActions={(selected, clear) =>
          selected.length > 0 ? (
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => {
                  navigator.clipboard.writeText(
                    selected.map((e) => `${e.employee_number}\t${e.name}\t${e.email}`).join('\n'),
                  );
                  toast.success(`${selected.length}명을 클립보드에 복사했습니다.`);
                }}
              >
                복사
              </Button>
              {selected.every((e) => e.status !== 'resigned' && e.status !== 'retired') && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 border-destructive/40 text-xs text-destructive hover:bg-destructive/5"
                  onClick={() => setResigning(selected)}
                >
                  퇴사 처리
                </Button>
              )}
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={clear}>
                선택 해제
              </Button>
            </div>
          ) : null
        }
      />
        </div>
      </div>

      <BulkResignDialog
        open={resigning.length > 0}
        onOpenChange={(next) => !next && setResigning([])}
        employees={resigning}
        onDone={() => setResigning([])}
      />
    </div>
  );
}
