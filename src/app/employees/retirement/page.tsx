'use client';

import { useState, useMemo } from 'react';
import { useAnnualLeaveTypeId } from '@/lib/hooks/use-employee-directory';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { useEmployeeStore } from '@/lib/stores/employee-store';
import { useRetirementStore, calcRetirementPay } from '@/lib/stores/retirement-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useLeaveStore } from '@/lib/stores/leave-store';
import type { RetirementSettlement, RetirementReasonCode } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Calculator, FileText, Search, CheckCircle, DollarSign, Calendar, Users, ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

const REASON_LABELS: Record<RetirementReasonCode, string> = {
  voluntary: '자발적 퇴직',
  contract_end: '계약만료',
  retirement_age: '정년퇴직',
  layoff: '정리해고',
  misconduct: '징계해고',
  other: '기타',
};

const fmtWon = (n: number) => new Intl.NumberFormat('ko-KR').format(n) + '원';
const fmtNum = (n: number) => new Intl.NumberFormat('ko-KR').format(n);

export default function RetirementPage() {
  const annualTypeId = useAnnualLeaveTypeId();
  const employees = useEmployeeStore((s) => s.employees);
  const departments = useEmployeeStore((s) => s.departments);
  const positionRanks = useEmployeeStore((s) => s.positionRanks);
  const leaveBalances = useLeaveStore((s) => s.leaveBalances);
  const session = useAuthStore((s) => s.session);
  const settlements = useRetirementStore((s) => s.settlements);
  const upsertSettlement = useRetirementStore((s) => s.upsertSettlement);
  const updateStatus = useRetirementStore((s) => s.updateStatus);
  const deleteSettlement = useRetirementStore((s) => s.deleteSettlement);

  const [searchText, setSearchText] = useState('');
  const [calcDialogOpen, setCalcDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    employee_id: '',
    hire_date: '',
    resignation_date: '',
    reason_code: 'voluntary' as RetirementReasonCode,
    reason_detail: '',
    base_salary_avg: 0,
    bonus_avg: 0,
    annual_leave_compensation: 0,
    bank_name: '',
    bank_account: '',
    note: '',
  });

  // 퇴직자 후보 (status === resigned)
  const resignedEmployees = useMemo(() => {
    return employees
      .filter((e) => e.status === 'resigned')
      .map((e) => {
        const dept = departments.find((d) => d.id === e.department_id);
        const rank = positionRanks.find((r) => r.id === e.position_rank_id);
        const settlement = settlements.find((s) => s.employee_id === e.id);
        return { ...e, dept, rank, settlement };
      })
      .filter((e) => {
        if (!searchText) return true;
        const q = searchText.toLowerCase();
        return e.name.toLowerCase().includes(q) || e.employee_number.toLowerCase().includes(q);
      })
      .sort((a, b) => (b.resignation_date ?? '').localeCompare(a.resignation_date ?? ''));
  }, [employees, departments, positionRanks, settlements, searchText]);

  // 통계
  const stats = useMemo(() => {
    const total = settlements.length;
    const draft = settlements.filter((s) => s.status === 'draft').length;
    const confirmed = settlements.filter((s) => s.status === 'confirmed').length;
    const paid = settlements.filter((s) => s.status === 'paid').length;
    const totalPaid = settlements.filter((s) => s.status === 'paid').reduce((sum, s) => sum + s.net_pay, 0);
    const pending = resignedEmployees.filter((e) => !e.settlement).length;
    return { total, draft, confirmed, paid, totalPaid, pending };
  }, [settlements, resignedEmployees]);

  // 미사용 연차 수당 자동 계산
  const calcAnnualCompensation = (employeeId: string, baseSalary: number): number => {
    const year = new Date().getFullYear();
    const balance = leaveBalances.find((b) => b.employee_id === employeeId && b.year === year && b.leave_type_id === annualTypeId);
    if (!balance) return 0;
    // 일평균임금 × 잔여 연차일수
    const daily = Math.round(baseSalary / 30);
    return daily * balance.remaining_days;
  };

  const openCalcDialog = (employee: typeof resignedEmployees[0]) => {
    const existing = employee.settlement;
    setEditingId(existing?.id ?? null);
    if (existing) {
      setForm({
        employee_id: existing.employee_id,
        hire_date: existing.hire_date,
        resignation_date: existing.resignation_date,
        reason_code: existing.reason_code,
        reason_detail: existing.reason_detail ?? '',
        base_salary_avg: existing.base_salary_avg,
        bonus_avg: existing.bonus_avg,
        annual_leave_compensation: existing.annual_leave_compensation,
        bank_name: existing.bank_name ?? '',
        bank_account: existing.bank_account ?? '',
        note: existing.note ?? '',
      });
    } else {
      const annualComp = calcAnnualCompensation(employee.id, employee.base_salary);
      setForm({
        employee_id: employee.id,
        hire_date: employee.hire_date,
        resignation_date: employee.resignation_date ?? new Date().toISOString().split('T')[0],
        reason_code: 'voluntary',
        reason_detail: '',
        base_salary_avg: employee.base_salary,
        bonus_avg: Math.round(employee.base_salary * 0.5 / 12), // 가정: 연 6개월 상여
        annual_leave_compensation: annualComp,
        bank_name: employee.bank_name ?? '',
        bank_account: employee.bank_account ?? '',
        note: '',
      });
    }
    setCalcDialogOpen(true);
  };

  // 계산 결과 (실시간)
  const calcResult = useMemo(() => {
    if (!form.hire_date || !form.resignation_date) return null;
    return calcRetirementPay({
      baseSalaryAvg: form.base_salary_avg,
      bonusAvg: form.bonus_avg,
      annualLeaveCompensation: form.annual_leave_compensation,
      hireDate: form.hire_date,
      resignationDate: form.resignation_date,
    });
  }, [form]);

  const handleSave = () => {
    if (!form.employee_id || !form.hire_date || !form.resignation_date) {
      toast.error('필수 항목을 입력하세요.');
      return;
    }
    if (!calcResult) {
      toast.error('계산 결과가 없습니다.');
      return;
    }
    const now = new Date().toISOString();
    const existing = editingId ? settlements.find((s) => s.id === editingId) : null;
    upsertSettlement({
      id: editingId ?? `rs-${Date.now()}`,
      employee_id: form.employee_id,
      hire_date: form.hire_date,
      resignation_date: form.resignation_date,
      reason_code: form.reason_code,
      reason_detail: form.reason_detail || null,
      base_salary_avg: form.base_salary_avg,
      bonus_avg: form.bonus_avg,
      annual_leave_compensation: form.annual_leave_compensation,
      service_days: calcResult.serviceDays,
      service_years: calcResult.serviceYears,
      daily_avg_wage: calcResult.dailyAvgWage,
      retirement_pay: calcResult.retirementPay,
      income_tax: calcResult.incomeTax,
      local_tax: calcResult.localTax,
      net_pay: calcResult.netPay,
      status: existing?.status ?? 'draft',
      paid_at: existing?.paid_at ?? null,
      paid_by: existing?.paid_by ?? null,
      paid_by_name: existing?.paid_by_name ?? null,
      bank_name: form.bank_name || null,
      bank_account: form.bank_account || null,
      note: form.note || null,
      created_at: existing?.created_at ?? now,
      updated_at: now,
    });
    toast.success(editingId ? '퇴직정산이 수정되었습니다.' : '퇴직정산이 작성되었습니다.');
    setCalcDialogOpen(false);
  };

  const handleConfirm = (s: RetirementSettlement) => {
    if (window.confirm('퇴직정산을 확정하시겠습니까? 확정 후에는 지급 처리만 가능합니다.')) {
      updateStatus(s.id, 'confirmed');
      toast.success('퇴직정산이 확정되었습니다.');
    }
  };

  const handlePay = (s: RetirementSettlement) => {
    if (window.confirm(`${fmtWon(s.net_pay)}을 지급 처리하시겠습니까?`)) {
      updateStatus(s.id, 'paid', session?.employee_id ?? '', session?.user_name ?? '관리자');
      toast.success('퇴직금이 지급 처리되었습니다.');
    }
  };

  return (
    <div>
      <Breadcrumb />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">퇴직 관리</h1>
        <Link href="/employees">
          <Button variant="outline"><ArrowLeft className="h-4 w-4 mr-2" />사원 목록</Button>
        </Link>
      </div>

      {/* 통계 카드 */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-5 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">퇴직자 (전체)</p>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-xl font-bold">{resignedEmployees.length}명</p>
          </CardContent>
        </Card>
        <Card className={stats.pending > 0 ? 'border-amber-300' : ''}>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground mb-1">정산 대기</p>
            <p className={`text-xl font-bold ${stats.pending > 0 ? 'text-amber-600' : ''}`}>{stats.pending}명</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground mb-1">정산 작성중</p>
            <p className="text-xl font-bold text-blue-600">{stats.draft}건</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground mb-1">지급완료</p>
            <p className="text-xl font-bold text-green-600">{stats.paid}건</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground mb-1">총 지급액</p>
            <p className="text-lg font-bold">{fmtWon(stats.totalPaid)}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all">
        <TabsList className="mb-4">
          <TabsTrigger value="all">퇴직자 목록</TabsTrigger>
          <TabsTrigger value="settlements">정산 내역 ({settlements.length})</TabsTrigger>
        </TabsList>

        {/* 퇴직자 목록 */}
        <TabsContent value="all">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9 w-[280px]" placeholder="이름/사번 검색" value={searchText}
                onChange={(e) => setSearchText(e.target.value)} />
            </div>
          </div>

          <Card>
            <CardContent className="pt-4">
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>사번</TableHead>
                      <TableHead>이름</TableHead>
                      <TableHead>부서</TableHead>
                      <TableHead>직급</TableHead>
                      <TableHead>입사일</TableHead>
                      <TableHead>퇴사일</TableHead>
                      <TableHead className="text-right">기본급</TableHead>
                      <TableHead>정산상태</TableHead>
                      <TableHead className="text-right">관리</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resignedEmployees.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          퇴직자가 없습니다.
                        </TableCell>
                      </TableRow>
                    ) : resignedEmployees.map((emp) => (
                      <TableRow key={emp.id}>
                        <TableCell className="font-mono text-xs">{emp.employee_number}</TableCell>
                        <TableCell className="font-medium">{emp.name}</TableCell>
                        <TableCell className="text-sm">{emp.dept?.name ?? '-'}</TableCell>
                        <TableCell className="text-sm">{emp.rank?.name ?? '-'}</TableCell>
                        <TableCell className="text-xs">{emp.hire_date}</TableCell>
                        <TableCell className="text-xs">{emp.resignation_date ?? '-'}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{fmtNum(emp.base_salary)}</TableCell>
                        <TableCell>
                          {emp.settlement ? (
                            <Badge
                              variant={emp.settlement.status === 'paid' ? 'default' : emp.settlement.status === 'confirmed' ? 'secondary' : 'outline'}
                              className="text-xs"
                            >
                              {emp.settlement.status === 'paid' ? '지급완료' : emp.settlement.status === 'confirmed' ? '확정' : '작성중'}
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="text-xs">미정산</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button
                              size="sm" variant="outline" className="h-7 text-xs"
                              onClick={() => openCalcDialog(emp)}
                            >
                              <Calculator className="h-3 w-3 mr-1" />
                              {emp.settlement ? '수정' : '정산 작성'}
                            </Button>
                            <Link href={`/employees/${emp.id}/certificates/retirement`}>
                              <Button size="sm" variant="ghost" className="h-7 text-xs">
                                <FileText className="h-3 w-3 mr-1" />증명서
                              </Button>
                            </Link>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 정산 내역 */}
        <TabsContent value="settlements">
          <Card>
            <CardContent className="pt-4">
              {settlements.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">아직 작성된 퇴직정산이 없습니다.</p>
              ) : (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>퇴사일</TableHead>
                        <TableHead>대상자</TableHead>
                        <TableHead>퇴직사유</TableHead>
                        <TableHead className="text-right">근속</TableHead>
                        <TableHead className="text-right">법정퇴직금</TableHead>
                        <TableHead className="text-right">실수령</TableHead>
                        <TableHead>상태</TableHead>
                        <TableHead>지급</TableHead>
                        <TableHead className="text-right">관리</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {settlements.map((s) => {
                        const emp = employees.find((e) => e.id === s.employee_id);
                        const dept = emp ? departments.find((d) => d.id === emp.department_id) : null;
                        return (
                          <TableRow key={s.id}>
                            <TableCell className="text-xs font-medium">{s.resignation_date}</TableCell>
                            <TableCell>
                              <p className="font-medium text-sm">{emp?.name ?? s.employee_id}</p>
                              <p className="text-[10px] text-muted-foreground">{dept?.name}</p>
                            </TableCell>
                            <TableCell className="text-sm">
                              <Badge variant="outline" className="text-xs">{REASON_LABELS[s.reason_code]}</Badge>
                            </TableCell>
                            <TableCell className="text-right text-xs">
                              <p className="font-bold">{s.service_years}년</p>
                              <p className="text-muted-foreground">({s.service_days}일)</p>
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">{fmtNum(s.retirement_pay)}</TableCell>
                            <TableCell className="text-right font-mono text-sm font-bold">{fmtNum(s.net_pay)}</TableCell>
                            <TableCell>
                              <Badge
                                variant={s.status === 'paid' ? 'default' : s.status === 'confirmed' ? 'secondary' : 'outline'}
                                className="text-xs"
                              >
                                {s.status === 'paid' ? '지급완료' : s.status === 'confirmed' ? '확정' : '작성중'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs">
                              {s.paid_at ? s.paid_at.slice(0, 10) : '-'}
                              {s.paid_by_name && <p className="text-[10px] text-muted-foreground">{s.paid_by_name}</p>}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-1 justify-end">
                                {s.status === 'draft' && (
                                  <Button size="sm" variant="outline" className="h-7 text-xs"
                                    onClick={() => handleConfirm(s)}>
                                    <CheckCircle className="h-3 w-3 mr-1" />확정
                                  </Button>
                                )}
                                {s.status === 'confirmed' && (
                                  <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700"
                                    onClick={() => handlePay(s)}>
                                    <DollarSign className="h-3 w-3 mr-1" />지급
                                  </Button>
                                )}
                                <Button size="sm" variant="ghost" className="h-7 text-xs"
                                  onClick={() => {
                                    const e = employees.find((x) => x.id === s.employee_id);
                                    if (e) openCalcDialog({
                                      ...e,
                                      dept: departments.find((d) => d.id === e.department_id),
                                      rank: positionRanks.find((r) => r.id === e.position_rank_id),
                                      settlement: s,
                                    });
                                  }}>
                                  보기
                                </Button>
                                {s.status === 'draft' && (
                                  <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive"
                                    onClick={() => {
                                      if (window.confirm('삭제하시겠습니까?')) {
                                        deleteSettlement(s.id);
                                        toast.success('삭제되었습니다.');
                                      }
                                    }}>
                                    삭제
                                  </Button>
                                )}
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
        </TabsContent>
      </Tabs>

      {/* 퇴직정산 계산 다이얼로그 */}
      <Dialog open={calcDialogOpen} onOpenChange={setCalcDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? '퇴직정산 수정' : '퇴직정산 작성'}</DialogTitle>
            <DialogDescription>
              {employees.find((e) => e.id === form.employee_id)?.name ?? ''}님의 퇴직금을 계산합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* 기본 정보 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>입사일 *</Label>
                <Input type="date" value={form.hire_date}
                  onChange={(e) => setForm((p) => ({ ...p, hire_date: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>퇴사일 *</Label>
                <Input type="date" value={form.resignation_date}
                  onChange={(e) => setForm((p) => ({ ...p, resignation_date: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>퇴직 사유 *</Label>
                <Select value={form.reason_code}
                  onValueChange={(v) => setForm((p) => ({ ...p, reason_code: v as RetirementReasonCode }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(REASON_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>사유 상세</Label>
                <Input value={form.reason_detail}
                  onChange={(e) => setForm((p) => ({ ...p, reason_detail: e.target.value }))}
                  placeholder="예) 이직, 학업 등" />
              </div>
            </div>

            <Separator />

            {/* 평균임금 산정 */}
            <div>
              <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                평균임금 산정 (퇴직 직전 3개월 기준)
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>월 평균 기본급</Label>
                  <Input type="number" value={form.base_salary_avg}
                    onChange={(e) => setForm((p) => ({ ...p, base_salary_avg: Number(e.target.value) }))} />
                </div>
                <div className="space-y-2">
                  <Label>월 평균 상여금</Label>
                  <Input type="number" value={form.bonus_avg}
                    onChange={(e) => setForm((p) => ({ ...p, bonus_avg: Number(e.target.value) }))} />
                  <p className="text-[10px] text-muted-foreground">연간 상여 / 12</p>
                </div>
                <div className="space-y-2">
                  <Label>미사용 연차수당</Label>
                  <Input type="number" value={form.annual_leave_compensation}
                    onChange={(e) => setForm((p) => ({ ...p, annual_leave_compensation: Number(e.target.value) }))} />
                  <p className="text-[10px] text-muted-foreground">자동계산: 일평균임금 × 잔여일수</p>
                </div>
              </div>
            </div>

            {/* 계산 결과 */}
            {calcResult && (
              <div className="p-4 rounded-lg bg-blue-50 space-y-2">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  계산 결과
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-muted-foreground">총 근속일수</span>
                    <span className="font-mono">{fmtNum(calcResult.serviceDays)}일</span>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-muted-foreground">근속연수</span>
                    <span className="font-mono">{calcResult.serviceYears}년</span>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-muted-foreground">1일 평균임금</span>
                    <span className="font-mono">{fmtNum(calcResult.dailyAvgWage)}원</span>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-muted-foreground">법정퇴직금</span>
                    <span className="font-mono font-bold">{fmtNum(calcResult.retirementPay)}원</span>
                  </div>
                  <div className="flex justify-between border-b pb-1 text-destructive">
                    <span className="text-muted-foreground">퇴직소득세</span>
                    <span className="font-mono">-{fmtNum(calcResult.incomeTax)}원</span>
                  </div>
                  <div className="flex justify-between border-b pb-1 text-destructive">
                    <span className="text-muted-foreground">지방소득세</span>
                    <span className="font-mono">-{fmtNum(calcResult.localTax)}원</span>
                  </div>
                </div>
                <div className="flex justify-between pt-2 border-t-2 border-black">
                  <span className="text-base font-bold">실수령액</span>
                  <span className="font-mono text-lg font-bold text-blue-600">{fmtWon(calcResult.netPay)}</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  ※ 법정퇴직금 = (일평균임금 × 30일) × (근속일수 / 365). 실제 정산은 회사 규정에 따름.
                </p>
              </div>
            )}

            <Separator />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>지급 은행</Label>
                <Input value={form.bank_name}
                  onChange={(e) => setForm((p) => ({ ...p, bank_name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>계좌번호</Label>
                <Input value={form.bank_account}
                  onChange={(e) => setForm((p) => ({ ...p, bank_account: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>비고</Label>
              <Textarea value={form.note}
                onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
                rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCalcDialogOpen(false)}>취소</Button>
            <Button onClick={handleSave}>{editingId ? '수정 저장' : '정산 작성'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
