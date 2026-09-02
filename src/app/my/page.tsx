'use client';

import { useMemo, useState, Fragment, useEffect } from 'react';
import { useAnnualLeaveTypeId } from '@/lib/hooks/use-employee-directory';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { useLeaveStore } from '@/lib/stores/leave-store';
import { usePayrollStore } from '@/lib/stores/payroll-store';
import { useEmployeeStore } from '@/lib/stores/employee-store';
import { useAttendanceStore } from '@/lib/stores/attendance-store';
import { useAppointmentStore } from '@/lib/stores/appointment-store';
import { useApprovalStore } from '@/lib/stores/approval-store';
import { useFlexScheduleStore } from '@/lib/stores/flex-schedule-store';
import { useAttendanceModificationStore } from '@/lib/stores/attendance-modification-store';
import { useLeavePlanStore } from '@/lib/stores/leave-plan-store';
import { useSettingsStore } from '@/lib/stores/settings-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useCodeMap, CODE } from '@/lib/hooks/use-code';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import {
  User,
  Briefcase,
  CalendarDays,
  Banknote,
  Clock,
  GraduationCap,
  ArrowRight,
  FileText,
  Award,
  LogIn,
  LogOut,
  Timer,
  Plus,
  ChevronDown,
  ChevronUp,
  DollarSign,
  TrendingDown,
  TrendingUp,
  FileCheck,
  Phone,
  Mail,
  MapPin,
  Heart,
  Building2,
  Cake,
  ClipboardList,
  Hash,
  CreditCard,
  Users,
  Pencil,
  Lock,
  EyeOff,
  Save,
  Trash2,
  Bell,
  Calendar,
  Globe,
  FolderOpen,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import LeaveRequestForm from '@/components/leave/leave-request-form';
import { EmployeeFilesTab } from '@/components/employee/employee-files-tab';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmtWon = (n: number) => new Intl.NumberFormat('ko-KR').format(n) + '원';

function getYearsMonths(hireDate: string): string {
  const hire = new Date(hireDate);
  const now = new Date();
  let years = now.getFullYear() - hire.getFullYear();
  let months = now.getMonth() - hire.getMonth();
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (years === 0) return `${months}개월`;
  if (months === 0) return `${years}년`;
  return `${years}년 ${months}개월`;
}

function generateTimeOptions(min: string, max: string, intervalMin = 30): string[] {
  const [minH, minM] = min.split(':').map(Number);
  const [maxH, maxM] = max.split(':').map(Number);
  const options: string[] = [];
  let cur = minH * 60 + minM;
  const end = maxH * 60 + maxM;
  while (cur <= end) {
    const h = Math.floor(cur / 60);
    const m = cur % 60;
    options.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    cur += intervalMin;
  }
  return options;
}

