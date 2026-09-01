'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { DataGrid } from '@/components/grid/data-grid';
import type { GridColumn } from '@/components/grid/types';
import { useEmployeeStore } from '@/lib/stores/employee-store';
import { useWorkflowStore, type WorkflowInstance } from '@/lib/stores/workflow-store';
import { useAuthStore } from '@/lib/stores/auth-store';

/** 착수 후 이 일수를 넘기면 지연으로 봅니다. */
const OVERDUE_DAYS = 14;

export interface PipelineRow {
  id: string;
  employeeId: string;
  employeeNumber: string;
  name: string;
  department: string;
  /** 입사일 또는 퇴사일 */
  keyDate: string;
  startedAt: string;
  elapsedDays: number;
  overdue: boolean;
  total: number;
  done: number;
  progress: number;
  /** 다음으로 처리해야 할 필수 항목 */
  nextTask: string;
  nextTaskId: string | null;
}

/**
 * 입사 / 퇴사 파이프라인.
 *
 * 사람 단위로 "무엇이 남았는지"를 보여 줍니다. 워크플로우 화면은 프로세스 하나를
 * 깊게 들여다보는 곳이고, 여기는 스무 명이 동시에 진행 중일 때 어디가 막혀
 * 있는지를 한눈에 보는 곳입니다. 그래서 다음 할 일을 열에 놓고, 그 자리에서
 * 완료 처리까지 끝냅니다.
 */
