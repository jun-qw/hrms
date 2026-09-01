'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Users, Clock, CalendarDays, UserRoundPlus, Cake, PartyPopper, Briefcase, AlertTriangle, UserX, LogOut, Timer, TimerOff, ArrowRight } from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { StatsCard } from '@/components/dashboard/stats-card';
import { HeadcountChart } from '@/components/dashboard/headcount-chart';
import { HireResignChart } from '@/components/dashboard/hire-resign-chart';
import { RecentEvents } from '@/components/dashboard/recent-events';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useEmployeeStore } from '@/lib/stores/employee-store';
import { useAttendanceStore } from '@/lib/stores/attendance-store';
import { useLeaveStore } from '@/lib/stores/leave-store';
import { useAppointmentStore } from '@/lib/stores/appointment-store';

export default function DashboardPage() {
  const employees = useEmployeeStore((s) => s.employees);
  const departments = useEmployeeStore((s) => s.departments);
  const positionRanks = useEmployeeStore((s) => s.positionRanks);
  const attendanceRecords = useAttendanceStore((s) => s.records);
  const leaveRequests = useLeaveStore((s) => s.leaveRequests);
  const appointments = useAppointmentStore((s) => s.appointments);

  const today = new Date().toISOString().split('T')[0];
  const currentYear = new Date().getFullYear();

  const activeEmployees = useMemo(
    () => employees.filter((e) => e.status === 'active'),
    [employees],
  );

  // Stats
  const regularCount = activeEmployees.filter((e) => e.employment_type === 'regular').length;
  const contractCount = activeEmployees.filter((e) => e.employment_type !== 'regular').length;
  const todayAttendance = attendanceRecords.filter((r) => r.date === today);
  const attendanceRate = activeEmployees.length > 0
    ? Math.round((todayAttendance.length / activeEmployees.length) * 1000) / 10
    : 0;

  // Count employees on approved leave today
  const onLeaveToday = useMemo(() => {
    return leaveRequests.filter((r) =>
      r.status === 'approved' && r.start_date <= today && r.end_date >= today,
    ).length;
  }, [leaveRequests, today]);

  // === 금일 근태 집계 ===
  const todayAttendanceSummary = useMemo(() => {
    const total = activeEmployees.length;
    const records = todayAttendance;
    const lateCount = records.filter((r) => r.status === 'late').length;
    const earlyLeaveCount = records.filter((r) => r.status === 'early_leave').length;
    const halfDayCount = records.filter((r) => r.status === 'half_day' || r.status === 'quarter_day').length;
    const onLeaveStatus = records.filter((r) => r.status === 'leave').length;
    const missingClockOut = records.filter((r) => r.clock_in && !r.clock_out).length;
    const noClockIn = total - records.length - onLeaveToday;
    const normalCount = records.filter((r) => r.status === 'normal').length;
    return {
      total, normalCount, lateCount, earlyLeaveCount, halfDayCount,
      missingClockOut, noClockIn: Math.max(0, noClockIn), onLeaveStatus, totalRecorded: records.length,
    };
  }, [todayAttendance, activeEmployees, onLeaveToday]);

  // 지각자/미타각자 명단 추출
  const lateEmployees = useMemo(() => {
    return todayAttendance
      .filter((r) => r.status === 'late')
      .map((r) => {
        const emp = employees.find((e) => e.id === r.employee_id);
        const dept = emp ? departments.find((d) => d.id === emp.department_id) : null;
        return { id: r.id, name: emp?.name ?? '-', dept: dept?.name ?? '-', clockIn: r.clock_in };
      });
  }, [todayAttendance, employees, departments]);

  const missingClockOutEmployees = useMemo(() => {
    return todayAttendance
      .filter((r) => r.clock_in && !r.clock_out)
      .map((r) => {
        const emp = employees.find((e) => e.id === r.employee_id);
        const dept = emp ? departments.find((d) => d.id === emp.department_id) : null;
        return { id: r.id, name: emp?.name ?? '-', dept: dept?.name ?? '-', clockIn: r.clock_in };
      });
  }, [todayAttendance, employees, departments]);

  // Hire / resign stats for current year
  const { hiresThisYear, resignsThisYear, turnoverRate } = useMemo(() => {
    const yearStr = String(currentYear);
    const hires = employees.filter(
      (e) => e.hire_date.startsWith(yearStr),
    ).length;
    const resigns = employees.filter(
      (e) => e.resignation_date && e.resignation_date.startsWith(yearStr),
    ).length;
    const avgHeadcount = activeEmployees.length + resigns / 2;
    const rate = avgHeadcount > 0 ? Math.round((resigns / avgHeadcount) * 1000) / 10 : 0;
    return { hiresThisYear: hires, resignsThisYear: resigns, turnoverRate: rate };
  }, [employees, activeEmployees, currentYear]);

  const statsData = [
    { title: '전체 임직원', value: String(activeEmployees.length), icon: Users, color: 'blue' as const, description: `정규직 ${regularCount} / 비정규 ${contractCount}` },
    { title: '금일 출근', value: String(todayAttendance.length), icon: Clock, color: 'green' as const, description: `출근율 ${attendanceRate}%` },
    { title: '휴가 중', value: String(onLeaveToday), icon: CalendarDays, color: 'amber' as const, description: '승인된 휴가 기준' },
    { title: '금년 입퇴사', value: `+${hiresThisYear} / -${resignsThisYear}`, icon: UserRoundPlus, color: 'purple' as const, description: `이직률 ${turnoverRate}%` },
  ];

  // Department headcount — level 2 departments
  const headcountData = useMemo(() => {
    const level2Depts = departments.filter((d) => d.level === 2);
    return level2Depts.map((dept) => {
      const count = activeEmployees.filter((e) => e.department_id === dept.id).length;
      return { department: dept.name, count };
    }).filter((d) => d.count > 0);
  }, [departments, activeEmployees]);

  // Hire-resign trend (last 12 months)
  const hireResignData = useMemo(() => {
    const now = new Date();
    const months: { month: string; hires: number; resignations: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = `${d.getMonth() + 1}월`;
      const hires = employees.filter((e) => e.hire_date.startsWith(ym)).length;
      const resignations = employees.filter((e) => e.resignation_date?.startsWith(ym)).length;
      months.push({ month: label, hires, resignations });
    }
    return months;
  }, [employees]);

  // ── 직급별 인력 분포 (Position Rank Distribution) ──
  const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#6366f1', '#14b8a6'];
  const positionRankDistribution = useMemo(() => {
    const countMap: Record<string, number> = {};
    for (const emp of activeEmployees) {
      const rid = emp.position_rank_id ?? 'unknown';
      countMap[rid] = (countMap[rid] || 0) + 1;
    }
    return Object.entries(countMap).map(([rankId, count]) => {
      const rank = positionRanks.find((r) => r.id === rankId);
      return { name: rank?.name ?? '미지정', value: count };
    }).sort((a, b) => b.value - a.value);
  }, [activeEmployees, positionRanks]);

  // ── 근속연수 분포 (Tenure Distribution) ──
  const tenureDistribution = useMemo(() => {
    const buckets = { '1년 미만': 0, '1-3년': 0, '3-5년': 0, '5-10년': 0, '10년 이상': 0 };
    const now = new Date();
    for (const emp of activeEmployees) {
      const hireDate = new Date(emp.hire_date);
      const years = (now.getTime() - hireDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      if (years < 1) buckets['1년 미만']++;
      else if (years < 3) buckets['1-3년']++;
      else if (years < 5) buckets['3-5년']++;
      else if (years < 10) buckets['5-10년']++;
      else buckets['10년 이상']++;
    }
    return Object.entries(buckets).map(([label, count]) => ({ label, count }));
  }, [activeEmployees]);

  // ── 휴가 소진율 (Leave Usage Rate) ──
  const leaveBalances = useLeaveStore((s) => s.leaveBalances);
  const leaveUsageByDept = useMemo(() => {
    if (leaveBalances.length > 0) {
      // Group by department
      const deptUsage: Record<string, { total: number; used: number; deptName: string }> = {};
      for (const bal of leaveBalances) {
        const emp = employees.find((e) => e.id === bal.employee_id);
        if (!emp || emp.status !== 'active') continue;
        const dept = departments.find((d) => d.id === emp.department_id);
        const deptName = dept?.name ?? '미지정';
        if (!deptUsage[deptName]) deptUsage[deptName] = { total: 0, used: 0, deptName };
        deptUsage[deptName].total += bal.total_days;
        deptUsage[deptName].used += bal.used_days;
      }
      return Object.values(deptUsage)
        .filter((d) => d.total > 0)
        .map((d) => ({ department: d.deptName, rate: Math.round((d.used / d.total) * 100) }))
        .sort((a, b) => b.rate - a.rate)
        .slice(0, 5);
    }
    // Fallback: count leave requests per department
    const deptCount: Record<string, { count: number; deptName: string }> = {};
    for (const lr of leaveRequests.filter((r) => r.status === 'approved')) {
      const emp = employees.find((e) => e.id === lr.employee_id);
      if (!emp) continue;
      const dept = departments.find((d) => d.id === emp.department_id);
      const deptName = dept?.name ?? '미지정';
      if (!deptCount[deptName]) deptCount[deptName] = { count: 0, deptName };
      deptCount[deptName].count++;
    }
    const sorted = Object.values(deptCount).sort((a, b) => b.count - a.count).slice(0, 5);
    const maxCount = sorted[0]?.count || 1;
    return sorted.map((d) => ({ department: d.deptName, rate: Math.round((d.count / maxCount) * 100) }));
  }, [leaveBalances, leaveRequests, employees, departments]);

  // ── 금월 인사발령 예정 (This Month's Appointments) ──
  const currentMonth = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);
  const thisMonthAppointments = useMemo(() => {
    return appointments
      .filter((a) => a.effective_date.startsWith(currentMonth))
      .sort((a, b) => a.effective_date.localeCompare(b.effective_date))
      .map((a) => {
        const emp = employees.find((e) => e.id === a.employee_id);
        const typeLabels: Record<string, string> = {
          hire: '입사', promotion: '승진', transfer: '전보',
          resignation: '퇴사', title_change: '직위변경',
        };
        return {
          id: a.id,
          name: emp?.name ?? a.employee_id,
          type: typeLabels[a.type] ?? a.type,
          date: a.effective_date,
        };
      });
  }, [appointments, currentMonth, employees]);

  // ── 생일자 / 기념일 (Birthdays & Anniversaries) ──
  const birthdaysAndAnniversaries = useMemo(() => {
    const now = new Date();
    const cm = now.getMonth() + 1;
    const cy = now.getFullYear();
    const items: { id: string; name: string; icon: 'birthday' | 'anniversary'; detail: string }[] = [];
    for (const emp of activeEmployees) {
      if (emp.birth_date) {
        const bm = parseInt(emp.birth_date.split('-')[1], 10);
        if (bm === cm) {
          items.push({ id: `bd-${emp.id}`, name: emp.name, icon: 'birthday', detail: `${emp.birth_date.split('-')[2]}일` });
        }
      }
      const hm = parseInt(emp.hire_date.split('-')[1], 10);
      const hy = parseInt(emp.hire_date.split('-')[0], 10);
      if (hm === cm && hy < cy) {
        const years = cy - hy;
        items.push({ id: `an-${emp.id}`, name: emp.name, icon: 'anniversary', detail: `${years}주년` });
      }
    }
    return items.sort((a, b) => a.detail.localeCompare(b.detail));
  }, [activeEmployees]);

  // ── 월별 초과근무 현황 (Monthly Overtime Status) ──
  const overtimeData = useMemo(() => {
    const now = new Date();
    const months: { month: string; overtime: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = `${d.getMonth() + 1}월`;
      const total = attendanceRecords
        .filter((r) => r.date.startsWith(ym))
        .reduce((sum, r) => sum + (r.overtime_hours ?? 0), 0);
      months.push({ month: label, overtime: Math.round(total * 10) / 10 });
    }
    return months;
  }, [attendanceRecords]);

  // Recent events — appointments + leave requests, most recent 5
  const recentEvents = useMemo(() => {
    const events: { id: string; type: 'hire' | 'appointment' | 'leave' | 'birthday'; title: string; date: string; description: string }[] = [];

    // From appointments (sorted desc, take recent)
    const sortedAppts = [...appointments].sort((a, b) => b.effective_date.localeCompare(a.effective_date));
    for (const a of sortedAppts.slice(0, 15)) {
      const emp = activeEmployees.find((e) => e.id === a.employee_id) ??
        employees.find((e) => e.id === a.employee_id);
      const empName = emp?.name ?? a.employee_id;
      const empDeptName = emp?.department_id ? departments.find((d) => d.id === emp.department_id)?.name ?? '' : '';
      if (a.type === 'hire') {
        events.push({ id: a.id, type: 'hire', title: `${empName} 입사`, date: a.effective_date, description: empDeptName });
      } else if (a.type === 'promotion') {
        const newRank = positionRanks.find((r) => r.id === a.new_position_rank_id)?.name ?? '';
        events.push({ id: a.id, type: 'appointment', title: `${empName} → ${newRank} 승진`, date: a.effective_date, description: empDeptName });
      } else if (a.type === 'transfer') {
        const newDept = departments.find((d) => d.id === a.new_department_id)?.name ?? '';
        events.push({ id: a.id, type: 'appointment', title: `${empName} ${newDept} 전보`, date: a.effective_date, description: '' });
      } else if (a.type === 'resignation') {
        events.push({ id: a.id, type: 'appointment', title: `${empName} 퇴사`, date: a.effective_date, description: a.reason ?? '' });
      }
    }

    // From leave requests (approved, recent)
    for (const lr of leaveRequests.filter((r) => r.status === 'approved').slice(0, 5)) {
      const emp = activeEmployees.find((e) => e.id === lr.employee_id);
      events.push({
        id: lr.id, type: 'leave',
        title: `${emp?.name ?? lr.employee_id} 연차 사용`,
        date: lr.start_date,
        description: lr.start_date === lr.end_date ? lr.start_date : `${lr.start_date} ~ ${lr.end_date}`,
      });
    }

    // Sort desc by date and take 5
    return events.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  }, [appointments, leaveRequests, activeEmployees, employees, departments, positionRanks]);

  return (
    <div>
      <Breadcrumb />
      <h1 className="text-2xl font-bold mb-6">대시보드</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        {statsData.map((stat) => (
          <StatsCard key={stat.title} {...stat} />
        ))}
      </div>

      {/* ── 금일 근태 집계 ── */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            금일 근태 집계
            <Badge variant="outline" className="ml-2 font-normal">{today}</Badge>
          </CardTitle>
          <Link href="/attendance">
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
              상세보기
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-7 mb-4">
            <div className="rounded-lg border p-3 text-center">
              <Users className="h-4 w-4 mx-auto mb-1 text-blue-500" />
              <p className="text-xs text-muted-foreground">대상 인원</p>
              <p className="text-lg font-bold">{todayAttendanceSummary.total}</p>
            </div>
            <div className="rounded-lg border p-3 text-center bg-green-50">
              <Clock className="h-4 w-4 mx-auto mb-1 text-green-600" />
              <p className="text-xs text-muted-foreground">정상 출근</p>
              <p className="text-lg font-bold text-green-600">{todayAttendanceSummary.normalCount}</p>
            </div>
            <div className="rounded-lg border p-3 text-center bg-red-50">
              <AlertTriangle className="h-4 w-4 mx-auto mb-1 text-red-600" />
              <p className="text-xs text-muted-foreground">지각</p>
              <p className="text-lg font-bold text-red-600">{todayAttendanceSummary.lateCount}</p>
            </div>
            <div className="rounded-lg border p-3 text-center bg-orange-50">
              <LogOut className="h-4 w-4 mx-auto mb-1 text-orange-600" />
              <p className="text-xs text-muted-foreground">조퇴</p>
              <p className="text-lg font-bold text-orange-600">{todayAttendanceSummary.earlyLeaveCount}</p>
            </div>
            <div className="rounded-lg border p-3 text-center bg-amber-50">
              <TimerOff className="h-4 w-4 mx-auto mb-1 text-amber-600" />
              <p className="text-xs text-muted-foreground">반차/반반차</p>
              <p className="text-lg font-bold text-amber-600">{todayAttendanceSummary.halfDayCount}</p>
            </div>
            <div className="rounded-lg border p-3 text-center bg-yellow-50">
              <Timer className="h-4 w-4 mx-auto mb-1 text-yellow-600" />
              <p className="text-xs text-muted-foreground">퇴근 미타각</p>
              <p className="text-lg font-bold text-yellow-600">{todayAttendanceSummary.missingClockOut}</p>
            </div>
            <div className="rounded-lg border p-3 text-center bg-gray-50">
              <UserX className="h-4 w-4 mx-auto mb-1 text-gray-600" />
              <p className="text-xs text-muted-foreground">미출근</p>
              <p className="text-lg font-bold">{todayAttendanceSummary.noClockIn}</p>
            </div>
          </div>

          {/* 출근율 진행바 */}
          <div className="mb-4">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-muted-foreground">출근율</span>
              <span className="font-medium">
                {todayAttendanceSummary.totalRecorded} / {todayAttendanceSummary.total}명 ({attendanceRate}%)
              </span>
            </div>
            <Progress value={attendanceRate} className="h-2" />
          </div>

          {/* 지각자 / 미타각자 명단 */}
          {(lateEmployees.length > 0 || missingClockOutEmployees.length > 0) && (
            <div className="grid gap-4 md:grid-cols-2 mt-4 pt-4 border-t">
              {lateEmployees.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-red-600 mb-2 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    지각자 ({lateEmployees.length}명)
                  </p>
                  <div className="space-y-1 max-h-40 overflow-auto">
                    {lateEmployees.map((emp) => (
                      <div key={emp.id} className="flex items-center justify-between text-xs px-2 py-1 rounded bg-red-50/50">
                        <span className="font-medium">{emp.name}</span>
                        <span className="text-muted-foreground">{emp.dept}</span>
                        <span className="font-mono text-red-600">
                          {emp.clockIn ? new Date(emp.clockIn).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {missingClockOutEmployees.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-yellow-600 mb-2 flex items-center gap-1">
                    <Timer className="h-3 w-3" />
                    퇴근 미타각자 ({missingClockOutEmployees.length}명)
                  </p>
                  <div className="space-y-1 max-h-40 overflow-auto">
                    {missingClockOutEmployees.map((emp) => (
                      <div key={emp.id} className="flex items-center justify-between text-xs px-2 py-1 rounded bg-yellow-50/50">
                        <span className="font-medium">{emp.name}</span>
                        <span className="text-muted-foreground">{emp.dept}</span>
                        <span className="font-mono text-yellow-700">출근만</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <HeadcountChart data={headcountData} />
        <HireResignChart data={hireResignData} />
      </div>

      <div className="grid gap-4 md:grid-cols-1 mb-6">
        <RecentEvents events={recentEvents} />
      </div>

      {/* ── 직급별 인력 분포 + 근속연수 분포 ── */}
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">직급별 인력 분포</CardTitle>
          </CardHeader>
          <CardContent>
            {positionRankDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={positionRankDistribution}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, value }) => `${name} ${value}명`}
                    labelLine
                  >
                    {positionRankDistribution.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value}명`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-10">데이터가 없습니다.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">근속연수 분포</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={tenureDistribution} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="label" width={80} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => `${value}명`} />
                <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} name="인원" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ── 휴가 소진율 + 월별 초과근무 현황 ── */}
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">휴가 소진율</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {leaveUsageByDept.length > 0 ? (
              leaveUsageByDept.map((d) => (
                <div key={d.department}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{d.department}</span>
                    <span className="font-medium">{d.rate}%</span>
                  </div>
                  <Progress value={d.rate} className="h-2" />
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-10">데이터가 없습니다.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">월별 초과근무 현황</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={overtimeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => `${value}시간`} />
                <Legend />
                <Bar dataKey="overtime" fill="#f59e0b" radius={[4, 4, 0, 0]} name="초과근무(시간)" />
                <ReferenceLine y={52} stroke="#ef4444" strokeDasharray="4 4" label={{ value: '52h 기준', position: 'right', fill: '#ef4444', fontSize: 11 }} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ── 금월 인사발령 예정 + 생일자/기념일 ── */}
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">금월 인사발령 예정</CardTitle>
          </CardHeader>
          <CardContent>
            {thisMonthAppointments.length > 0 ? (
              <ul className="space-y-3">
                {thisMonthAppointments.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 text-sm">
                    <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="font-medium">{a.name}</span>
                    <Badge variant="secondary" className="text-xs">{a.type}</Badge>
                    <span className="ml-auto text-muted-foreground">{a.date}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-10">이번 달 예정된 인사발령이 없습니다.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">생일자 / 기념일</CardTitle>
          </CardHeader>
          <CardContent>
            {birthdaysAndAnniversaries.length > 0 ? (
              <ul className="space-y-3">
                {birthdaysAndAnniversaries.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 text-sm">
                    {item.icon === 'birthday' ? (
                      <Cake className="h-4 w-4 text-pink-500 shrink-0" />
                    ) : (
                      <PartyPopper className="h-4 w-4 text-amber-500 shrink-0" />
                    )}
                    <span className="font-medium">{item.name}</span>
                    <Badge variant={item.icon === 'birthday' ? 'default' : 'outline'} className="text-xs">
                      {item.icon === 'birthday' ? '생일' : '입사기념일'}
                    </Badge>
                    <span className="ml-auto text-muted-foreground">{item.detail}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-10">이번 달 해당자가 없습니다.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
