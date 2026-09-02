'use client';

/**
 * 홈 — 업무 큐.
 *
 * 예전 홈은 인원 통계와 부서별 차트였습니다. 보기에는 좋지만 담당자가 아침에
 * 열어서 얻는 것이 없습니다. 인사 업무 흐름을 모르는 사람에게 필요한 정보는
 * "이번 주에 무엇을 해야 하는가" 하나입니다.
 *
 * 그래서 카드마다 **할 일과 건수, 그리고 그 일을 하는 화면으로 가는 링크**만
 * 둡니다. 건수가 0이면 회색으로 가라앉히고, 밀린 것이 있으면 붉게 올립니다.
 * 통계는 인력 현황 화면으로 옮겼습니다.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  FileCheck,
  LogIn,
  LogOut,
  Users,
} from 'lucide-react';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useEmployeeStore } from '@/lib/stores/employee-store';
import { useAttendanceStore } from '@/lib/stores/attendance-store';
import { useLeaveStore } from '@/lib/stores/leave-store';
import { usePayrollStore } from '@/lib/stores/payroll-store';
import { useApprovalStore } from '@/lib/stores/approval-store';
import { useSettingsStore } from '@/lib/stores/settings-store';
import { fetchPipelineSummary, type PipelineSummary } from '@/lib/actions/pipeline-actions';

interface QueueLine {
  text: string;
  count: number;
  /** 전체 대비 몇 건인지 — "0" 보다 "0/115" 가 훨씬 많은 것을 말해 줍니다. */
  of?: number;
  /**
   * 숫자가 아니라 상태인 줄. 마감 여부 같은 참·거짓을 0과 1로 찍으면
   * 무슨 뜻인지 읽히지 않습니다.
   */
  state?: string;
  /** 밀린 일 — 0보다 크면 붉게 올립니다. */
  urgent?: boolean;
}