export function PipelineBoard({ type }: { type: 'onboarding' | 'offboarding' }) {
  const router = useRouter();
  const instances = useWorkflowStore((s) => s.instances);
  const completeTask = useWorkflowStore((s) => s.completeTask);
  const employees = useEmployeeStore((s) => s.employees);
  const departments = useEmployeeStore((s) => s.departments);
  const session = useAuthStore((s) => s.session);

  const [hideDone, setHideDone] = useState(true);
  // 경과일 기준 시각은 화면을 연 순간으로 고정합니다. 렌더마다 다시 읽으면
  // 목록이 계산될 이유가 없는데도 매번 다시 계산됩니다.
  const [now] = useState(() => Date.now());

  const rows = useMemo<PipelineRow[]>(() => {
    return instances
      .filter((i) => i.type === type)
      .filter((i) => (hideDone ? i.status !== 'completed' && i.status !== 'cancelled' : true))
      .map((instance) => toRow(instance, now, employees, departments, type))
      .sort((a, b) => a.keyDate.localeCompare(b.keyDate));
  }, [instances, type, hideDone, employees, departments, now]);

  const openCount = instances.filter(
    (i) => i.type === type && i.status !== 'completed' && i.status !== 'cancelled',
  ).length;
  const overdueCount = rows.filter((r) => r.overdue).length;

  const finishTask = useCallback(
    async (row: PipelineRow) => {
      if (!row.nextTaskId) return;
      completeTask(row.id, row.nextTaskId, session?.user_name ?? 'HR');
      toast.success(`'${row.nextTask}' 완료 처리했습니다.`);
    },
    [completeTask, session],
  );

  const columns = useMemo<GridColumn<PipelineRow>[]>(
    () => [
      { id: 'employeeNumber', header: '사번', width: 90, pinned: true, filter: 'text', value: (r) => r.employeeNumber },
      { id: 'name', header: '성명', width: 90, pinned: true, filter: 'text', value: (r) => r.name },
      { id: 'department', header: '부서', width: 120, filter: 'text', value: (r) => r.department },
      {
        id: 'keyDate',
        header: type === 'onboarding' ? '입사일' : '퇴사일',
        width: 104,
        type: 'date',
        align: 'center',
        value: (r) => r.keyDate,
      },
      {
        id: 'progress',
        header: '진행률',
        width: 132,
        value: (r) => r.progress,
        cell: (r) => (
          <div className="flex w-full items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className={cn('h-full rounded-full', r.overdue ? 'bg-accent-amber' : 'bg-primary')}
                style={{ width: `${r.progress}%` }}
              />
            </div>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              {r.done}/{r.total}
            </span>
          </div>
        ),
      },
      {
        id: 'nextTask',
        header: '다음 할 일',
        width: 240,
        filter: 'text',
        value: (r) => r.nextTask,
        cell: (r) =>
          r.nextTaskId ? (
            <div className="flex w-full min-w-0 items-center justify-between gap-2">
              <span className="truncate" title={r.nextTask}>
                {r.nextTask}
              </span>
              <Button
                size="sm"
                variant="outline"
                className="h-6 shrink-0 px-2 text-[11px]"
                onClick={(e) => {
                  e.stopPropagation();
                  void finishTask(r);
                }}
              >
                완료
              </Button>
            </div>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: 'elapsed',
        header: '경과',
        width: 84,
        align: 'center',
        value: (r) => r.elapsedDays,
        cell: (r) =>
          r.overdue ? (
            <Badge variant="destructive" className="text-[11px]">
              {r.elapsedDays}일
            </Badge>
          ) : (
            <span className="tabular-nums text-muted-foreground">{r.elapsedDays}일</span>
          ),
      },
    ],
    [type, finishTask],
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span>
          진행 중 <strong className="tabular-nums">{openCount}</strong>건
        </span>
        {overdueCount > 0 && (
          <span className="text-destructive">
            {OVERDUE_DAYS}일 초과 <strong className="tabular-nums">{overdueCount}</strong>건
          </span>
        )}
        <label className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
          <input
            type="checkbox"
            className="h-3.5 w-3.5 accent-primary"
            checked={hideDone}
            onChange={(e) => setHideDone(e.target.checked)}
          />
          완료된 건 숨기기
        </label>
      </div>

      <DataGrid
        gridKey={`pipeline:${type}`}
        title={type === 'onboarding' ? '입사 진행 현황' : '퇴사 진행 현황'}
        columns={columns}
        rows={rows}
        rowLabel={(r) => `${r.name} (${r.employeeNumber})`}
        onOpenRow={(r) => router.push(`/workflows/${r.id}`)}
        emptyMessage={
          type === 'onboarding'
            ? '진행 중인 입사 건이 없습니다. 사원을 등록하면 입사 프로세스가 자동으로 열립니다.'
            : '진행 중인 퇴사 건이 없습니다. 인력대장에서 퇴사 처리를 하면 여기에 나타납니다.'
        }
      />
    </div>
  );
}

function toRow(
  instance: WorkflowInstance,
  now: number,
  employees: { id: string; employee_number: string; hire_date: string; resignation_date: string | null; department_id: string | null }[],
  departments: { id: string; name: string }[],
  type: 'onboarding' | 'offboarding',
): PipelineRow {
  const employee = employees.find((e) => e.id === instance.employee_id);
  const total = instance.tasks.length;
  const done = instance.tasks.filter((t) => t.status === 'completed' || t.status === 'skipped').length;

  // 다음 할 일은 남은 것 중 단계·순서가 가장 앞선 필수 항목입니다.
  const pending = instance.tasks
    .filter((t) => t.status === 'pending')
    .sort((a, b) => a.step_index - b.step_index || a.sort_order - b.sort_order);
  const next = pending.find((t) => t.is_required) ?? pending[0];

  const startedAt = instance.started_at;
  const elapsedDays = startedAt
    ? Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 86_400_000))
    : 0;
  const isOpen = instance.status !== 'completed' && instance.status !== 'cancelled';

  return {
    id: instance.id,
    employeeId: instance.employee_id,
    employeeNumber: employee?.employee_number ?? '',
    name: instance.employee_name,
    department:
      departments.find((d) => d.id === employee?.department_id)?.name ??
      instance.department ??
      '미배정',
    keyDate:
      (type === 'onboarding' ? employee?.hire_date : employee?.resignation_date) ??
      startedAt.slice(0, 10),
    startedAt,
    elapsedDays,
    overdue: isOpen && elapsedDays > OVERDUE_DAYS,
    total,
    done,
    progress: total === 0 ? 0 : Math.round((done / total) * 100),
    nextTask: next?.title ?? '남은 항목 없음',
    nextTaskId: next?.id ?? null,
  };
}
