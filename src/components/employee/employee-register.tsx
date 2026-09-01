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
import type { Employee } from '@/types';
import { REGISTER_PRESETS, buildRegisterColumns } from './employee-register-columns';

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

  // A preset is just a saved visibility set, applied through the grid's own
  // column state — so a person can still tweak it afterwards.
  const presetColumns = useMemo(() => {
    const active = REGISTER_PRESETS.find((p) => p.id === preset);
    if (!active) return columns;
    const wanted = new Set(active.columns);
    return columns.map((c) => ({ ...c, hidden: !wanted.has(c.id) }));
  }, [columns, preset]);

  const rows = useMemo(() => {
    const match = STATUS_TABS.find((t) => t.id === tab)?.match ?? (() => true);
    return employees.filter(match);
  }, [employees, tab]);

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
      } else {
        toast.success(`${byRow.size}건을 저장했습니다.`);
      }
    },
    [updateEmployeeLocal],
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