interface QueueCard {
  key: string;
  title: string;
  icon: typeof Users;
  href: string;
  hrefLabel: string;
  lines: QueueLine[];
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

export default function HomePage() {
  const employees = useEmployeeStore((s) => s.employees);
  const attendance = useAttendanceStore((s) => s.records);
  const closeouts = useAttendanceStore((s) => s.closeouts);
  const leaveBalances = useLeaveStore((s) => s.leaveBalances);
  const leaveRequests = useLeaveStore((s) => s.leaveRequests);
  const savedPayrolls = usePayrollStore((s) => s.savedPayrolls);
  const approvals = useApprovalStore((s) => s.approvals);
  const payDay = useSettingsStore((s) => s.payroll.pay_day);

  const [pipeline, setPipeline] = useState<PipelineSummary | null>(null);
  useEffect(() => { fetchPipelineSummary().then(setPipeline); }, []);

  const now = useMemo(() => new Date(), []);
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const today = iso(now);

  const active = useMemo(() => employees.filter((e) => e.status === 'active'), [employees]);

  /** 급여 마감까지 남은 날. 지급일이 지났으면 다음 달로 셉니다. */
  const payrollDue = useMemo(() => {
    const target = new Date(year, month - 1, payDay);
    if (target < now) target.setMonth(target.getMonth() + 1);
    return Math.ceil((target.getTime() - now.getTime()) / 86_400_000);
  }, [year, month, payDay, now]);

  /** 이번 달 근태가 한 건도 없는 재직자 — 시급직이면 기본급이 0원으로 나갑니다. */
  const missingAttendance = useMemo(() => {
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    const has = new Set(
      attendance.filter((r) => r.date.startsWith(prefix)).map((r) => r.employee_id),
    );
    return active.filter((e) => !has.has(e.id)).length;
  }, [attendance, active, year, month]);

  const payrollDone = useMemo(
    () => savedPayrolls.filter((p) => p.year === year && p.month === month).length,
    [savedPayrolls, year, month],
  );

  /** 기준액이 비어 있는 사람 — 계산해도 0원이 나옵니다. */
  const missingSalary = useMemo(
    () => active.filter((e) => !Number(e.base_salary) && !Number(e.hourly_wage)).length,
    [active],
  );

  /** 휴대폰 번호가 없는 사람 — 근태가 시스템에 들어오지 못합니다. */
  const missingPhone = useMemo(
    () => active.filter((e) => !String(e.phone ?? '').replace(/\D/g, '')).length,
    [active],
  );

  /** 수습 종료가 30일 안에 오는 사람. 입사 3개월을 수습으로 봅니다. */
  const probationEnding = useMemo(() => {
    const horizon = new Date(now); horizon.setDate(horizon.getDate() + 30);
    return active.filter((e) => {
      if (!e.hire_date) return false;
      const end = new Date(e.hire_date);
      end.setMonth(end.getMonth() + 3);
      return end >= now && end <= horizon;
    }).length;
  }, [active, now]);

  /** 연차 촉진 대상 — 절반도 쓰지 않은 사람. 근로기준법 제61조. */
  const leavePromotion = useMemo(() => {
    const mine = leaveBalances.filter((b) => b.year === year);
    return mine.filter((b) => Number(b.total_days) > 0
      && Number(b.used_days) < Number(b.total_days) / 2).length;
  }, [leaveBalances, year]);

  const pendingLeave = useMemo(
    () => leaveRequests.filter((r) => r.status === 'pending').length,
    [leaveRequests],
  );

  const pendingApprovals = useMemo(
    () => approvals.filter((a) => a.status === 'pending' || a.status === 'in_progress').length,
    [approvals],
  );

  const monthClosed = useMemo(
    () => closeouts.some((c) => c.year === year && c.month === month),
    [closeouts, year, month],
  );

  const cards: QueueCard[] = [
    {
      key: 'onboarding',
      title: '입사 처리',
      icon: LogIn,
      href: '/employees/pipeline',
      hrefLabel: '입사·퇴사',
      lines: [
        { text: '진행 중인 입사 절차', count: pipeline?.onboardingOpen ?? 0 },
        { text: '2주 넘게 안 끝난 건', count: pipeline?.onboardingOverdue ?? 0, urgent: true },
      ],
    },
    {
      key: 'offboarding',
      title: '퇴사 처리',
      icon: LogOut,
      href: '/employees/retirement',
      hrefLabel: '퇴직정산',
      lines: [
        { text: '진행 중인 퇴사 절차', count: pipeline?.offboardingOpen ?? 0 },
        { text: '2주 넘게 안 끝난 건', count: pipeline?.offboardingOverdue ?? 0, urgent: true },
      ],
    },
    {
      key: 'payroll',
      title: `급여 마감 D-${payrollDue}`,
      icon: Banknote,
      href: '/payroll/calculate',
      hrefLabel: '급여 계산',
      lines: [
        { text: `${month}월 계산 완료`, count: payrollDone, of: active.length },
        { text: '이번 달 근태 없는 사람', count: missingAttendance, urgent: true },
        { text: '급여 기준액 미입력', count: missingSalary, urgent: true },
      ],
    },
    {
      key: 'attendance',
      title: '근태 마감',
      icon: CalendarCheck,
      href: monthClosed ? '/attendance/admin' : '/attendance/import',
      hrefLabel: monthClosed ? '근태 마감' : '근태 일괄 등록',
      lines: [
        { text: `${month}월 근태`, count: 0, state: monthClosed ? '마감됨' : '열려 있음' },
        { text: '휴대폰 번호 미등록', count: missingPhone, urgent: true },
      ],
    },
    {
      key: 'contract',
      title: '계약 · 수습',
      icon: ClipboardList,
      href: '/employees/roster',
      hrefLabel: '인력대장',
      lines: [
        { text: '30일 내 계약 만료', count: pipeline?.contractsExpiring ?? 0, urgent: true },
        { text: '30일 내 수습 종료', count: probationEnding },
      ],
    },
    {
      key: 'leave',
      title: '휴가 · 연차 촉진',
      icon: Users,
      href: '/leave/register',
      hrefLabel: '연차대장',
      lines: [
        { text: '승인 대기 신청', count: pendingLeave, urgent: true },
        { text: '연차 촉진 통보 대상', count: leavePromotion },
      ],
    },
    {
      key: 'approval',
      title: '결재',
      icon: FileCheck,
      href: '/approval',
      hrefLabel: '결재함',
      lines: [{ text: '내 결재 대기', count: pendingApprovals, urgent: true }],
    },
  ];

  const totalOpen = cards.reduce(
    (s, c) => s + c.lines.reduce((n, l) => n + (l.urgent && !l.state ? l.count : 0), 0),
    0,
  );

  return (
    <div>
      <Breadcrumb />

      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">이번 주 할 일</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {year}년 {month}월 · 재직 {active.length}명 · 급여 지급일 매월 {payDay}일
          </p>
        </div>
        {totalOpen === 0 ? (
          <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800">
            <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
            밀린 일이 없습니다
          </Badge>
        ) : (
          <Badge variant="outline" className="border-red-300 bg-red-50 text-red-800">
            <AlertTriangle className="mr-1 h-3.5 w-3.5" />
            처리할 일 {totalOpen}건
          </Badge>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => {
          const urgent = card.lines.some((l) => l.urgent && !l.state && l.count > 0);
          return (
            <Link key={card.key} href={card.href} className="group">
              <Card
                className={cn(
                  'h-full transition-colors',
                  urgent ? 'border-red-200 bg-red-50/40 hover:border-red-300' : 'hover:border-primary/40',
                )}
              >
                <CardContent className="space-y-3 pt-5">
                  <div className="flex items-center gap-2">
                    <card.icon
                      className={cn('h-4 w-4', urgent ? 'text-red-600' : 'text-muted-foreground')}
                    />
                    <span className="text-sm font-semibold">{card.title}</span>
                  </div>

                  <div className="space-y-1">
                    {card.lines.map((line) => (
                      <div key={line.text} className="flex items-baseline justify-between gap-3">
                        <span
                          className={cn(
                            'text-[13px]',
                            line.count === 0 ? 'text-muted-foreground/60' : 'text-muted-foreground',
                          )}
                        >
                          {line.text}
                        </span>
                        {line.state ? (
                          <span className="text-[13px] font-semibold">{line.state}</span>
                        ) : (
                          <span
                            className={cn(
                              'font-mono text-base font-semibold tabular-nums',
                              line.count === 0
                                ? 'text-muted-foreground/40'
                                : line.urgent
                                  ? 'text-red-700'
                                  : 'text-foreground',
                            )}
                          >
                            {line.count}
                            {line.of !== undefined && (
                              <span className="text-xs font-normal text-muted-foreground">
                                /{line.of}
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-1 pt-1 text-xs text-primary opacity-0 transition-opacity group-hover:opacity-100">
                    {card.hrefLabel}
                    <ArrowRight className="h-3 w-3" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        기준일 {today}. 인원 통계와 부서별 현황은{' '}
        <Link href="/employees" className="underline underline-offset-2">
          인력관리
        </Link>
        에서 봅니다.
      </p>
    </div>
  );
}
