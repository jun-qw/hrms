'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  CalendarClock,
  ClipboardCheck,
  FileSignature,
  LogIn,
  LogOut,
  UserCheck,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { fetchPipelineSummary, type PipelineSummary } from '@/lib/actions/pipeline-actions';
import { useLeaveStore } from '@/lib/stores/leave-store';
import { useApprovalStore } from '@/lib/stores/approval-store';

interface Item {
  label: string;
  count: number;
  detail?: string;
  href: string;
  icon: typeof LogIn;
  urgent?: boolean;
}

/**
 * 이번 주 할 일.
 *
 * 홈이 통계판이면 담당자는 매일 아침 "그래서 뭘 해야 하지"를 스스로 재구성해야
 * 합니다. 인사 업무 흐름을 모르는 사람에게는 그게 가장 어려운 일이라, 홈을
 * 업무 큐로 바꿉니다. 건수가 0인 항목은 아예 숨겨서 남은 것만 남깁니다.
 */
export function TodoPanel() {
  const [summary, setSummary] = useState<PipelineSummary | null>(null);
  const leaveRequests = useLeaveStore((s) => s.leaveRequests);
  const approvals = useApprovalStore((s) => s.approvals);

  useEffect(() => {
    let alive = true;
    fetchPipelineSummary().then((s) => {
      if (alive) setSummary(s);
    });
    return () => {
      alive = false;
    };
  }, []);

  const pendingLeave = leaveRequests.filter((r) => r.status === 'pending').length;
  const pendingApproval = approvals.filter((a) => a.status === 'pending').length;

  const items: Item[] = [
    {
      label: '입사 처리',
      count: summary?.onboardingOpen ?? 0,
      detail: summary?.onboardingOverdue ? `${summary.onboardingOverdue}건 지연` : undefined,
      href: '/employees/pipeline',
      icon: LogIn,
      urgent: (summary?.onboardingOverdue ?? 0) > 0,
    },
    {
      label: '퇴사 처리',
      count: summary?.offboardingOpen ?? 0,
      detail: summary?.offboardingOverdue ? `${summary.offboardingOverdue}건 지연` : undefined,
      href: '/employees/pipeline',
      icon: LogOut,
      urgent: (summary?.offboardingOverdue ?? 0) > 0,
    },
    {
      label: '계약 만료 예정',
      count: summary?.contractsExpiring ?? 0,
      detail: '30일 내',
      href: '/employees',
      icon: FileSignature,
    },
    {
      label: '예정된 발령',
      count: summary?.upcomingAssignments ?? 0,
      detail: '발령일 도래 시 자동 반영',
      href: '/appointments',
      icon: CalendarClock,
    },
    {
      label: '휴가 승인 대기',
      count: pendingLeave,
      href: '/leave/admin',
      icon: UserCheck,
    },
    {
      label: '결재 대기',
      count: pendingApproval,
      href: '/approval',
      icon: ClipboardCheck,
    },
  ];

  const open = items.filter((i) => i.count > 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          이번 주 할 일
          {open.length > 0 && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              {open.length}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {summary === null ? (
          <p className="py-6 text-center text-sm text-muted-foreground">확인 중...</p>
        ) : open.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            처리를 기다리는 일이 없습니다.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {open.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  'group flex items-center gap-3 rounded-md border px-3 py-2.5 transition-colors hover:bg-muted/60',
                  item.urgent && 'border-destructive/40 bg-destructive/5',
                )}
              >
                <item.icon
                  className={cn(
                    'h-4 w-4 shrink-0',
                    item.urgent ? 'text-destructive' : 'text-muted-foreground',
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.label}</p>
                  {item.detail && (
                    <p
                      className={cn(
                        'truncate text-xs',
                        item.urgent ? 'text-destructive' : 'text-muted-foreground',
                      )}
                    >
                      {item.detail}
                    </p>
                  )}
                </div>
                <span className="shrink-0 text-lg font-bold tabular-nums">{item.count}</span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
