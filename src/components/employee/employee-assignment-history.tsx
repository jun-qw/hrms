'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useEmployeeStore } from '@/lib/stores/employee-store';
import type { EmployeeAssignment } from '@/types';

/**
 * 소속 이력.
 *
 * 발령 목록이 아니라 **구간**을 보여 줍니다. "2024-03-01 승진" 같은 사건 나열은
 * 지금 어느 부서 소속인지, 그때는 어디였는지를 읽는 데 도움이 되지 않습니다.
 * 여기서는 언제부터 언제까지 어디였는지가 한 줄이고, 아직 오지 않은 발령은
 * 예정으로 따로 표시됩니다.
 */
export function EmployeeAssignmentHistory({ employeeId }: { employeeId: string }) {
  const assignments = useEmployeeStore((s) => s.assignments);
  const departments = useEmployeeStore((s) => s.departments);
  const positionRanks = useEmployeeStore((s) => s.positionRanks);
  const positionTitles = useEmployeeStore((s) => s.positionTitles);

  const rows = useMemo(
    () =>
      assignments
        .filter((a) => a.employee_id === employeeId)
        .sort((a, b) => b.effective_from.localeCompare(a.effective_from)),
    [assignments, employeeId],
  );

  const nameOf = <T extends { id: string; name: string }>(list: T[], id: string | null) =>
    id ? (list.find((x) => x.id === id)?.name ?? '—') : '—';

  const today = new Date().toISOString().slice(0, 10);

  // 지금 유효한 구간은 "종료일이 없는 구간"이 아니라 "오늘을 덮는 구간"입니다.
  // 뒤에 예정 발령이 하나라도 걸리면 현재 구간에도 종료일이 붙기 때문입니다.
  const stateOf = (a: EmployeeAssignment) => {
    if (a.effective_from > today) return 'future' as const;
    if (a.effective_to === null || a.effective_to >= today) return 'current' as const;
    return 'past' as const;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">소속 이력 ({rows.length}건)</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            소속 이력이 없습니다. 인사발령을 등록하면 여기에 구간으로 쌓입니다.
          </p>
        ) : (
          <ol className="relative space-y-0 border-l pl-5">
            {rows.map((a) => {
              const state = stateOf(a);
              return (
                <li key={a.id} className="relative pb-5 last:pb-0">
                  <span
                    className={cn(
                      'absolute -left-[26px] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-card',
                      state === 'current'
                        ? 'bg-primary'
                        : state === 'future'
                          ? 'bg-accent-amber'
                          : 'bg-muted-foreground/40',
                    )}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm tabular-nums">
                      {a.effective_from} ~ {a.effective_to ?? ''}
                    </span>
                    {state === 'current' && <Badge>현재</Badge>}
                    {state === 'future' && <Badge variant="secondary">예정</Badge>}
                  </div>
                  <p className="mt-0.5 text-sm">
                    {nameOf(departments, a.department_id)}
                    <span className="mx-1.5 text-muted-foreground">·</span>
                    {nameOf(positionRanks, a.position_rank_id)}
                    <span className="mx-1.5 text-muted-foreground">·</span>
                    {nameOf(positionTitles, a.position_title_id)}
                  </p>
                  {a.reason && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{a.reason}</p>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
