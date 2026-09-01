'use client';

import { useState, useMemo, Fragment } from 'react';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { useAttendanceStore } from '@/lib/stores/attendance-store';
import { useEmployeeStore } from '@/lib/stores/employee-store';
import { useLeaveStore } from '@/lib/stores/leave-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useSettingsStore } from '@/lib/stores/settings-store';
import { useCodeMap, CODE } from '@/lib/hooks/use-code';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Clock,
  AlertTriangle,
  UserX,
  CalendarDays,
  Timer,
  Lock,
  LockOpen,
  CheckCircle,
  Search,
  Download,
  Users,
  TrendingDown,
  Palmtree,
  TimerOff,
  Pencil,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useAttendanceModificationStore } from '@/lib/stores/attendance-modification-store';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

export default function AttendanceAdminPage() {
  const ATTENDANCE_STATUS = useCodeMap(CODE.ATTENDANCE_STATUS);
  const LEAVE_TIME_PERIODS = useCodeMap(CODE.LEAVE_TIME_PERIODS);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [deptFilter, setDeptFilter] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [expandedEmpId, setExpandedEmpId] = useState<string | null>(null);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [closeNote, setCloseNote] = useState('');

  const records = useAttendanceStore((s) => s.records);
  const closeMonth = useAttendanceStore((s) => s.closeMonth);
  const reopenMonth = useAttendanceStore((s) => s.reopenMonth);
  const getCloseout = useAttendanceStore((s) => s.getCloseout);
  const employees = useEmployeeStore((s) => s.employees);
  const departments = useEmployeeStore((s) => s.departments);
  const positionRanks = useEmployeeStore((s) => s.positionRanks);
  const leaveRequests = useLeaveStore((s) => s.leaveRequests);
  const leaveTypes = useLeaveStore((s) => s.leaveTypes);
  const leaveBalances = useLeaveStore((s) => s.leaveBalances);
  const session = useAuthStore((s) => s.session);
  const work = useSettingsStore((s) => s.work);
  const updateRecord = useAttendanceStore((s) => s.updateRecord);
  const allModifications = useAttendanceModificationStore((s) => s.modifications);
  const reviewModification = useAttendanceModificationStore((s) => s.reviewModification);

  const pendingModifications = useMemo(
    () => allModifications.filter((m) => m.status === 'pending').sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [allModifications],
  );
  const reviewedModifications = useMemo(
    () => allModifications.filter((m) => m.status !== 'pending').sort((a, b) => (b.reviewed_at ?? '').localeCompare(a.reviewed_at ?? '')),
    [allModifications],
  );

  const handleApproveModification = (m: typeof allModifications[0]) => {
    if (window.confirm('이 근태수정 요청을 승인하시겠습니까? 승인하면 근태에 즉시 반영됩니다.')) {
      reviewModification(m.id, 'approved', session?.employee_id ?? '', session?.user_name ?? '관리자');
      // 실제 근태에 반영
      updateRecord(m.attendance_id, {
        clock_in: m.after.clock_in,
        clock_out: m.after.clock_out,
        work_hours: m.after.work_hours,
        status: m.after.status as never,
        note: m.after.note,
      });
      toast.success('근태수정이 승인되었습니다.');
    }
  };
  const handleRejectModification = (m: typeof allModifications[0]) => {
    const reason = window.prompt('반려 사유를 입력하세요:');
    if (reason) {
      reviewModification(m.id, 'rejected', session?.employee_id ?? '', session?.user_name ?? '관리자', reason);
      toast.success('근태수정이 반려되었습니다.');
    }
  };

  const closeout = getCloseout(year, month);
  const isClosed = !!closeout;

  const prevMonth = () => { if (month === 1) { setYear(year - 1); setMonth(12); } else setMonth(month - 1); };
  const nextMonth = () => { if (month === 12) { setYear(year + 1); setMonth(1); } else setMonth(month + 1); };

  const activeDepartments = useMemo(
    () => departments.filter((d) => d.is_active).sort((a, b) => a.sort_order - b.sort_order),
    [departments],
  );

  // All active employees, filtered
  const activeEmployees = useMemo(
    () => employees
      .filter((e) => e.status === 'active')
      .map((e) => ({
        ...e,
        department: departments.find((d) => d.id === e.department_id),
        position_rank: positionRanks.find((r) => r.id === e.position_rank_id),
      }))
      .filter((e) => {
        if (deptFilter !== 'all' && e.department_id !== deptFilter) return false;
        if (searchText) {
          const q = searchText.toLowerCase();
          return e.name.toLowerCase().includes(q) || e.employee_number.toLowerCase().includes(q);
        }
        return true;
      })
      .sort((a, b) => a.employee_number.localeCompare(b.employee_number)),
    [employees, departments, positionRanks, deptFilter, searchText],
  );

  // Per-employee monthly stats
  const employeeStats = useMemo(() => {
    return activeEmployees.map((emp) => {
      const empRecords = records.filter((r) => {
        if (r.employee_id !== emp.id) return false;
        const d = new Date(r.date);
        return d.getFullYear() === year && d.getMonth() + 1 === month;
      });
      const workDays = empRecords.filter((r) => !['holiday', 'leave'].includes(r.status)).length;
      const lateDays = empRecords.filter((r) => r.status === 'late').length;
      const earlyLeaveDays = empRecords.filter((r) => r.status === 'early_leave').length;
      const absentDays = empRecords.filter((r) => r.status === 'absent').length;
      const halfDays = empRecords.filter((r) => r.status === 'half_day').length;
      const quarterDays = empRecords.filter((r) => r.status === 'quarter_day').length;
      const leaveDays = empRecords.filter((r) => r.status === 'leave').length;
      const totalWorkHours = empRecords.reduce((s, r) => s + (r.work_hours ?? 0), 0);
      const overtimeHours = empRecords.reduce((s, r) => s + (r.overtime_hours ?? 0), 0);
      // 야간 근로 (22:00~06:00) - 출퇴근 시간으로 추정
      const nightHours = empRecords.reduce((sum, r) => {
        if (!r.clock_in || !r.clock_out) return sum;
        const inTime = new Date(r.clock_in);
        const outTime = new Date(r.clock_out);
        const inHour = inTime.getHours();
        const outHour = outTime.getHours();
        let night = 0;
        if (outHour >= 22 || outHour < 6) {
          // 22시 이후 퇴근 -> 22시 이후 시간 합산
          if (outHour >= 22) night += (outHour - 22) + outTime.getMinutes() / 60;
          else night += 2 + outHour + outTime.getMinutes() / 60; // 자정 넘긴 경우
        }
        if (inHour < 6) {
          night += 6 - inHour - inTime.getMinutes() / 60;
        }
        return sum + Math.max(0, night);
      }, 0);
      // 휴일 근로 (토/일 출근)
      const holidayHours = empRecords.reduce((sum, r) => {
        const d = new Date(r.date);
        if ((d.getDay() === 0 || d.getDay() === 6) && r.work_hours) {
          return sum + r.work_hours;
        }
        return sum;
      }, 0);
      // 소정근로 = 총근로 - 연장 - 휴일
      const regularHours = Math.max(0, totalWorkHours - overtimeHours - holidayHours);

      // 주별 52시간 초과 주 수 계산
      const weeklyHoursMap = new Map<string, number>();
      for (const r of empRecords) {
        if (!r.work_hours) continue;
        const d = new Date(r.date);
        const dow = d.getDay();
        const monday = new Date(d);
        monday.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
        const wk = monday.toISOString().split('T')[0];
        weeklyHoursMap.set(wk, (weeklyHoursMap.get(wk) ?? 0) + r.work_hours);
      }
      const over52WeekCount = Array.from(weeklyHoursMap.values()).filter((h) => h > 52).length;

      // Leave requests for this month
      const empLeaves = leaveRequests.filter((lr) => {
        if (lr.employee_id !== emp.id) return false;
        if (lr.status !== 'approved' && lr.status !== 'pending') return false;
        const sd = new Date(lr.start_date);
        return sd.getFullYear() === year && sd.getMonth() + 1 === month;
      });

      // Annual leave balance
      const annualBalance = leaveBalances.find(
        (b) => b.employee_id === emp.id && b.year === year && b.leave_type_id === leaveTypes.find((lt) => lt.code === 'annual')?.id,
      );

      return {
        ...emp,
        records: empRecords,
        workDays,
        lateDays,
        earlyLeaveDays,
        absentDays,
        halfDays,
        quarterDays,
        leaveDays,
        totalWorkHours: Math.round(totalWorkHours * 10) / 10,
        overtimeHours: Math.round(overtimeHours * 10) / 10,
        regularHours: Math.round(regularHours * 10) / 10,
        nightHours: Math.round(nightHours * 10) / 10,
        holidayHours: Math.round(holidayHours * 10) / 10,
        over52WeekCount,
        leaveRequests: empLeaves,
        annualTotal: annualBalance?.total_days ?? 0,
        annualUsed: annualBalance?.used_days ?? 0,
        annualRemaining: annualBalance?.remaining_days ?? 0,
      };
    });
  }, [activeEmployees, records, leaveRequests, leaveBalances, leaveTypes, year, month]);

  // Summary totals
  const summary = useMemo(() => {
    const total = employeeStats.length;
    const withRecords = employeeStats.filter((e) => e.workDays > 0).length;
    const lateTotal = employeeStats.reduce((s, e) => s + e.lateDays, 0);
    const latePersons = employeeStats.filter((e) => e.lateDays > 0).length;
    const absentTotal = employeeStats.reduce((s, e) => s + e.absentDays, 0);
    const absentPersons = employeeStats.filter((e) => e.absentDays > 0).length;
    const earlyLeaveTotal = employeeStats.reduce((s, e) => s + e.earlyLeaveDays, 0);
    const halfDayTotal = employeeStats.reduce((s, e) => s + e.halfDays, 0);
    const quarterDayTotal = employeeStats.reduce((s, e) => s + e.quarterDays, 0);
    const leaveTotal = employeeStats.reduce((s, e) => s + e.leaveDays, 0);
    const overtimeTotal = employeeStats.reduce((s, e) => s + e.overtimeHours, 0);
    return { total, withRecords, lateTotal, latePersons, absentTotal, absentPersons, earlyLeaveTotal, halfDayTotal, quarterDayTotal, leaveTotal, overtimeTotal: Math.round(overtimeTotal * 10) / 10 };
  }, [employeeStats]);

  // Late employees list
  const lateEmployees = useMemo(
    () => employeeStats.filter((e) => e.lateDays > 0).sort((a, b) => b.lateDays - a.lateDays),
    [employeeStats],
  );

  // Leave usage ranking
  const leaveRanking = useMemo(
    () => employeeStats.filter((e) => e.annualUsed > 0).sort((a, b) => b.annualUsed - a.annualUsed),
    [employeeStats],
  );

  const handleCloseMonth = () => {
    closeMonth(year, month, session?.employee_id ?? 'admin', session?.user_name ?? '관리자', closeNote || undefined);
    setCloseDialogOpen(false);
    setCloseNote('');
    toast.success(`${year}년 ${month}월 근태가 마감되었습니다.`);
  };

  const handleReopenMonth = () => {
    if (window.confirm(`${year}년 ${month}월 근태 마감을 취소하시겠습니까?`)) {
      reopenMonth(year, month);
      toast.success('근태 마감이 취소되었습니다.');
    }
  };

  return (
    <div>
      <Breadcrumb />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">근태 마감 관리</h1>
        <div className="flex gap-2">
          <Link href="/attendance">
            <Button variant="outline"><Clock className="h-4 w-4 mr-2" />일일 근태</Button>
          </Link>
        </div>
      </div>

      {/* Period selector & status */}
      <Card className="mb-6">
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" onClick={prevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-lg font-bold w-32 text-center">{year}년 {String(month).padStart(2, '0')}월</span>
              <Button variant="outline" size="icon" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-3">
              {isClosed ? (
                <>
                  <Badge variant="default" className="bg-green-600 text-sm px-3 py-1">
                    <Lock className="h-3 w-3 mr-1" />
                    마감 완료
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {closeout.closed_by_name} · {new Date(closeout.closed_at).toLocaleDateString('ko-KR')}
                  </span>
                  <Button variant="outline" size="sm" onClick={handleReopenMonth}>
                    <LockOpen className="h-3 w-3 mr-1" />마감 취소
                  </Button>
                </>
              ) : (
                <Button onClick={() => setCloseDialogOpen(true)}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {month}월 근태 마감
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-6 mb-6">
        {[
          { label: '대상 인원', value: `${summary.total}명`, sub: `기록: ${summary.withRecords}명`, icon: Users, color: 'bg-accent-blue-subtle text-accent-blue' },
          { label: '지각', value: `${summary.lateTotal}건`, sub: `${summary.latePersons}명`, icon: AlertTriangle, color: 'bg-red-100 text-red-600' },
          { label: '결근', value: `${summary.absentTotal}건`, sub: `${summary.absentPersons}명`, icon: UserX, color: 'bg-red-100 text-red-600' },
          { label: '조퇴', value: `${summary.earlyLeaveTotal}건`, sub: '', icon: TrendingDown, color: 'bg-accent-amber-subtle text-accent-amber' },
          { label: '반차/반반차', value: `${summary.halfDayTotal + summary.quarterDayTotal}건`, sub: `반차${summary.halfDayTotal} 반반차${summary.quarterDayTotal}`, icon: TimerOff, color: 'bg-orange-100 text-orange-600' },
          { label: '연장근무', value: `${summary.overtimeTotal}h`, sub: '', icon: Timer, color: 'bg-accent-purple-subtle text-accent-purple' },
        ].map(({ label, value, sub, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground">{label}</p>
                <div className={`p-1.5 rounded-lg ${color}`}><Icon className="h-3.5 w-3.5" /></div>
              </div>
              <p className="text-xl font-bold">{value}</p>
              {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all">
        <TabsList className="mb-4">
          <TabsTrigger value="all">전체 현황</TabsTrigger>
          <TabsTrigger value="late" className="gap-1">
            <AlertTriangle className="h-3.5 w-3.5" />
            지각자 ({summary.latePersons})
          </TabsTrigger>
          <TabsTrigger value="leave" className="gap-1">
            <Palmtree className="h-3.5 w-3.5" />
            연차 현황
          </TabsTrigger>
          <TabsTrigger value="modifications" className="gap-1">
            <Pencil className="h-3.5 w-3.5" />
            근태수정 결재 ({pendingModifications.length})
          </TabsTrigger>
          <TabsTrigger value="hours" className="gap-1">
            <Timer className="h-3.5 w-3.5" />
            근로시간 집계
          </TabsTrigger>
        </TabsList>

        {/* ===== 전체 현황 ===== */}
        <TabsContent value="all">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9 w-[220px]" placeholder="이름/사번 검색" value={searchText} onChange={(e) => setSearchText(e.target.value)} />
            </div>
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="전체 부서" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 부서</SelectItem>
                {activeDepartments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground ml-auto">{employeeStats.length}명</span>
          </div>

          <Card>
            <CardContent className="pt-4">
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[36px]"></TableHead>
                      <TableHead>사번</TableHead>
                      <TableHead>이름</TableHead>
                      <TableHead>부서</TableHead>
                      <TableHead className="text-center">근무일</TableHead>
                      <TableHead className="text-center">지각</TableHead>
                      <TableHead className="text-center">조퇴</TableHead>
                      <TableHead className="text-center">결근</TableHead>
                      <TableHead className="text-center">반차</TableHead>
                      <TableHead className="text-center">휴가</TableHead>
                      <TableHead className="text-center">근무(h)</TableHead>
                      <TableHead className="text-center">연장(h)</TableHead>
                      <TableHead className="text-center">연차잔여</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employeeStats.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={13} className="text-center py-8 text-muted-foreground">해당 조건의 직원이 없습니다.</TableCell>
                      </TableRow>
                    ) : employeeStats.map((emp) => {
                      const isExpanded = expandedEmpId === emp.id;
                      return (
                        <Fragment key={emp.id}>
                          <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => setExpandedEmpId(isExpanded ? null : emp.id)}>
                            <TableCell className="px-2">
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </TableCell>
                            <TableCell className="font-mono text-xs">{emp.employee_number}</TableCell>
                            <TableCell className="font-medium">{emp.name}</TableCell>
                            <TableCell className="text-sm">{emp.department?.name ?? '-'}</TableCell>
                            <TableCell className="text-center text-sm">{emp.workDays}</TableCell>
                            <TableCell className="text-center">
                              {emp.lateDays > 0 ? <Badge variant="destructive" className="text-xs">{emp.lateDays}</Badge> : <span className="text-muted-foreground">0</span>}
                            </TableCell>
                            <TableCell className="text-center">
                              {emp.earlyLeaveDays > 0 ? <Badge variant="secondary" className="text-xs">{emp.earlyLeaveDays}</Badge> : <span className="text-muted-foreground">0</span>}
                            </TableCell>
                            <TableCell className="text-center">
                              {emp.absentDays > 0 ? <Badge variant="destructive" className="text-xs">{emp.absentDays}</Badge> : <span className="text-muted-foreground">0</span>}
                            </TableCell>
                            <TableCell className="text-center">
                              {(emp.halfDays + emp.quarterDays) > 0 ? <Badge variant="secondary" className="text-xs">{emp.halfDays + emp.quarterDays}</Badge> : <span className="text-muted-foreground">0</span>}
                            </TableCell>
                            <TableCell className="text-center text-sm">{emp.leaveDays}</TableCell>
                            <TableCell className="text-center text-sm font-mono">{emp.totalWorkHours}</TableCell>
                            <TableCell className="text-center text-sm font-mono">
                              {emp.overtimeHours > 0 ? <span className="text-accent-purple font-bold">{emp.overtimeHours}</span> : '0'}
                            </TableCell>
                            <TableCell className="text-center text-sm">
                              {emp.annualTotal > 0 ? (
                                <span className={emp.annualRemaining <= 3 ? 'text-destructive font-bold' : ''}>
                                  {emp.annualRemaining}/{emp.annualTotal}
                                </span>
                              ) : '-'}
                            </TableCell>
                          </TableRow>

                          {isExpanded && (
                            <TableRow>
                              <TableCell colSpan={13} className="bg-muted/30 p-4">
                                <div className="grid gap-4 md:grid-cols-2">
                                  {/* Daily records */}
                                  <div>
                                    <h4 className="text-sm font-semibold mb-2">일별 근태 기록</h4>
                                    <div className="border rounded-lg bg-background max-h-[300px] overflow-auto">
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead>날짜</TableHead>
                                            <TableHead>출근</TableHead>
                                            <TableHead>퇴근</TableHead>
                                            <TableHead>근무(h)</TableHead>
                                            <TableHead>상태</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {emp.records.sort((a, b) => a.date.localeCompare(b.date)).map((r) => (
                                            <TableRow key={r.id}>
                                              <TableCell className="text-xs font-mono">{r.date}</TableCell>
                                              <TableCell className="text-xs">{r.clock_in ? new Date(r.clock_in).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '-'}</TableCell>
                                              <TableCell className="text-xs">{r.clock_out ? new Date(r.clock_out).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '-'}</TableCell>
                                              <TableCell className="text-xs font-mono">{r.work_hours?.toFixed(1) ?? '-'}</TableCell>
                                              <TableCell>
                                                <div className="flex gap-1">
                                                  <Badge variant={r.status === 'late' || r.status === 'absent' ? 'destructive' : r.status === 'normal' ? 'default' : 'secondary'} className="text-[10px]">
                                                    {ATTENDANCE_STATUS[r.status] ?? r.status}
                                                  </Badge>
                                                  {r.leave_time_period && (
                                                    <Badge variant="outline" className="text-[10px]">
                                                      {LEAVE_TIME_PERIODS[r.leave_time_period] ?? r.leave_time_period}
                                                    </Badge>
                                                  )}
                                                </div>
                                              </TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  </div>

                                  {/* Leave requests & summary */}
                                  <div className="space-y-4">
                                    <div>
                                      <h4 className="text-sm font-semibold mb-2">이번달 휴가 신청</h4>
                                      {emp.leaveRequests.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">휴가 신청 내역 없음</p>
                                      ) : (
                                        <div className="border rounded-lg bg-background">
                                          <Table>
                                            <TableHeader>
                                              <TableRow>
                                                <TableHead>유형</TableHead>
                                                <TableHead>기간</TableHead>
                                                <TableHead>일수</TableHead>
                                                <TableHead>상태</TableHead>
                                              </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                              {emp.leaveRequests.map((lr) => {
                                                const lt = leaveTypes.find((t) => t.id === lr.leave_type_id);
                                                return (
                                                  <TableRow key={lr.id}>
                                                    <TableCell className="text-xs">{lt?.name ?? '-'}</TableCell>
                                                    <TableCell className="text-xs font-mono">{lr.start_date === lr.end_date ? lr.start_date : `${lr.start_date}~${lr.end_date}`}</TableCell>
                                                    <TableCell className="text-xs">{lr.days}일</TableCell>
                                                    <TableCell>
                                                      <Badge variant={lr.status === 'approved' ? 'default' : lr.status === 'pending' ? 'secondary' : 'destructive'} className="text-[10px]">
                                                        {lr.status === 'approved' ? '승인' : lr.status === 'pending' ? '대기' : '반려'}
                                                      </Badge>
                                                    </TableCell>
                                                  </TableRow>
                                                );
                                              })}
                                            </TableBody>
                                          </Table>
                                        </div>
                                      )}
                                    </div>

                                    {/* Quick summary cards */}
                                    <div className="grid grid-cols-3 gap-2">
                                      <div className="rounded-lg border p-2 text-center">
                                        <p className="text-[10px] text-muted-foreground">근무일</p>
                                        <p className="text-lg font-bold">{emp.workDays}</p>
                                      </div>
                                      <div className="rounded-lg border p-2 text-center">
                                        <p className="text-[10px] text-muted-foreground">연장(h)</p>
                                        <p className="text-lg font-bold text-accent-purple">{emp.overtimeHours}</p>
                                      </div>
                                      <div className="rounded-lg border p-2 text-center">
                                        <p className="text-[10px] text-muted-foreground">연차잔여</p>
                                        <p className="text-lg font-bold">{emp.annualRemaining}/{emp.annualTotal}</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== 지각자 현황 ===== */}
        <TabsContent value="late">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {year}년 {month}월 지각자 현황 ({lateEmployees.length}명)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lateEmployees.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">이번달 지각자가 없습니다.</p>
              ) : (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>순위</TableHead>
                        <TableHead>사번</TableHead>
                        <TableHead>이름</TableHead>
                        <TableHead>부서</TableHead>
                        <TableHead>직급</TableHead>
                        <TableHead className="text-center">지각 횟수</TableHead>
                        <TableHead className="text-center">근무일</TableHead>
                        <TableHead className="text-center">지각율</TableHead>
                        <TableHead>지각 날짜</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lateEmployees.map((emp, i) => {
                        const lateRecords = emp.records.filter((r) => r.status === 'late');
                        const lateRate = emp.workDays > 0 ? Math.round((emp.lateDays / emp.workDays) * 100) : 0;
                        return (
                          <TableRow key={emp.id}>
                            <TableCell className="font-bold">{i + 1}</TableCell>
                            <TableCell className="font-mono text-xs">{emp.employee_number}</TableCell>
                            <TableCell className="font-medium">{emp.name}</TableCell>
                            <TableCell className="text-sm">{emp.department?.name ?? '-'}</TableCell>
                            <TableCell className="text-sm">{emp.position_rank?.name ?? '-'}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant="destructive" className="text-sm">{emp.lateDays}</Badge>
                            </TableCell>
                            <TableCell className="text-center text-sm">{emp.workDays}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant={lateRate >= 30 ? 'destructive' : 'secondary'} className="text-xs">{lateRate}%</Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {lateRecords.map((r) => r.date.slice(5)).join(', ')}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              {lateEmployees.length > 0 && (
                <div className="mt-4 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                  지각 유예시간: <strong>{work.late_grace_minutes}분</strong> (출근시간 이후 {work.late_grace_minutes}분까지 정상 인정)
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== 연차 현황 ===== */}
        <TabsContent value="leave">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{year}년 연차 사용 현황</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>사번</TableHead>
                      <TableHead>이름</TableHead>
                      <TableHead>부서</TableHead>
                      <TableHead className="text-center">총 연차</TableHead>
                      <TableHead className="text-center">사용</TableHead>
                      <TableHead className="text-center">잔여</TableHead>
                      <TableHead className="w-[200px]">사용률</TableHead>
                      <TableHead className="text-center">이번달 사용</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employeeStats
                      .filter((e) => e.annualTotal > 0)
                      .sort((a, b) => b.annualUsed - a.annualUsed)
                      .map((emp) => {
                        const useRate = emp.annualTotal > 0 ? Math.round((emp.annualUsed / emp.annualTotal) * 100) : 0;
                        const monthLeaves = emp.leaveRequests.filter((lr) => {
                          const lt = leaveTypes.find((t) => t.id === lr.leave_type_id);
                          return lt?.code === 'annual' && (lr.status === 'approved' || lr.status === 'pending');
                        });
                        const monthUsed = monthLeaves.reduce((s, lr) => s + lr.days, 0);
                        return (
                          <TableRow key={emp.id}>
                            <TableCell className="font-mono text-xs">{emp.employee_number}</TableCell>
                            <TableCell className="font-medium">{emp.name}</TableCell>
                            <TableCell className="text-sm">{emp.department?.name ?? '-'}</TableCell>
                            <TableCell className="text-center text-sm">{emp.annualTotal}</TableCell>
                            <TableCell className="text-center text-sm font-bold">{emp.annualUsed}</TableCell>
                            <TableCell className="text-center">
                              <span className={emp.annualRemaining <= 3 ? 'text-destructive font-bold' : 'font-bold'}>
                                {emp.annualRemaining}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress value={useRate} className="h-2 flex-1" />
                                <span className="text-xs text-muted-foreground w-8">{useRate}%</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center text-sm">
                              {monthUsed > 0 ? <Badge variant="secondary">{monthUsed}일</Badge> : '-'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== 근태수정 결재 ===== */}
        <TabsContent value="modifications">
          {/* 대기중 */}
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-base">결재 대기 중 ({pendingModifications.length}건)</CardTitle>
            </CardHeader>
            <CardContent>
              {pendingModifications.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">대기 중인 근태수정 요청이 없습니다.</p>
              ) : (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>요청일</TableHead>
                        <TableHead>신청자</TableHead>
                        <TableHead>대상 근태일</TableHead>
                        <TableHead>변경내용</TableHead>
                        <TableHead>사유</TableHead>
                        <TableHead className="text-right">결재</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingModifications.map((m) => {
                        const emp = employees.find((e) => e.id === m.employee_id);
                        const dept = emp ? departments.find((d) => d.id === emp.department_id) : null;
                        const att = records.find((r) => r.id === m.attendance_id);
                        return (
                          <TableRow key={m.id}>
                            <TableCell className="text-xs">{m.created_at.slice(0, 10)}</TableCell>
                            <TableCell className="text-sm font-medium">
                              {emp?.name ?? m.employee_id}
                              <p className="text-[10px] text-muted-foreground">{dept?.name}</p>
                            </TableCell>
                            <TableCell className="text-sm font-mono">{att?.date ?? '-'}</TableCell>
                            <TableCell className="text-xs">
                              {m.before.clock_in !== m.after.clock_in && (
                                <div>출근: {m.before.clock_in ? new Date(m.before.clock_in).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '-'} → <strong>{m.after.clock_in ? new Date(m.after.clock_in).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '-'}</strong></div>
                              )}
                              {m.before.clock_out !== m.after.clock_out && (
                                <div>퇴근: {m.before.clock_out ? new Date(m.before.clock_out).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '-'} → <strong>{m.after.clock_out ? new Date(m.after.clock_out).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '-'}</strong></div>
                              )}
                              {m.before.status !== m.after.status && (
                                <div>상태: {ATTENDANCE_STATUS[m.before.status] ?? m.before.status} → <strong>{ATTENDANCE_STATUS[m.after.status] ?? m.after.status}</strong></div>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[200px]">{m.reason}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-1 justify-end">
                                <Button size="sm" className="h-7 bg-green-600 hover:bg-green-700" onClick={() => handleApproveModification(m)}>
                                  <CheckCircle className="h-3 w-3 mr-1" />승인
                                </Button>
                                <Button size="sm" variant="destructive" className="h-7" onClick={() => handleRejectModification(m)}>
                                  <XCircle className="h-3 w-3 mr-1" />반려
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 처리 완료 */}
          {reviewedModifications.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base text-muted-foreground">처리 완료 ({reviewedModifications.length}건)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>처리일</TableHead>
                        <TableHead>신청자</TableHead>
                        <TableHead>대상 근태</TableHead>
                        <TableHead>변경 요약</TableHead>
                        <TableHead>처리</TableHead>
                        <TableHead>처리자/의견</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reviewedModifications.slice(0, 30).map((m) => {
                        const emp = employees.find((e) => e.id === m.employee_id);
                        const att = records.find((r) => r.id === m.attendance_id);
                        return (
                          <TableRow key={m.id}>
                            <TableCell className="text-xs">{m.reviewed_at?.slice(0, 10)}</TableCell>
                            <TableCell className="text-sm">{emp?.name ?? m.employee_id}</TableCell>
                            <TableCell className="text-sm font-mono">{att?.date ?? '-'}</TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{m.reason}</TableCell>
                            <TableCell>
                              <Badge variant={m.status === 'approved' ? 'default' : 'destructive'} className="text-xs">
                                {m.status === 'approved' ? '승인' : '반려'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs">
                              <p>{m.reviewed_by_name}</p>
                              {m.review_comment && (
                                <p className="text-muted-foreground italic">"{m.review_comment}"</p>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ===== 근로시간 집계 ===== */}
        <TabsContent value="hours">
          {(() => {
            // 부서별 근로시간 집계
            const byDept = new Map<string, { name: string; regular: number; overtime: number; night: number; holiday: number; count: number; over52: number }>();
            for (const e of employeeStats) {
              const deptId = e.department?.id ?? 'none';
              const deptName = e.department?.name ?? '미지정';
              if (!byDept.has(deptId)) {
                byDept.set(deptId, { name: deptName, regular: 0, overtime: 0, night: 0, holiday: 0, count: 0, over52: 0 });
              }
              const cur = byDept.get(deptId)!;
              cur.regular += e.regularHours;
              cur.overtime += e.overtimeHours;
              cur.night += e.nightHours;
              cur.holiday += e.holidayHours;
              cur.count++;
              cur.over52 += e.over52WeekCount;
            }
            const deptData = Array.from(byDept.values())
              .map((d) => ({
                name: d.name,
                count: d.count,
                regular: Math.round(d.regular * 10) / 10,
                overtime: Math.round(d.overtime * 10) / 10,
                night: Math.round(d.night * 10) / 10,
                holiday: Math.round(d.holiday * 10) / 10,
                over52: d.over52,
                avg: d.count > 0 ? Math.round((d.regular + d.overtime) / d.count * 10) / 10 : 0,
              }))
              .sort((a, b) => b.overtime - a.overtime);

            // 전체 합계
            const totalRegular = employeeStats.reduce((s, e) => s + e.regularHours, 0);
            const totalOvertime = employeeStats.reduce((s, e) => s + e.overtimeHours, 0);
            const totalNight = employeeStats.reduce((s, e) => s + e.nightHours, 0);
            const totalHoliday = employeeStats.reduce((s, e) => s + e.holidayHours, 0);

            // 주 52시간 초과자
            const over52Persons = employeeStats.filter((e) => e.over52WeekCount > 0).sort((a, b) => b.over52WeekCount - a.over52WeekCount);

            return (
              <>
                {/* 전체 집계 카드 */}
                <div className="grid gap-4 grid-cols-2 md:grid-cols-5 mb-6">
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-xs text-muted-foreground mb-1">소정근로</p>
                      <p className="text-xl font-bold text-blue-600">{Math.round(totalRegular)}h</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-xs text-muted-foreground mb-1">연장근로</p>
                      <p className="text-xl font-bold text-purple-600">{Math.round(totalOvertime)}h</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-xs text-muted-foreground mb-1">야간근로</p>
                      <p className="text-xl font-bold text-indigo-600">{Math.round(totalNight)}h</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-xs text-muted-foreground mb-1">휴일근로</p>
                      <p className="text-xl font-bold text-amber-600">{Math.round(totalHoliday)}h</p>
                    </CardContent>
                  </Card>
                  <Card className={over52Persons.length > 0 ? 'border-red-300 bg-red-50/50' : ''}>
                    <CardContent className="pt-4">
                      <p className="text-xs text-muted-foreground mb-1">주52h 초과자</p>
                      <p className={`text-xl font-bold ${over52Persons.length > 0 ? 'text-red-600' : ''}`}>
                        {over52Persons.length}명
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* 주52시간 초과자 알림 */}
                {over52Persons.length > 0 && (
                  <Card className="mb-6 border-red-300 bg-red-50/30">
                    <CardHeader>
                      <CardTitle className="text-base text-red-600 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        주 52시간 초과 경고 ({over52Persons.length}명)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="border rounded-lg bg-background">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>사번</TableHead>
                              <TableHead>이름</TableHead>
                              <TableHead>부서</TableHead>
                              <TableHead className="text-right">총 근무</TableHead>
                              <TableHead className="text-right">연장</TableHead>
                              <TableHead className="text-right">초과 주 수</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {over52Persons.map((emp) => (
                              <TableRow key={emp.id}>
                                <TableCell className="font-mono text-xs">{emp.employee_number}</TableCell>
                                <TableCell className="font-medium">{emp.name}</TableCell>
                                <TableCell className="text-sm">{emp.department?.name ?? '-'}</TableCell>
                                <TableCell className="text-right text-sm font-mono">{emp.totalWorkHours}h</TableCell>
                                <TableCell className="text-right text-sm font-mono text-purple-600">{emp.overtimeHours}h</TableCell>
                                <TableCell className="text-right">
                                  <Badge variant="destructive" className="text-xs">{emp.over52WeekCount}주</Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* 부서별 비교 차트 */}
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="text-base">부서별 근로시간 비교</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={deptData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis unit="h" tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v) => `${v as number}h`} />
                        <Legend />
                        <Bar dataKey="regular" stackId="a" fill="#3b82f6" name="소정근로" />
                        <Bar dataKey="overtime" stackId="a" fill="#8b5cf6" name="연장근로" />
                        <Bar dataKey="night" stackId="a" fill="#6366f1" name="야간근로" />
                        <Bar dataKey="holiday" stackId="a" fill="#f59e0b" name="휴일근로" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* 부서별 상세 테이블 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">부서별 상세 (월 합계)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>부서</TableHead>
                            <TableHead className="text-right">인원</TableHead>
                            <TableHead className="text-right">소정</TableHead>
                            <TableHead className="text-right">연장</TableHead>
                            <TableHead className="text-right">야간</TableHead>
                            <TableHead className="text-right">휴일</TableHead>
                            <TableHead className="text-right">1인 평균</TableHead>
                            <TableHead className="text-right">52h 초과</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {deptData.map((d) => (
                            <TableRow key={d.name}>
                              <TableCell className="font-medium">{d.name}</TableCell>
                              <TableCell className="text-right">{d.count}명</TableCell>
                              <TableCell className="text-right text-sm font-mono">{d.regular}h</TableCell>
                              <TableCell className="text-right text-sm font-mono text-purple-600">{d.overtime}h</TableCell>
                              <TableCell className="text-right text-sm font-mono">{d.night}h</TableCell>
                              <TableCell className="text-right text-sm font-mono text-amber-600">{d.holiday}h</TableCell>
                              <TableCell className="text-right text-sm font-mono font-bold">{d.avg}h</TableCell>
                              <TableCell className="text-right">
                                {d.over52 > 0 ? (
                                  <Badge variant="destructive" className="text-xs">{d.over52}건</Badge>
                                ) : (
                                  <span className="text-xs text-muted-foreground">-</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </>
            );
          })()}
        </TabsContent>
      </Tabs>

      {/* Close Month Dialog */}
      <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{year}년 {month}월 근태 마감</DialogTitle>
            <DialogDescription>
              마감 처리 후에는 해당 월의 근태 데이터 수정이 제한됩니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border p-3 text-center">
                <p className="text-xs text-muted-foreground">대상 인원</p>
                <p className="text-lg font-bold">{summary.total}명</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-xs text-muted-foreground">지각</p>
                <p className="text-lg font-bold text-destructive">{summary.lateTotal}건</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-xs text-muted-foreground">결근</p>
                <p className="text-lg font-bold text-destructive">{summary.absentTotal}건</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>마감 메모 (선택)</Label>
              <Textarea
                placeholder="마감 시 특이사항을 입력하세요"
                value={closeNote}
                onChange={(e) => setCloseNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseDialogOpen(false)}>취소</Button>
            <Button onClick={handleCloseMonth}>
              <Lock className="h-4 w-4 mr-2" />
              마감 확정
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