function calcEndTime(startTime: string, totalHours: number): string {
  const [h, m] = startTime.split(':').map(Number);
  const endMin = h * 60 + m + totalHours * 60;
  const eh = Math.floor(endMin / 60);
  const em = endMin % 60;
  return `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
}

const appointmentTypeVariant = (type: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (type) {
    case 'promotion': case 'hire': return 'default';
    case 'transfer': return 'secondary';
    case 'title_change': return 'outline';
    case 'resignation': return 'destructive';
    default: return 'outline';
  }
};

const leaveStatusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (status) {
    case 'approved': return 'default';
    case 'pending': return 'secondary';
    case 'rejected': return 'destructive';
    default: return 'outline';
  }
};

const payrollStatusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (status) {
    case 'paid': return 'default';
    case 'confirmed': return 'secondary';
    default: return 'outline';
  }
};

const attendanceStatusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (status) {
    case 'normal': return 'default';
    case 'late': case 'absent': return 'destructive';
    case 'early_leave': case 'half_day': case 'quarter_day': return 'secondary';
    default: return 'outline';
  }
};

const trainingStatusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (status) {
    case 'completed': return 'default';
    case 'in_progress': return 'secondary';
    case 'planned': return 'outline';
    default: return 'destructive';
  }
};

const gradeVariant = (grade: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (grade) {
    case 'S': case 'A': return 'default';
    case 'B': return 'secondary';
    case 'C': return 'outline';
    default: return 'destructive';
  }
};

// ---------------------------------------------------------------------------
// MyPayrollDetail sub-component
// ---------------------------------------------------------------------------

interface MyPayrollDetailProps {
  myPayrolls: import('@/types').SavedPayroll[];
  baseSalary: number;
  myId: string;
}

function MyPayrollDetail({ myPayrolls, baseSalary, myId }: MyPayrollDetailProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const payroll = useSettingsStore((s) => s.payroll);
  const PAYROLL_STATUS = useCodeMap(CODE.PAYROLL_STATUS);

  const latestPayroll = myPayrolls.length > 0 ? myPayrolls[0] : null;
  const latestEarnings = latestPayroll?.items.filter((i) => i.category === 'earning') ?? [];
  const latestDeductions = latestPayroll?.items.filter((i) => i.category === 'deduction') ?? [];

  // Monthly trend chart data
  const trendData = useMemo(() => {
    return [...myPayrolls]
      .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month)
      .map((p) => ({
        label: `${p.year}.${String(p.month).padStart(2, '0')}`,
        earnings: p.total_earnings,
        deductions: p.total_deductions,
        netPay: p.net_pay,
      }));
  }, [myPayrolls]);

  // Totals for period
  const periodTotal = useMemo(() => {
    const te = myPayrolls.reduce((s, p) => s + p.total_earnings, 0);
    const td = myPayrolls.reduce((s, p) => s + p.total_deductions, 0);
    return { earnings: te, deductions: td, netPay: te - td, months: myPayrolls.length };
  }, [myPayrolls]);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">기본급</CardTitle>
            <div className="p-2 rounded-lg bg-accent-blue-subtle text-accent-blue">
              <DollarSign className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{fmtWon(baseSalary)}</p>
            <p className="text-xs text-muted-foreground mt-1">월 통상시급: {fmtWon(Math.round(baseSalary / 209))}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">최근 실수령액</CardTitle>
            <div className="p-2 rounded-lg bg-accent-green-subtle text-accent-green">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{latestPayroll ? fmtWon(latestPayroll.net_pay) : '-'}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {latestPayroll ? `${latestPayroll.year}년 ${latestPayroll.month}월` : ''}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">최근 공제액</CardTitle>
            <div className="p-2 rounded-lg bg-red-100 text-red-600">
              <TrendingDown className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-destructive">{latestPayroll ? fmtWon(latestPayroll.total_deductions) : '-'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">누적 실수령</CardTitle>
            <div className="p-2 rounded-lg bg-accent-purple-subtle text-accent-purple">
              <Banknote className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{fmtWon(periodTotal.netPay)}</p>
            <p className="text-xs text-muted-foreground mt-1">{periodTotal.months}개월 합계</p>
          </CardContent>
        </Card>
      </div>

      {/* 원천징수부 버튼 */}
      <div className="flex justify-end">
        <Link href="/payroll/withholding-tax">
          <Button variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-1" />
            원천징수부 조회/출력
          </Button>
        </Link>
      </div>

      {/* Latest payroll detail breakdown */}
      {latestPayroll && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Earnings breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-accent-blue-subtle text-accent-blue">
                  <TrendingUp className="h-3.5 w-3.5" />
                </div>
                지급 항목 ({latestPayroll.year}년 {latestPayroll.month}월)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {latestEarnings.map((item) => (
                  <div key={item.item_id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.formula}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-mono font-semibold">{fmtWon(item.amount)}</p>
                      {!item.is_taxable && (
                        <Badge variant="outline" className="text-[10px] px-1">비과세</Badge>
                      )}
                    </div>
                  </div>
                ))}
                <Separator />
                <div className="flex items-center justify-between font-bold">
                  <span className="text-sm">총 지급액</span>
                  <span className="text-sm font-mono">{fmtWon(latestPayroll.total_earnings)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Deductions breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-red-100 text-red-600">
                  <TrendingDown className="h-3.5 w-3.5" />
                </div>
                공제 항목 ({latestPayroll.year}년 {latestPayroll.month}월)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {latestDeductions.map((item) => (
                  <div key={item.item_id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.formula}</p>
                    </div>
                    <p className="text-sm font-mono font-semibold text-destructive">-{fmtWon(item.amount)}</p>
                  </div>
                ))}
                <Separator />
                <div className="flex items-center justify-between font-bold">
                  <span className="text-sm">총 공제액</span>
                  <span className="text-sm font-mono text-destructive">-{fmtWon(latestPayroll.total_deductions)}</span>
                </div>
                <div className="flex items-center justify-between font-bold text-primary pt-2 border-t">
                  <span>실수령액</span>
                  <span className="font-mono text-lg">{fmtWon(latestPayroll.net_pay)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Insurance rates info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">4대보험 요율 안내</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            {[
              { label: '국민연금', rate: `${payroll.national_pension_rate}%`, desc: '근로자 부담분' },
              { label: '건강보험', rate: `${payroll.health_insurance_rate}%`, desc: '근로자 부담분' },
              { label: '장기요양보험', rate: `${payroll.long_term_care_rate}%`, desc: '건강보험의' },
              { label: '고용보험', rate: `${payroll.employment_insurance_rate}%`, desc: '근로자 부담분' },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="text-lg font-bold mt-1">{item.rate}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 grid gap-3 grid-cols-2">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">비과세 식대 한도</p>
              <p className="text-sm font-bold mt-1">{fmtWon(payroll.meal_allowance_limit)}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">비과세 교통비 한도</p>
              <p className="text-sm font-bold mt-1">{fmtWon(payroll.transport_allowance_limit)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly trend chart */}
      {trendData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">월별 급여 추이</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart data={trendData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => new Intl.NumberFormat('ko-KR', { notation: 'compact', maximumFractionDigits: 1 }).format(v)} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-background)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                      fontSize: '12px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    }}
                    cursor={{ fill: 'var(--color-muted)', opacity: 0.5 }}
                    formatter={(value) => fmtWon(value as number)}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="earnings" fill="var(--color-accent-blue)" radius={[4, 4, 0, 0]} name="지급액" />
                  <Bar dataKey="deductions" fill="var(--color-accent-amber)" radius={[4, 4, 0, 0]} name="공제액" />
                  <Bar dataKey="netPay" fill="var(--color-accent-green)" radius={[4, 4, 0, 0]} name="실수령" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payroll history with expandable rows */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">급여 내역</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead>기간</TableHead>
                  <TableHead className="text-right">기본급</TableHead>
                  <TableHead className="text-right">총 지급액</TableHead>
                  <TableHead className="text-right">총 공제액</TableHead>
                  <TableHead className="text-right">실수령액</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>명세서</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myPayrolls.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      급여 내역이 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  myPayrolls.map((p) => {
                    const isExpanded = expandedId === p.id;
                    const earnings = p.items.filter((i) => i.category === 'earning');
                    const deductions = p.items.filter((i) => i.category === 'deduction');
                    return (
                      <Fragment key={p.id}>
                        <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => toggleExpand(p.id)}>
                          <TableCell className="px-2">
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </TableCell>
                          <TableCell className="font-medium">
                            {p.year}년 {String(p.month).padStart(2, '0')}월
                          </TableCell>
                          <TableCell className="text-right text-sm font-mono">{fmtWon(p.base_salary)}</TableCell>
                          <TableCell className="text-right text-sm font-mono">{fmtWon(p.total_earnings)}</TableCell>
                          <TableCell className="text-right text-sm font-mono text-destructive">{fmtWon(p.total_deductions)}</TableCell>
                          <TableCell className="text-right text-sm font-mono font-bold">{fmtWon(p.net_pay)}</TableCell>
                          <TableCell>
                            <Badge variant={payrollStatusVariant(p.status)} className="text-xs">
                              {PAYROLL_STATUS[p.status as keyof typeof PAYROLL_STATUS] ?? p.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Link href={`/payroll/payslip/${p.id}`} onClick={(e) => e.stopPropagation()}>
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs">
                                보기
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow key={`${p.id}-detail`}>
                            <TableCell colSpan={8} className="bg-muted/30 p-4">
                              <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                  <p className="text-sm font-semibold mb-2">지급 항목</p>
                                  <div className="space-y-1.5">
                                    {earnings.map((item) => (
                                      <div key={item.item_id} className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">
                                          {item.name}
                                          {!item.is_taxable && <span className="text-xs ml-1 text-blue-500">(비과세)</span>}
                                        </span>
                                        <span className="font-mono">{fmtWon(item.amount)}</span>
                                      </div>
                                    ))}
                                    <Separator />
                                    <div className="flex justify-between text-sm font-bold">
                                      <span>합계</span>
                                      <span className="font-mono">{fmtWon(p.total_earnings)}</span>
                                    </div>
                                  </div>
                                </div>
                                <div>
                                  <p className="text-sm font-semibold mb-2">공제 항목</p>
                                  <div className="space-y-1.5">
                                    {deductions.map((item) => (
                                      <div key={item.item_id} className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">{item.name}</span>
                                        <span className="font-mono text-destructive">-{fmtWon(item.amount)}</span>
                                      </div>
                                    ))}
                                    <Separator />
                                    <div className="flex justify-between text-sm font-bold">
                                      <span>합계</span>
                                      <span className="font-mono text-destructive">-{fmtWon(p.total_deductions)}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function MyPage() {
  const annualTypeId = useAnnualLeaveTypeId();
  const LEAVE_REQUEST_STATUS = useCodeMap(CODE.LEAVE_REQUEST_STATUS);
  const PAYROLL_STATUS = useCodeMap(CODE.PAYROLL_STATUS);
  const APPOINTMENT_TYPES = useCodeMap(CODE.APPOINTMENT_TYPES);
  const ATTENDANCE_STATUS = useCodeMap(CODE.ATTENDANCE_STATUS);
  const TRAINING_STATUS = useCodeMap(CODE.TRAINING_STATUS);
  const LEAVE_TIME_PERIODS = useCodeMap(CODE.LEAVE_TIME_PERIODS);
  const APPROVAL_STATUS = useCodeMap(CODE.APPROVAL_STATUS);
  const DEGREE_LABELS = useCodeMap(CODE.DEGREE_LABELS);
  const EMPLOYMENT_TYPES = useCodeMap(CODE.EMPLOYMENT_TYPES);

  const session = useAuthStore((s) => s.session);
  const MY_ID = session?.employee_id ?? '';

  const employees = useEmployeeStore((s) => s.employees);
  const departments = useEmployeeStore((s) => s.departments);
  const positionRanks = useEmployeeStore((s) => s.positionRanks);
  const positionTitles = useEmployeeStore((s) => s.positionTitles);
  const careerHistories = useEmployeeStore((s) => s.careerHistories);
  const educationHistories = useEmployeeStore((s) => s.educationHistories);
  const certifications = useEmployeeStore((s) => s.certifications);
  const familyMembers = useEmployeeStore((s) => s.familyMembers);
  const updateEmployee = useEmployeeStore((s) => s.updateEmployee);
  const addFamilyMember = useEmployeeStore((s) => s.addFamilyMember);
  const updateFamilyMember = useEmployeeStore((s) => s.updateFamilyMember);
  const deleteFamilyMember = useEmployeeStore((s) => s.deleteFamilyMember);
  const work = useSettingsStore((s) => s.work);
  const workplaces = useSettingsStore((s) => s.workplaces);
  const workSchedules = useSettingsStore((s) => s.workSchedules);
  const getActiveAssignment = useFlexScheduleStore((s) => s.getActiveAssignment);
  const addModification = useAttendanceModificationStore((s) => s.addModification);
  const getModByAttendance = useAttendanceModificationStore((s) => s.getByAttendance);
  const getModByEmployee = useAttendanceModificationStore((s) => s.getByEmployee);
  const getCloseout = useAttendanceStore((s) => s.getCloseout);
  const upsertPlan = useLeavePlanStore((s) => s.upsertPlan);
  const getPlanByEmployee = useLeavePlanStore((s) => s.getPlanByEmployee);
  const getAlertsByEmployee = useLeavePlanStore((s) => s.getAlertsByEmployee);
  const acknowledgeAlert = useLeavePlanStore((s) => s.acknowledgeAlert);
  const leaveSettings = useSettingsStore((s) => s.leave);

  const rawEmp = employees.find((e) => e.id === MY_ID);
  const myEmployee = rawEmp ? {
    ...rawEmp,
    department: departments.find((d) => d.id === rawEmp.department_id),
    position_rank: positionRanks.find((r) => r.id === rawEmp.position_rank_id),
    position_title: positionTitles.find((t) => t.id === rawEmp.position_title_id),
  } : undefined;

  // Leave store
  const leaveTypes = useLeaveStore((s) => s.leaveTypes);
  const leaveBalances = useLeaveStore((s) => s.leaveBalances);
  const leaveRequests = useLeaveStore((s) => s.leaveRequests);

  // Payroll store
  const savedPayrolls = usePayrollStore((s) => s.savedPayrolls);

  // Attendance store
  const attendanceRecords = useAttendanceStore((s) => s.records);
  const clockIn = useAttendanceStore((s) => s.clockIn);
  const clockOut = useAttendanceStore((s) => s.clockOut);
  const getTodayRecord = useAttendanceStore((s) => s.getTodayRecord);

  // Appointment store
  const appointments = useAppointmentStore((s) => s.appointments);

  // Approval store
  const approvals = useApprovalStore((s) => s.approvals);

  // Local state
  const [selectedStart, setSelectedStart] = useState(work.default_start_time);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);

  // === 근태 필터 & 수정 요청 ===
  const [attendanceFilter, setAttendanceFilter] = useState<'all' | 'normal' | 'late' | 'halfDay' | 'trip' | 'other'>('all');
  const [modDialogOpen, setModDialogOpen] = useState(false);
  const [modTarget, setModTarget] = useState<typeof myAttendance[0] | null>(null);
  const [modForm, setModForm] = useState({
    clock_in: '',
    clock_out: '',
    status: 'normal',
    note: '',
    reason: '',
  });
  const [modHistoryOpen, setModHistoryOpen] = useState(false);
  const [modHistoryTargetId, setModHistoryTargetId] = useState<string | null>(null);

  // 연차 사용계획서
  const currentYear = new Date().getFullYear();
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const myLeavePlan = useMemo(() => getPlanByEmployee(MY_ID, currentYear), [MY_ID, currentYear, getPlanByEmployee]);
  const myLeaveAlerts = useMemo(() => getAlertsByEmployee(MY_ID), [MY_ID, getAlertsByEmployee]);
  const [planForm, setPlanForm] = useState<{ monthly: Record<number, number>; reason: string }>({
    monthly: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0, 12: 0 },
    reason: '',
  });

  // 다이얼로그 열릴 때 기존 계획 불러오기
  useEffect(() => {
    if (planDialogOpen && myLeavePlan) {
      setPlanForm({
        monthly: { ...myLeavePlan.monthly_plan },
        reason: myLeavePlan.reason ?? '',
      });
    } else if (planDialogOpen && !myLeavePlan) {
      setPlanForm({
        monthly: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0, 12: 0 },
        reason: '',
      });
    }
  }, [planDialogOpen, myLeavePlan]);

  const planTotalDays = useMemo(() => {
    return Object.values(planForm.monthly).reduce((s, v) => s + v, 0);
  }, [planForm.monthly]);

  const submitPlan = () => {
    if (planTotalDays === 0) {
      toast.error('월별 사용 계획을 입력해주세요.');
      return;
    }
    const now = new Date().toISOString();
    upsertPlan({
      id: myLeavePlan?.id ?? `lup-${Date.now()}`,
      employee_id: MY_ID,
      year: currentYear,
      total_planned_days: planTotalDays,
      monthly_plan: planForm.monthly,
      reason: planForm.reason || null,
      status: 'submitted',
      submitted_at: now,
      reviewed_at: null,
      reviewed_by: null,
      reviewed_by_name: null,
      review_comment: null,
      created_at: myLeavePlan?.created_at ?? now,
      updated_at: now,
    });
    toast.success('연차 사용계획서가 제출되었습니다.');
    setPlanDialogOpen(false);
  };

  // === 권한 체크 ===
  const userRole = session?.role ?? 'employee';
  const isHR = userRole === 'admin' || userRole === 'hr_manager';
  // 본인은 자기 정보의 개인신상/가족정보 수정 가능, 인사기본정보(부서/직급/사번 등)는 HR만
  const canEditPersonal = true; // 본인은 항상 수정 가능
  // 민감정보(주민번호 전체) - HR만 조회 가능
  const canViewSensitive = isHR;

  // 편집 다이얼로그 상태
  const [personalEditOpen, setPersonalEditOpen] = useState(false);
  const [personalForm, setPersonalForm] = useState({
    phone: '', personal_email: '', address: '', address_detail: '', zip_code: '',
    marriage_date: '', emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relation: '',
  });
  const [familyDialogOpen, setFamilyDialogOpen] = useState(false);
  const [editingFamilyId, setEditingFamilyId] = useState<string | null>(null);
  const [familyForm, setFamilyForm] = useState({
    name: '', relation: '배우자', birth_date: '', phone: '',
    is_dependent: false, is_living_together: true, has_income: false, medical_notes: '',
  });

  // Timer for clock
  useState(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  });

  const todayRecord = getTodayRecord(MY_ID);
  const isClockedIn = !!todayRecord && !todayRecord.clock_out;

  const startOptions = useMemo(() => {
    if (!work.flex_work_enabled) return [work.default_start_time];
    return generateTimeOptions(work.flex_start_min, work.flex_start_max);
  }, [work]);

  const selectedEnd = useMemo(() => calcEndTime(selectedStart, 9), [selectedStart]);

  // Derived data
  const myBalances = useMemo(
    () => leaveBalances.filter((b) => b.employee_id === MY_ID && b.year === new Date().getFullYear()),
    [leaveBalances, MY_ID],
  );

  const myRequests = useMemo(
    () =>
      leaveRequests
        .filter((r) => r.employee_id === MY_ID)
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [leaveRequests, MY_ID],
  );

  const myPayrolls = useMemo(
    () =>
      savedPayrolls
        .filter((p) => p.employee_id === MY_ID)
        .sort((a, b) => (b.year !== a.year ? b.year - a.year : b.month - a.month)),
    [savedPayrolls, MY_ID],
  );

  const annualBalance = useMemo(
    () => myBalances.find((b) => b.leave_type_id === annualTypeId),
    [myBalances, annualTypeId],
  );

  const latestPayroll = useMemo(() => (myPayrolls.length > 0 ? myPayrolls[0] : null), [myPayrolls]);

  const activeBalances = useMemo(
    () =>
      myBalances.filter((b) => {
        const lt = leaveTypes.find((t) => t.id === b.leave_type_id);
        return lt?.is_active;
      }),
    [myBalances, leaveTypes],
  );

  const myAppointments = useMemo(
    () => appointments
      .filter((a) => a.employee_id === MY_ID)
      .sort((a, b) => b.effective_date.localeCompare(a.effective_date)),
    [appointments, MY_ID],
  );

  // Sub-data
  const myCareer = useMemo(() => careerHistories.filter((c) => c.employee_id === MY_ID), [careerHistories, MY_ID]);
  const myEducation = useMemo(() => educationHistories.filter((e) => e.employee_id === MY_ID), [educationHistories, MY_ID]);
  const myCerts = useMemo(() => certifications.filter((c) => c.employee_id === MY_ID), [certifications, MY_ID]);
  const myFamily = useMemo(() => familyMembers.filter((f) => f.employee_id === MY_ID), [familyMembers, MY_ID]);

  // Workplace and active schedule
  const myWorkplace = useMemo(
    () => myEmployee?.workplace_id ? workplaces.find((w) => w.id === myEmployee.workplace_id) : workplaces.find((w) => w.is_headquarters) ?? workplaces[0],
    [myEmployee, workplaces],
  );
  const myActiveAssignment = getActiveAssignment(MY_ID);
  const myWorkSchedule = useMemo(
    () => myActiveAssignment ? workSchedules.find((ws) => ws.id === myActiveAssignment.work_schedule_id) : null,
    [myActiveAssignment, workSchedules],
  );

  const myAttendance = useMemo(
    () => attendanceRecords
      .filter((r) => r.employee_id === MY_ID)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 10),
    [attendanceRecords, MY_ID],
  );

  const myApprovals = useMemo(
    () => approvals
      .filter((a) => a.requester_id === MY_ID || a.lines?.some((l) => l.approver_id === MY_ID))
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 15),
    [approvals, MY_ID],
  );

  const approvalSummary = useMemo(() => {
    const myRequested = approvals.filter((a) => a.requester_id === MY_ID);
    const pending = myRequested.filter((a) => a.status === 'pending' || a.status === 'in_progress').length;
    const approved = myRequested.filter((a) => a.status === 'approved').length;
    const rejected = myRequested.filter((a) => a.status === 'rejected').length;
    const toApprove = approvals.filter((a) =>
      a.lines?.some((l) => l.approver_id === MY_ID && l.status === 'pending'),
    ).length;
    return { pending, approved, rejected, toApprove };
  }, [approvals, MY_ID]);

  // 필터된 근태 기록
  const filteredAttendance = useMemo(() => {
    if (attendanceFilter === 'all') return myAttendance;
    if (attendanceFilter === 'normal') return myAttendance.filter((a) => a.status === 'normal');
    if (attendanceFilter === 'late') return myAttendance.filter((a) => a.status === 'late');
    if (attendanceFilter === 'halfDay') return myAttendance.filter((a) => a.status === 'half_day' || a.status === 'quarter_day');
    if (attendanceFilter === 'trip') return myAttendance.filter((a) => {
      const t = a.attendance_type;
      return t && t !== 'office' && (
        t.includes('trip') || t === 'field_work' || t === 'remote' || t === 'training' || t === 'dispatch'
      );
    });
    if (attendanceFilter === 'other') return myAttendance.filter(
      (a) => a.status === 'early_leave' || a.status === 'absent' || a.status === 'leave',
    );
    return myAttendance;
  }, [myAttendance, attendanceFilter]);

  // 마감여부 체크
  const isAttendanceClosed = (date: string): boolean => {
    if (!work.modification_locked_after_close) return false;
    const d = new Date(date);
    const closeout = getCloseout(d.getFullYear(), d.getMonth() + 1);
    return !!closeout;
  };

  // 수정 요청 핸들러
  const openModDialog = (record: typeof myAttendance[0]) => {
    setModTarget(record);
    setModForm({
      clock_in: record.clock_in ? new Date(record.clock_in).toTimeString().slice(0, 5) : '',
      clock_out: record.clock_out ? new Date(record.clock_out).toTimeString().slice(0, 5) : '',
      status: record.status,
      note: record.note ?? '',
      reason: '',
    });
    setModDialogOpen(true);
  };

  const submitModification = () => {
    if (!modTarget || !modForm.reason.trim()) {
      toast.error('수정 사유를 입력해주세요.');
      return;
    }
    const date = modTarget.date;
    const newClockIn = modForm.clock_in ? `${date}T${modForm.clock_in}:00+09:00` : null;
    const newClockOut = modForm.clock_out ? `${date}T${modForm.clock_out}:00+09:00` : null;
    let newWorkHours: number | null = modTarget.work_hours;
    if (newClockIn && newClockOut) {
      const diff = (new Date(newClockOut).getTime() - new Date(newClockIn).getTime()) / (1000 * 60 * 60);
      newWorkHours = Math.round(diff * 100) / 100;
    }
    addModification({
      id: `am-${Date.now()}`,
      attendance_id: modTarget.id,
      employee_id: MY_ID,
      before: {
        clock_in: modTarget.clock_in,
        clock_out: modTarget.clock_out,
        work_hours: modTarget.work_hours,
        status: modTarget.status,
        note: modTarget.note,
        attendance_type: modTarget.attendance_type,
      },
      after: {
        clock_in: newClockIn,
        clock_out: newClockOut,
        work_hours: newWorkHours,
        status: modForm.status,
        note: modForm.note || null,
        attendance_type: modTarget.attendance_type,
      },
      reason: modForm.reason,
      status: 'pending',
      approval_id: null,
      reviewed_by: null,
      reviewed_by_name: null,
      reviewed_at: null,
      review_comment: null,
      attachment_name: null,
      created_at: new Date().toISOString(),
    });
    toast.success('근태수정 요청이 접수되었습니다. 결재 진행 후 반영됩니다.');
    setModDialogOpen(false);
    setModTarget(null);
  };

  const myModifications = useMemo(() => getModByEmployee(MY_ID), [MY_ID, getModByEmployee]);

  const attendanceSummary = useMemo(() => {
    const total = myAttendance.length;
    const normal = myAttendance.filter((a) => a.status === 'normal').length;
    const late = myAttendance.filter((a) => a.status === 'late').length;
    const halfDay = myAttendance.filter((a) => a.status === 'half_day' || a.status === 'quarter_day').length;
    // 출장/외근/재택/교육 등 외근성 근태
    const trip = myAttendance.filter((a) => {
      const t = a.attendance_type;
      return t && t !== 'office' && (
        t.includes('trip') || t === 'field_work' || t === 'remote' || t === 'training' || t === 'dispatch'
      );
    }).length;
    const other = myAttendance.filter(
      (a) => a.status === 'early_leave' || a.status === 'absent' || a.status === 'leave',
    ).length;
    return { total, normal, late, halfDay, trip, other };
  }, [myAttendance]);

  // Fallback if no employee found
  if (!myEmployee) {
    return (
      <div>
        <Breadcrumb />
        <h1 className="text-2xl font-bold mb-6">마이페이지</h1>
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <p>이 계정은 사원 정보와 연결되어 있지 않습니다.</p>
            <p className="mt-1 text-sm">
              마이페이지는 본인의 사원 기록을 보여주는 화면입니다. 인사담당자에게
              계정과 사원 정보를 연결해 달라고 요청하세요.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const yearsOfService = getYearsMonths(myEmployee.hire_date);
  const baseSalary = myEmployee.base_salary;

  const formatClockTime = (isoStr: string | null) => {
    if (!isoStr) return '-';
    try {
      const d = new Date(isoStr);
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    } catch {
      return isoStr;
    }
  };

  const formatTimeDisplay = (date: Date) => {
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const handleClockIn = () => {
    clockIn(MY_ID, 'office', selectedStart, selectedEnd, work.late_grace_minutes);
    toast.success('출근이 기록되었습니다.');
  };

  const handleClockOut = () => {
    clockOut(MY_ID);
    toast.success('퇴근이 기록되었습니다.');
  };

  return (
    <div>
      <Breadcrumb />
      <h1 className="text-2xl font-bold mb-6">마이페이지</h1>

      {/* Profile Card */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={`https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(myEmployee.name)}`} alt={myEmployee.name} />
                <AvatarFallback className="text-xl font-bold">
                  {myEmployee.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-xl font-bold">
                  {myEmployee.name}{' '}
                  <span className="text-base font-normal text-muted-foreground">
                    {myEmployee.position_rank?.name ?? ''}
                  </span>
                </h2>
                <p className="text-sm text-muted-foreground">{myEmployee.department?.name ?? ''}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-accent-blue-subtle text-accent-blue">
                  <Briefcase className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">근속</p>
                  <p className="text-sm font-semibold">{yearsOfService}</p>
                </div>
              </div>
              <Separator orientation="vertical" className="h-10 hidden md:block" />
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-accent-green-subtle text-accent-green">
                  <CalendarDays className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">연차 잔여</p>
                  <p className="text-sm font-semibold">
                    {annualBalance
                      ? `${annualBalance.remaining_days} / ${annualBalance.total_days}일`
                      : '-'}
                  </p>
                </div>
              </div>
              <Separator orientation="vertical" className="h-10 hidden md:block" />
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-accent-amber-subtle text-accent-amber">
                  <Banknote className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">이번달 급여</p>
                  <p className="text-sm font-semibold">
                    {latestPayroll ? fmtWon(latestPayroll.net_pay) : '-'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="attendance" className="w-full">
        <TabsList className="w-full justify-start mb-4">
          <TabsTrigger value="attendance" className="gap-1">
            <Clock className="h-3.5 w-3.5" />
            출퇴근/근태
          </TabsTrigger>
          <TabsTrigger value="leave" className="gap-1">
            <CalendarDays className="h-3.5 w-3.5" />
            휴가신청
          </TabsTrigger>
          <TabsTrigger value="basic" className="gap-1">
            <User className="h-3.5 w-3.5" />
            기본정보
          </TabsTrigger>
          <TabsTrigger value="appointments" className="gap-1">
            <Briefcase className="h-3.5 w-3.5" />
            인사발령
          </TabsTrigger>
          <TabsTrigger value="payroll" className="gap-1">
            <Banknote className="h-3.5 w-3.5" />
            급여
          </TabsTrigger>
          <TabsTrigger value="approval" className="gap-1">
            <FileCheck className="h-3.5 w-3.5" />
            전자결재
          </TabsTrigger>
          <TabsTrigger value="files" className="gap-1">
            <FolderOpen className="h-3.5 w-3.5" />
            나의 파일
          </TabsTrigger>
        </TabsList>

        {/* ============================================================== */}
        {/* Tab 1: 출퇴근/근태 (NEW - combined clock + attendance)         */}
        {/* ============================================================== */}
        <TabsContent value="attendance">
          {/* Clock-in/out card */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                출퇴근
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <span className="text-2xl font-mono font-bold">{formatTimeDisplay(currentTime)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {currentTime.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
                  </p>
                  <div className="flex gap-4 text-sm">
                    <span>출근: <strong>{formatClockTime(todayRecord?.clock_in ?? null)}</strong></span>
                    <span>퇴근: <strong>{formatClockTime(todayRecord?.clock_out ?? null)}</strong></span>
                  </div>
                  {todayRecord?.leave_time_period && (
                    <Badge variant="secondary">
                      {LEAVE_TIME_PERIODS[todayRecord.leave_time_period as keyof typeof LEAVE_TIME_PERIODS]}
                    </Badge>
                  )}
                </div>
                <div className="flex flex-col items-end gap-3">
                  {/* Flex schedule selector */}
                  {work.flex_work_enabled && !todayRecord && (
                    <div className="flex items-center gap-2">
                      <Timer className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">근무시간:</span>
                      <Select value={selectedStart} onValueChange={setSelectedStart}>
                        <SelectTrigger className="w-[100px] h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {startOptions.map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-sm text-muted-foreground">~</span>
                      <span className="text-sm font-medium">{selectedEnd}</span>
                    </div>
                  )}
                  {todayRecord && (
                    <div className="text-sm text-muted-foreground">
                      근무시간: {todayRecord.scheduled_start ?? work.default_start_time} ~ {todayRecord.scheduled_end ?? work.default_end_time}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button onClick={handleClockIn} disabled={!!todayRecord} size="lg">
                      <LogIn className="h-4 w-4 mr-2" />
                      출근
                    </Button>
                    <Button onClick={handleClockOut} disabled={!isClockedIn} variant="outline" size="lg">
                      <LogOut className="h-4 w-4 mr-2" />
                      퇴근
                    </Button>
                  </div>
                </div>
              </div>
              {work.flex_work_enabled && (
                <div className="mt-4 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                  <strong>유연근무제</strong>: {work.flex_start_min}~{work.flex_start_max} 출근 / {work.flex_end_min}~{work.flex_end_max} 퇴근 (8시간 근무 + 1시간 점심)
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary cards - 클릭으로 필터링 */}
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6 mb-6">
            {[
              { key: 'all' as const, label: '전체', value: attendanceSummary.total, color: 'bg-accent-blue-subtle text-accent-blue' },
              { key: 'normal' as const, label: '정상출근', value: attendanceSummary.normal, color: 'bg-accent-green-subtle text-accent-green' },
              { key: 'late' as const, label: '지각', value: attendanceSummary.late, color: 'bg-red-100 text-red-600' },
              { key: 'halfDay' as const, label: '반차/반반차', value: attendanceSummary.halfDay, color: 'bg-orange-100 text-orange-600' },
              { key: 'trip' as const, label: '출장/외근/재택', value: attendanceSummary.trip, color: 'bg-accent-purple-subtle text-accent-purple' },
              { key: 'other' as const, label: '기타(조퇴/결근/휴가)', value: attendanceSummary.other, color: 'bg-accent-amber-subtle text-accent-amber' },
            ].map(({ key, label, value, color }) => (
              <Card
                key={label}
                className={`cursor-pointer transition-all hover:shadow-md ${attendanceFilter === key ? 'ring-2 ring-primary' : ''}`}
                onClick={() => setAttendanceFilter(key)}
              >
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <div className={`p-1.5 rounded-lg ${color}`}>
                      <Clock className="h-3.5 w-3.5" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold">{value}일</p>
                  {attendanceFilter === key && (
                    <p className="text-[10px] text-primary mt-1">▼ 아래 표 필터링됨</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Attendance table - 필터링 + 근태수정 요청 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">
                근태 기록
                {attendanceFilter !== 'all' && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    필터: {{
                      normal: '정상출근', late: '지각', halfDay: '반차/반반차', trip: '출장/외근/재택', other: '기타'
                    }[attendanceFilter]}
                    <button onClick={(e) => { e.stopPropagation(); setAttendanceFilter('all'); }} className="ml-2 hover:text-destructive">×</button>
                  </Badge>
                )}
              </CardTitle>
              <span className="text-xs text-muted-foreground">{filteredAttendance.length}건</span>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>날짜</TableHead>
                      <TableHead>근태유형</TableHead>
                      <TableHead>근무시간대</TableHead>
                      <TableHead>출근</TableHead>
                      <TableHead>퇴근</TableHead>
                      <TableHead>근무시간</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>비고</TableHead>
                      <TableHead className="text-right">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAttendance.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground">근태 기록이 없습니다.</TableCell>
                      </TableRow>
                    ) : filteredAttendance.map((a) => {
                      const isClosed = isAttendanceClosed(a.date);
                      const mods = getModByAttendance(a.id);
                      const hasPendingMod = mods.some((m) => m.status === 'pending');
                      const hasApprovedMod = mods.some((m) => m.status === 'approved');
                      return (
                        <TableRow key={a.id} className={isClosed ? 'bg-muted/30' : ''}>
                          <TableCell className="font-medium">
                            {a.date}
                            {isClosed && <Badge variant="outline" className="ml-1 text-[9px]">마감</Badge>}
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-muted-foreground">
                              {a.attendance_type ?? 'office'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-muted-foreground font-mono">
                              {a.scheduled_start && a.scheduled_end
                                ? `${a.scheduled_start}~${a.scheduled_end}`
                                : '-'}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm">{formatClockTime(a.clock_in)}</TableCell>
                          <TableCell className="text-sm">{formatClockTime(a.clock_out)}</TableCell>
                          <TableCell className="text-sm">
                            {a.work_hours != null ? `${a.work_hours.toFixed(2)}h` : '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Badge
                                variant={attendanceStatusVariant(a.status)}
                                className="text-xs"
                              >
                                {ATTENDANCE_STATUS[a.status as keyof typeof ATTENDANCE_STATUS] ?? a.status}
                              </Badge>
                              {a.leave_time_period && (
                                <Badge variant="outline" className="text-xs">
                                  {LEAVE_TIME_PERIODS[a.leave_time_period as keyof typeof LEAVE_TIME_PERIODS]}
                                </Badge>
                              )}
                              {hasPendingMod && (
                                <Badge variant="secondary" className="text-[10px] bg-yellow-100 text-yellow-800">
                                  수정대기
                                </Badge>
                              )}
                              {hasApprovedMod && !hasPendingMod && (
                                <Badge variant="outline" className="text-[10px]">수정됨</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{a.note ?? ''}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              {mods.length > 0 && (
                                <Button
                                  variant="ghost" size="sm" className="h-7 px-2 text-xs"
                                  onClick={() => { setModHistoryTargetId(a.id); setModHistoryOpen(true); }}
                                >
                                  이력
                                </Button>
                              )}
                              {work.allow_attendance_modification && !isClosed && !hasPendingMod && (
                                <Button
                                  variant="outline" size="sm" className="h-7 px-2 text-xs"
                                  onClick={() => openModDialog(a)}
                                >
                                  근태수정
                                </Button>
                              )}
                              {isClosed && (
                                <span className="text-[10px] text-muted-foreground">마감</span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* 내 근태수정 요청 이력 */}
          {myModifications.length > 0 && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-base">내 근태수정 요청 이력 ({myModifications.length}건)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>요청일</TableHead>
                        <TableHead>대상 근태일</TableHead>
                        <TableHead>변경 내용</TableHead>
                        <TableHead>사유</TableHead>
                        <TableHead>상태</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {myModifications.slice(0, 10).map((m) => {
                        const target = myAttendance.find((a) => a.id === m.attendance_id);
                        return (
                          <TableRow key={m.id}>
                            <TableCell className="text-xs">{m.created_at.slice(0, 10)}</TableCell>
                            <TableCell className="text-sm font-medium">{target?.date ?? '-'}</TableCell>
                            <TableCell className="text-xs">
                              {m.before.clock_in !== m.after.clock_in && (
                                <div>출근: {m.before.clock_in ? new Date(m.before.clock_in).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '-'} → {m.after.clock_in ? new Date(m.after.clock_in).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '-'}</div>
                              )}
                              {m.before.clock_out !== m.after.clock_out && (
                                <div>퇴근: {m.before.clock_out ? new Date(m.before.clock_out).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '-'} → {m.after.clock_out ? new Date(m.after.clock_out).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '-'}</div>
                              )}
                              {m.before.status !== m.after.status && (
                                <div>상태: {m.before.status} → {m.after.status}</div>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{m.reason}</TableCell>
                            <TableCell>
                              <Badge
                                variant={m.status === 'approved' ? 'default' : m.status === 'rejected' ? 'destructive' : 'secondary'}
                                className="text-xs"
                              >
                                {m.status === 'pending' ? '결재 대기' : m.status === 'approved' ? '승인' : '반려'}
                              </Badge>
                              {m.reviewed_by_name && (
                                <p className="text-[10px] text-muted-foreground mt-0.5">{m.reviewed_by_name}</p>
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

        {/* ============================================================== */}
        {/* Tab 2: 휴가신청 (NEW - with inline form)                       */}
        {/* ============================================================== */}
        <TabsContent value="leave">
          {/* 미사용 연차 촉진 알림 */}
          {(() => {
            const unread = (myLeaveAlerts ?? []).filter((a) => !a.acknowledged);
            if (unread.length === 0) return null;
            const latest = unread[0];
            return (
              <Card className="mb-4 border-orange-300 bg-orange-50/50">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Bell className="h-4 w-4 text-orange-600" />
                        <p className="font-semibold text-sm">
                          {latest.alert_round}차 미사용 연차 촉진 알림
                        </p>
                        <Badge variant="destructive" className="text-xs">미확인 {unread.length}건</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        잔여 연차 <strong>{latest.remaining_days}일</strong>이 있습니다.
                        근로기준법에 따라 사용계획을 제출하시거나 회사 결정에 위임하실 수 있습니다.
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm" variant="outline" className="h-7 text-xs"
                        onClick={() => {
                          acknowledgeAlert(latest.id, 'plan_submitted');
                          setPlanDialogOpen(true);
                        }}
                      >
                        계획제출
                      </Button>
                      <Button
                        size="sm" variant="outline" className="h-7 text-xs"
                        onClick={() => {
                          acknowledgeAlert(latest.id, 'company_decision');
                          toast.success('회사 결정에 위임했습니다.');
                        }}
                      >
                        회사위임
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {/* 사용계획서 제출 버튼 */}
          {leaveSettings.enable_usage_plan && (
            <div className="flex justify-end mb-3">
              <Button variant="outline" size="sm" onClick={() => setPlanDialogOpen(true)}>
                <Calendar className="h-3.5 w-3.5 mr-1" />
                {myLeavePlan ? `${currentYear}년 사용계획 (${myLeavePlan.status === 'submitted' ? '제출완료' : myLeavePlan.status === 'reviewed' ? '검토완료' : '작성중'})` : `${currentYear}년 연차 사용계획 제출`}
              </Button>
            </div>
          )}

          {/* Balance cards */}
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 mb-6">
            {activeBalances.map((b, idx) => {
              const lt = leaveTypes.find((t) => t.id === b.leave_type_id);
              const rate = b.total_days > 0 ? Math.round((b.used_days / b.total_days) * 100) : 0;
              const colorSet = [
                { bg: 'bg-accent-blue-subtle', fg: 'text-accent-blue' },
                { bg: 'bg-accent-amber-subtle', fg: 'text-accent-amber' },
                { bg: 'bg-accent-purple-subtle', fg: 'text-accent-purple' },
                { bg: 'bg-accent-green-subtle', fg: 'text-accent-green' },
              ][idx % 4];
              return (
                <Card key={b.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-muted-foreground">{lt?.name ?? '-'}</p>
                      <div className={`p-1.5 rounded-lg ${colorSet.bg} ${colorSet.fg}`}>
                        <CalendarDays className="h-3.5 w-3.5" />
                      </div>
                    </div>
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-2xl font-bold">{b.remaining_days}</span>
                      <span className="text-sm text-muted-foreground">
                        / {b.total_days}일 (사용: {b.used_days})
                      </span>
                    </div>
                    <Progress value={rate} className="h-2" />
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Leave Request Form */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  휴가 신청
                </CardTitle>
              </CardHeader>
              <CardContent>
                <LeaveRequestForm
                  employeeId={MY_ID}
                  onSuccess={() => toast.success('휴가가 신청되었습니다.')}
                />
              </CardContent>
            </Card>

            {/* Recent requests */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">신청 내역</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>신청일</TableHead>
                        <TableHead>유형</TableHead>
                        <TableHead>기간</TableHead>
                        <TableHead>일수</TableHead>
                        <TableHead>상태</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {myRequests.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
                            휴가 신청 내역이 없습니다.
                          </TableCell>
                        </TableRow>
                      ) : (
                        myRequests.slice(0, 10).map((req) => {
                          const lt = leaveTypes.find((t) => t.id === req.leave_type_id);
                          const periodLabel = req.leave_time_period
                            ? LEAVE_TIME_PERIODS[req.leave_time_period as keyof typeof LEAVE_TIME_PERIODS]
                            : null;
                          return (
                            <TableRow key={req.id}>
                              <TableCell className="text-sm">{req.created_at}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Badge variant="outline" className="text-xs">
                                    {lt?.name ?? '-'}
                                  </Badge>
                                  {periodLabel && (
                                    <Badge variant="secondary" className="text-xs">
                                      {periodLabel}
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-sm">
                                {req.start_date === req.end_date
                                  ? req.start_date
                                  : `${req.start_date} ~ ${req.end_date}`}
                              </TableCell>
                              <TableCell className="text-sm">{req.days}일</TableCell>
                              <TableCell>
                                <Badge
                                  variant={leaveStatusVariant(req.status)}
                                  className="text-xs"
                                >
                                  {LEAVE_REQUEST_STATUS[req.status as keyof typeof LEAVE_REQUEST_STATUS] ?? req.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ============================================================== */}
        {/* Tab 3: 기본정보                                                 */}
        {/* ============================================================== */}
        <TabsContent value="basic">
          <div className="space-y-6">
            {/* 1. 인사 정보 (재직정보) */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  인사 정보
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    { icon: Hash, label: '사번', value: myEmployee.employee_number },
                    { icon: User, label: '성명', value: myEmployee.name },
                    { icon: User, label: '영문명', value: myEmployee.name_en ?? '-' },
                    { icon: Building2, label: '부서', value: myEmployee.department?.name ?? '-' },
                    { icon: Briefcase, label: '직급', value: myEmployee.position_rank?.name ?? '-' },
                    { icon: Briefcase, label: '직책', value: myEmployee.position_title?.name ?? '-' },
                    { icon: Briefcase, label: '고용형태', value: EMPLOYMENT_TYPES[myEmployee.employment_type] ?? myEmployee.employment_type },
                    { icon: CalendarDays, label: '입사일', value: myEmployee.hire_date },
                    { icon: Clock, label: '근속기간', value: yearsOfService },
                    { icon: Mail, label: '사내메일', value: myEmployee.email },
                    {
                      icon: MapPin,
                      label: '근무지(사업장)',
                      value: myWorkplace ? (
                        <span>
                          {myWorkplace.name}
                          <span className="ml-1 text-[10px] text-muted-foreground">
                            ({{ headquarters: '본사', branch: '지사', factory: '공장', overseas_corp: '현지법인', project_site: '현장' }[myWorkplace.workplace_type ?? 'branch']})
                          </span>
                        </span>
                      ) : '-',
                    },
                    {
                      icon: Globe,
                      label: '근로형태',
                      value: (() => {
                        const arr = myEmployee.work_arrangement;
                        if (!arr) return '정규 근무';
                        return ({
                          regular: '정규',
                          dispatch_domestic: '국내 파견',
                          dispatch_overseas: '해외 파견',
                          overseas_corp: '현지법인 채용',
                          project: '프로젝트 현장',
                        } as Record<string, string>)[arr] ?? arr;
                      })(),
                    },
                    {
                      icon: Clock,
                      label: '근무시간',
                      value: myWorkplace?.use_custom_work_hours
                        ? `${myWorkplace.start_time} ~ ${myWorkplace.end_time}`
                        : `${work.default_start_time} ~ ${work.default_end_time} (전사 기본)`,
                    },
                    { icon: Clock, label: '근무유형', value: myWorkSchedule?.name ?? '기본 고정근무' },
                  ].map((item) => (
                    <div key={item.label} className="rounded-lg border p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <item.icon className="h-3 w-3 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">{item.label}</p>
                      </div>
                      <p className="text-sm font-medium">{item.value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 2. 개인 신상 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4" />
                  개인 신상
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    { icon: Cake, label: '생년월일', value: myEmployee.birth_date ?? '-' },
                    { icon: User, label: '성별', value: myEmployee.gender === 'M' ? '남' : myEmployee.gender === 'F' ? '여' : '-' },
                    { icon: Hash, label: '주민등록번호', value: myEmployee.resident_number ?? '-' },
                    { icon: Phone, label: '휴대전화', value: myEmployee.phone ?? '-' },
                    { icon: Mail, label: '개인메일', value: myEmployee.personal_email ?? '-' },
                    { icon: Heart, label: '결혼기념일', value: myEmployee.marriage_date ?? '-' },
                    { icon: MapPin, label: '주소', value: `${myEmployee.address ?? '-'} ${myEmployee.address_detail ?? ''}` },
                    { icon: Hash, label: '우편번호', value: myEmployee.zip_code ?? '-' },
                    {
                      icon: Phone, label: '비상연락처',
                      value: myEmployee.emergency_contact_name
                        ? `${myEmployee.emergency_contact_name} (${myEmployee.emergency_contact_relation ?? ''}) ${myEmployee.emergency_contact_phone ?? ''}`
                        : '-',
                    },
                  ].map((item) => (
                    <div key={item.label} className="rounded-lg border p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <item.icon className="h-3 w-3 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">{item.label}</p>
                      </div>
                      <p className="text-sm font-medium">{item.value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 3. 급여 정보 (요약) */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Banknote className="h-4 w-4" />
                  급여 정보
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg border p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <DollarSign className="h-3 w-3 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">기본급</p>
                    </div>
                    <p className="text-sm font-bold">{fmtWon(baseSalary)}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <CreditCard className="h-3 w-3 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">은행/계좌</p>
                    </div>
                    <p className="text-sm font-medium">{myEmployee.bank_name ?? '-'} {myEmployee.bank_account ?? ''}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <TrendingUp className="h-3 w-3 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">최근 실수령</p>
                    </div>
                    <p className="text-sm font-bold">{latestPayroll ? fmtWon(latestPayroll.net_pay) : '-'}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <CalendarDays className="h-3 w-3 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">연차 잔여/총</p>
                    </div>
                    <p className="text-sm font-bold">
                      {annualBalance ? `${annualBalance.remaining_days} / ${annualBalance.total_days}일` : '-'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 4. 학력사항 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  학력사항
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>학교명</TableHead>
                        <TableHead>전공</TableHead>
                        <TableHead>학위</TableHead>
                        <TableHead>기간</TableHead>
                        <TableHead>졸업</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {myEducation.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">등록된 학력 정보가 없습니다.</TableCell></TableRow>
                      ) : myEducation.map((e) => (
                        <TableRow key={e.id}>
                          <TableCell className="font-medium">{e.school_name}</TableCell>
                          <TableCell className="text-sm">{e.major ?? '-'}</TableCell>
                          <TableCell className="text-sm">{e.degree ? DEGREE_LABELS[e.degree] ?? e.degree : '-'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{e.start_date ?? ''} ~ {e.end_date ?? '현재'}</TableCell>
                          <TableCell><Badge variant={e.is_graduated ? 'default' : 'secondary'} className="text-xs">{e.is_graduated ? '졸업' : '재학'}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* 5. 경력사항 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  경력사항
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>회사명</TableHead>
                        <TableHead>부서</TableHead>
                        <TableHead>직위</TableHead>
                        <TableHead>기간</TableHead>
                        <TableHead>업무</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {myCareer.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">등록된 경력 정보가 없습니다.</TableCell></TableRow>
                      ) : myCareer.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.company_name}</TableCell>
                          <TableCell className="text-sm">{c.department ?? '-'}</TableCell>
                          <TableCell className="text-sm">{c.position ?? '-'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{c.start_date} ~ {c.end_date ?? '현재'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{c.description ?? ''}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* 6. 자격증 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  자격/면허
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>자격증명</TableHead>
                        <TableHead>발급기관</TableHead>
                        <TableHead>취득일</TableHead>
                        <TableHead>만료일</TableHead>
                        <TableHead>번호</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {myCerts.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">등록된 자격증이 없습니다.</TableCell></TableRow>
                      ) : myCerts.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.name}</TableCell>
                          <TableCell className="text-sm">{c.issuer ?? '-'}</TableCell>
                          <TableCell className="text-xs">{c.issue_date ?? '-'}</TableCell>
                          <TableCell className="text-xs">{c.expiry_date ?? '없음'}</TableCell>
                          <TableCell className="text-xs font-mono">{c.certificate_number ?? '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* 7. 가족사항 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  가족사항
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>성명</TableHead>
                        <TableHead>관계</TableHead>
                        <TableHead>생년월일</TableHead>
                        <TableHead>연락처</TableHead>
                        <TableHead>부양가족</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {myFamily.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">등록된 가족정보가 없습니다.</TableCell></TableRow>
                      ) : myFamily.map((f) => (
                        <TableRow key={f.id}>
                          <TableCell className="font-medium">{f.name}</TableCell>
                          <TableCell className="text-sm">{f.relation}</TableCell>
                          <TableCell className="text-xs">{f.birth_date ?? '-'}</TableCell>
                          <TableCell className="text-xs">{f.phone ?? '-'}</TableCell>
                          <TableCell><Badge variant={f.is_dependent ? 'default' : 'outline'} className="text-xs">{f.is_dependent ? '예' : '아니오'}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* 8. 인사발령 이력 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" />
                  인사발령 이력
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>발령일</TableHead>
                        <TableHead>유형</TableHead>
                        <TableHead>변경 전</TableHead>
                        <TableHead>변경 후</TableHead>
                        <TableHead>사유</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {myAppointments.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">인사발령 내역이 없습니다.</TableCell></TableRow>
                      ) : myAppointments.map((a) => {
                        const prevDept = a.prev_department_id ? departments.find((d) => d.id === a.prev_department_id)?.name : null;
                        const prevRank = a.prev_position_rank_id ? positionRanks.find((r) => r.id === a.prev_position_rank_id)?.name : null;
                        const newDept = a.new_department_id ? departments.find((d) => d.id === a.new_department_id)?.name : null;
                        const newRank = a.new_position_rank_id ? positionRanks.find((r) => r.id === a.new_position_rank_id)?.name : null;
                        return (
                          <TableRow key={a.id}>
                            <TableCell className="text-sm font-medium">{a.effective_date}</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-xs">
                                {APPOINTMENT_TYPES[a.type] ?? a.type}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs">{prevDept && prevRank ? `${prevDept} / ${prevRank}` : '-'}</TableCell>
                            <TableCell className="text-xs">{newDept && newRank ? `${newDept} / ${newRank}` : '-'}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{a.reason}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* 9. 증명서 발급 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  증명서 발급
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  <Link href={`/employees/${MY_ID}/certificates/employment`}>
                    <Button variant="outline" className="gap-2"><FileText className="h-4 w-4" />재직증명서</Button>
                  </Link>
                  <Link href={`/employees/${MY_ID}/certificates/career`}>
                    <Button variant="outline" className="gap-2"><FileText className="h-4 w-4" />경력증명서</Button>
                  </Link>
                  <Link href={`/employees/${MY_ID}/record-card`}>
                    <Button variant="outline" className="gap-2"><ClipboardList className="h-4 w-4" />인사기록카드</Button>
                  </Link>
                  <Link href="/payroll/withholding-tax">
                    <Button variant="outline" className="gap-2"><FileText className="h-4 w-4" />원천징수부</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ============================================================== */}
        {/* Tab 4: 인사발령 내역                                            */}
        {/* ============================================================== */}
        <TabsContent value="appointments">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">인사발령 내역</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>발령일</TableHead>
                      <TableHead>유형</TableHead>
                      <TableHead>변경 전</TableHead>
                      <TableHead>변경 후</TableHead>
                      <TableHead>사유</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myAppointments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">인사발령 내역이 없습니다.</TableCell>
                      </TableRow>
                    ) : myAppointments.map((a) => {
                      const prevDept = a.prev_department_id ? departments.find((d) => d.id === a.prev_department_id)?.name : null;
                      const prevRank = a.prev_position_rank_id ? positionRanks.find((r) => r.id === a.prev_position_rank_id)?.name : null;
                      const newDept = a.new_department_id ? departments.find((d) => d.id === a.new_department_id)?.name : null;
                      const newRank = a.new_position_rank_id ? positionRanks.find((r) => r.id === a.new_position_rank_id)?.name : null;
                      return (
                        <TableRow key={a.id}>
                          <TableCell className="font-medium">{a.effective_date}</TableCell>
                          <TableCell>
                            <Badge variant={appointmentTypeVariant(a.type)} className="text-xs">
                              {APPOINTMENT_TYPES[a.type as keyof typeof APPOINTMENT_TYPES] ?? a.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {prevDept && prevRank ? `${prevDept} / ${prevRank}` : '-'}
                          </TableCell>
                          <TableCell className="text-sm">
                            {newDept && newRank ? `${newDept} / ${newRank}` : '-'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{a.reason}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================================== */}
        {/* Tab 5: 급여 내역 (상세)                                        */}
        {/* ============================================================== */}
        <TabsContent value="payroll">
          <MyPayrollDetail
            myPayrolls={myPayrolls}
            baseSalary={baseSalary}
            myId={MY_ID}
          />
        </TabsContent>

        {/* ============================================================== */}
        {/* Tab: 나의 파일 — 사원카드의 파일 탭을 본인 것으로 그대로 씁니다. */}
        {/* 서버 쪽 listEmployeeDocuments 가 본인 자료를 허용하므로 별도    */}
        {/* 권한 처리가 필요 없습니다.                                      */}
        {/* ============================================================== */}
        <TabsContent value="files">
          {MY_ID ? (
            <EmployeeFilesTab employeeId={MY_ID} />
          ) : (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                계정에 연결된 사원 정보가 없어 파일을 보여줄 수 없습니다.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ============================================================== */}
        {/* Tab: 전자결재 현황                                              */}
        {/* ============================================================== */}
        <TabsContent value="approval">
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4 mb-6">
            {[
              { label: '결재 대기', value: approvalSummary.toApprove, color: 'bg-accent-amber-subtle text-accent-amber' },
              { label: '내 요청 진행중', value: approvalSummary.pending, color: 'bg-accent-blue-subtle text-accent-blue' },
              { label: '승인 완료', value: approvalSummary.approved, color: 'bg-accent-green-subtle text-accent-green' },
              { label: '반려', value: approvalSummary.rejected, color: 'bg-red-100 text-red-600' },
            ].map(({ label, value, color }) => (
              <Card key={label}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <div className={`p-1.5 rounded-lg ${color}`}>
                      <FileCheck className="h-3.5 w-3.5" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold">{value}건</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">결재 내역</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>제목</TableHead>
                      <TableHead>문서유형</TableHead>
                      <TableHead>신청일</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>역할</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myApprovals.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">결재 내역이 없습니다.</TableCell>
                      </TableRow>
                    ) : myApprovals.map((a) => {
                      const isRequester = a.requester_id === MY_ID;
                      const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
                        approved: 'default',
                        pending: 'outline',
                        in_progress: 'secondary',
                        rejected: 'destructive',
                        cancelled: 'outline',
                      };
                      return (
                        <TableRow key={a.id}>
                          <TableCell className="font-medium">{a.title}</TableCell>
                          <TableCell className="text-sm">{a.type}</TableCell>
                          <TableCell className="text-sm">{a.created_at.split('T')[0]}</TableCell>
                          <TableCell>
                            <Badge variant={statusVariant[a.status] ?? 'outline'} className="text-xs">
                              {APPROVAL_STATUS[a.status as keyof typeof APPROVAL_STATUS] ?? a.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {isRequester ? '신청' : '결재'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Link href={`/approval/${a.id}`}>
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs">
                                <ArrowRight className="h-3.5 w-3.5 mr-1" />
                                보기
                              </Button>
                            </Link>
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
      </Tabs>

      {/* 근태수정 요청 다이얼로그 */}
      <Dialog open={modDialogOpen} onOpenChange={setModDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>근태수정 요청 (사후결재)</DialogTitle>
            <DialogDescription>
              {modTarget?.date} 근태를 수정 요청합니다. 결재 승인 후 반영되며 수정 이력이 저장됩니다.
            </DialogDescription>
          </DialogHeader>
          {modTarget && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/30">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">현재 출근</p>
                  <p className="text-sm font-mono">{formatClockTime(modTarget.clock_in)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">현재 퇴근</p>
                  <p className="text-sm font-mono">{formatClockTime(modTarget.clock_out)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>수정 출근시간</Label>
                  <Input type="time" value={modForm.clock_in}
                    onChange={(e) => setModForm((p) => ({ ...p, clock_in: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>수정 퇴근시간</Label>
                  <Input type="time" value={modForm.clock_out}
                    onChange={(e) => setModForm((p) => ({ ...p, clock_out: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>상태</Label>
                <Select value={modForm.status} onValueChange={(v) => setModForm((p) => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">정상</SelectItem>
                    <SelectItem value="late">지각</SelectItem>
                    <SelectItem value="early_leave">조퇴</SelectItem>
                    <SelectItem value="absent">결근</SelectItem>
                    <SelectItem value="leave">휴가</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>비고</Label>
                <Input value={modForm.note}
                  onChange={(e) => setModForm((p) => ({ ...p, note: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>수정 사유 *</Label>
                <Textarea
                  value={modForm.reason}
                  onChange={(e) => setModForm((p) => ({ ...p, reason: e.target.value }))}
                  placeholder="예) 출장 중 출근 미체크, 시스템 오류로 퇴근 미체크 등"
                  rows={3}
                />
              </div>
              <div className="p-3 bg-blue-50 rounded-lg text-xs text-muted-foreground">
                💡 수정 요청은 결재 진행 후 승인 시 근태에 반영되며, 수정 이력은 별도 저장됩니다.
                인사팀은 [근태수정 결재] 탭에서 별도 조회 가능합니다.
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setModDialogOpen(false)}>취소</Button>
            <Button onClick={submitModification}>결재 상신</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 연차 사용계획서 다이얼로그 */}
      <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{currentYear}년 연차 사용계획서</DialogTitle>
            <DialogDescription>
              월별 사용 예정일을 입력해주세요. 근로기준법 §61에 따른 연차 사용계획서입니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <div key={m} className="space-y-1">
                  <Label className="text-xs">{m}월</Label>
                  <Input
                    type="number" min={0} step="0.5"
                    value={planForm.monthly[m] ?? 0}
                    onChange={(e) => setPlanForm((p) => ({
                      ...p,
                      monthly: { ...p.monthly, [m]: Number(e.target.value) },
                    }))}
                    className="text-center"
                  />
                </div>
              ))}
            </div>
            <div className="p-3 rounded-lg bg-muted/30 text-sm flex items-center justify-between">
              <span>총 계획 일수</span>
              <span className="text-lg font-bold">{planTotalDays}일</span>
            </div>
            <div className="space-y-2">
              <Label>비고</Label>
              <Textarea
                value={planForm.reason}
                onChange={(e) => setPlanForm((p) => ({ ...p, reason: e.target.value }))}
                placeholder="사용 계획에 대한 추가 설명 (선택)"
                rows={2}
              />
            </div>
            {myLeavePlan?.reviewed_by_name && (
              <div className="p-3 rounded-lg bg-blue-50 text-xs">
                <p className="font-semibold mb-1">검토 완료</p>
                <p>검토자: {myLeavePlan.reviewed_by_name} ({myLeavePlan.reviewed_at?.slice(0, 10)})</p>
                {myLeavePlan.review_comment && <p className="mt-1 italic">"{myLeavePlan.review_comment}"</p>}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanDialogOpen(false)}>취소</Button>
            <Button onClick={submitPlan}>{myLeavePlan ? '재제출' : '제출'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 근태수정 이력 다이얼로그 */}
      <Dialog open={modHistoryOpen} onOpenChange={setModHistoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>근태수정 이력</DialogTitle>
            <DialogDescription>
              {modHistoryTargetId && (() => {
                const a = myAttendance.find((x) => x.id === modHistoryTargetId);
                return a?.date ?? '';
              })()} 근태에 대한 수정 요청 내역
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {modHistoryTargetId && getModByAttendance(modHistoryTargetId).map((m) => (
              <div key={m.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant={m.status === 'approved' ? 'default' : m.status === 'rejected' ? 'destructive' : 'secondary'} className="text-xs">
                    {m.status === 'pending' ? '결재 대기' : m.status === 'approved' ? '승인' : '반려'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{m.created_at.slice(0, 16).replace('T', ' ')}</span>
                </div>
                <div className="text-xs space-y-1">
                  {m.before.clock_in !== m.after.clock_in && (
                    <div className="flex gap-2">
                      <span className="text-muted-foreground">출근:</span>
                      <span className="line-through text-muted-foreground">{m.before.clock_in ? new Date(m.before.clock_in).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                      <span>→</span>
                      <span className="font-medium">{m.after.clock_in ? new Date(m.after.clock_in).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                    </div>
                  )}
                  {m.before.clock_out !== m.after.clock_out && (
                    <div className="flex gap-2">
                      <span className="text-muted-foreground">퇴근:</span>
                      <span className="line-through text-muted-foreground">{m.before.clock_out ? new Date(m.before.clock_out).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                      <span>→</span>
                      <span className="font-medium">{m.after.clock_out ? new Date(m.after.clock_out).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                    </div>
                  )}
                  {m.before.status !== m.after.status && (
                    <div className="flex gap-2">
                      <span className="text-muted-foreground">상태:</span>
                      <span className="line-through text-muted-foreground">{ATTENDANCE_STATUS[m.before.status as keyof typeof ATTENDANCE_STATUS] ?? m.before.status}</span>
                      <span>→</span>
                      <span className="font-medium">{ATTENDANCE_STATUS[m.after.status as keyof typeof ATTENDANCE_STATUS] ?? m.after.status}</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground border-t pt-2">사유: {m.reason}</p>
                {m.review_comment && (
                  <p className="text-xs text-muted-foreground">검토의견: {m.review_comment}</p>
                )}
                {m.reviewed_by_name && (
                  <p className="text-[10px] text-muted-foreground">검토자: {m.reviewed_by_name} ({m.reviewed_at?.slice(0, 16).replace('T', ' ')})</p>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
