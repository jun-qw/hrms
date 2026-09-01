'use client';

import { useState, useMemo } from 'react';
import { useEmployeeDirectory } from '@/lib/hooks/use-employee-directory';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { usePayrollStore } from '@/lib/stores/payroll-store';
import { useCodeMap, CODE } from '@/lib/hooks/use-code';
import type { PayrollStatus } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calculator, FileText, CheckCircle, Trash2, DollarSign, TrendingUp, Users, BarChart3, Settings2, Lock, Unlock, FileUp } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import Link from 'next/link';

const fmtWon = (n: number) => new Intl.NumberFormat('ko-KR').format(n) + '원';

const statusVariant = (s: string): 'default' | 'secondary' | 'outline' => {
  switch (s) {
    case 'paid': return 'default';
    case 'confirmed': return 'secondary';
    default: return 'outline';
  }
};

export default function PayrollPage() {
  const directory = useEmployeeDirectory();
  const PAYROLL_STATUS = useCodeMap(CODE.PAYROLL_STATUS);
  const savedPayrolls = usePayrollStore((s) => s.savedPayrolls);
  const updatePayrollStatus = usePayrollStore((s) => s.updatePayrollStatus);
  const deletePayroll = usePayrollStore((s) => s.deletePayroll);

  const [filterYear, setFilterYear] = useState('2026');
  const [filterMonth, setFilterMonth] = useState('all');

  // Monthly close status - derived from payroll data
  const monthlyCloseStatus = useMemo(() => {
    if (filterMonth === 'all') return null;
    const monthPayrolls = savedPayrolls.filter(
      (p) => p.year === Number(filterYear) && p.month === Number(filterMonth)
    );
    if (monthPayrolls.length === 0) return null;
    const allConfirmedOrPaid = monthPayrolls.every((p) => p.status === 'confirmed' || p.status === 'paid');
    const allPaid = monthPayrolls.every((p) => p.status === 'paid');
    return {
      total: monthPayrolls.length,
      confirmed: monthPayrolls.filter((p) => p.status === 'confirmed').length,
      paid: monthPayrolls.filter((p) => p.status === 'paid').length,
      draft: monthPayrolls.filter((p) => p.status === 'draft').length,
      isClosed: allConfirmedOrPaid,
      isPaid: allPaid,
    };
  }, [savedPayrolls, filterYear, filterMonth]);

  const handleMonthlyClose = () => {
    const monthPayrolls = savedPayrolls.filter(
      (p) => p.year === Number(filterYear) && p.month === Number(filterMonth) && p.status === 'draft'
    );
    for (const p of monthPayrolls) {
      updatePayrollStatus(p.id, 'confirmed');
    }
    toast.success(`${filterYear}년 ${filterMonth}월 급여 ${monthPayrolls.length}건이 마감되었습니다.`);
  };

  const handleMonthlyReopen = () => {
    const monthPayrolls = savedPayrolls.filter(
      (p) => p.year === Number(filterYear) && p.month === Number(filterMonth) && p.status === 'confirmed'
    );
    for (const p of monthPayrolls) {
      updatePayrollStatus(p.id, 'draft');
    }
    toast.success(`${filterYear}년 ${filterMonth}월 급여 마감이 해제되었습니다.`);
  };

  const handleMonthlyPay = () => {
    const monthPayrolls = savedPayrolls.filter(
      (p) => p.year === Number(filterYear) && p.month === Number(filterMonth) && p.status === 'confirmed'
    );
    for (const p of monthPayrolls) {
      updatePayrollStatus(p.id, 'paid');
    }
    toast.success(`${filterYear}년 ${filterMonth}월 급여 ${monthPayrolls.length}건이 지급완료 처리되었습니다.`);
  };

  const filtered = useMemo(() => {
    return savedPayrolls
      .filter((p) => {
        if (p.year !== Number(filterYear)) return false;
        if (filterMonth !== 'all' && p.month !== Number(filterMonth)) return false;
        return true;
      })
      .sort((a, b) => {
        if (a.month !== b.month) return b.month - a.month;
        return a.employee_id.localeCompare(b.employee_id);
      });
  }, [savedPayrolls, filterYear, filterMonth]);

  const totalEarnings = filtered.reduce((s, p) => s + p.total_earnings, 0);
  const totalDeductions = filtered.reduce((s, p) => s + p.total_deductions, 0);
  const totalNetPay = filtered.reduce((s, p) => s + p.net_pay, 0);

  const handleStatusChange = (id: string, status: PayrollStatus) => {
    updatePayrollStatus(id, status);
    toast.success(`급여 상태가 "${PAYROLL_STATUS[status]}"(으)로 변경되었습니다.`);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('이 급여 기록을 삭제하시겠습니까?')) {
      deletePayroll(id);
      toast.success('급여 기록이 삭제되었습니다.');
    }
  };

  return (
    <div>
      <Breadcrumb />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">급여관리</h1>
        <div className="flex gap-2">
          <Link href="/payroll/settings">
            <Button variant="outline">
              <Settings2 className="h-4 w-4 mr-2" />
              개인별 기준정보
            </Button>
          </Link>
          <Link href="/payroll/dashboard">
            <Button variant="outline">
              <BarChart3 className="h-4 w-4 mr-2" />
              대시보드
            </Button>
          </Link>
          <Link href="/payroll/withholding-tax">
            <Button variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              원천징수부
            </Button>
          </Link>
          <Link href="/payroll/calculate">
            <Button>
              <Calculator className="h-4 w-4 mr-2" />
              급여 계산
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">총 지급액</CardTitle>
            <div className="p-2 rounded-lg bg-accent-green-subtle text-accent-green">
              <DollarSign className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{fmtWon(totalEarnings)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">총 공제액</CardTitle>
            <div className="p-2 rounded-lg bg-accent-blue-subtle text-accent-blue">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-destructive">{fmtWon(totalDeductions)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">총 실수령액</CardTitle>
            <div className="p-2 rounded-lg bg-accent-purple-subtle text-accent-purple">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-primary">{fmtWon(totalNetPay)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4">
        <Select value={filterYear} onValueChange={setFilterYear}>
          <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="2025">2025</SelectItem>
            <SelectItem value="2026">2026</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterMonth} onValueChange={setFilterMonth}>
          <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            {Array.from({ length: 12 }, (_, i) => (
              <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}월</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground ml-2">{filtered.length}건</span>
      </div>

      {/* Monthly Status Bar */}
      {monthlyCloseStatus && filterMonth !== 'all' && (
        <Card className="mb-4">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  {monthlyCloseStatus.isPaid ? (
                    <Badge className="bg-green-600">지급완료</Badge>
                  ) : monthlyCloseStatus.isClosed ? (
                    <Badge className="bg-blue-600">마감완료</Badge>
                  ) : (
                    <Badge variant="outline">미마감</Badge>
                  )}
                  <span className="text-sm font-medium">{filterYear}년 {filterMonth}월 급여</span>
                </div>
                <Separator orientation="vertical" className="h-6" />
                <div className="flex gap-3 text-sm text-muted-foreground">
                  <span>전체 <strong>{monthlyCloseStatus.total}</strong>건</span>
                  <span>작성중 <strong className="text-orange-600">{monthlyCloseStatus.draft}</strong></span>
                  <span>확정 <strong className="text-blue-600">{monthlyCloseStatus.confirmed}</strong></span>
                  <span>지급완료 <strong className="text-green-600">{monthlyCloseStatus.paid}</strong></span>
                </div>
              </div>
              <div className="flex gap-2">
                {!monthlyCloseStatus.isClosed && monthlyCloseStatus.draft > 0 && (
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={handleMonthlyClose}>
                    <Lock className="h-3.5 w-3.5 mr-1.5" />
                    일괄 마감
                  </Button>
                )}
                {monthlyCloseStatus.isClosed && !monthlyCloseStatus.isPaid && (
                  <>
                    <Button size="sm" variant="outline" className="border-orange-500 text-orange-600 hover:bg-orange-50" onClick={handleMonthlyReopen}>
                      <Unlock className="h-3.5 w-3.5 mr-1.5" />
                      마감 해제
                    </Button>
                    <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={handleMonthlyPay}>
                      <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                      지급완료 처리
                    </Button>
                  </>
                )}
                {monthlyCloseStatus.isPaid && (
                  <Button size="sm" variant="outline" className="border-orange-500 text-orange-600 hover:bg-orange-50" onClick={handleMonthlyReopen}>
                    <Unlock className="h-3.5 w-3.5 mr-1.5" />
                    마감 해제 (재계산)
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payroll Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">급여 대장</CardTitle>
          {filtered.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => {
              const headers = ['이름', '부서', '기간', '기본급', '총지급액', '총공제액', '실수령액', '상태'];
              const rows = filtered.map((p) => {
                const emp = directory.find((e) => e.id === p.employee_id);
                return [
                  emp?.name ?? p.employee_id,
                  emp?.department ?? '',
                  `${p.year}년 ${p.month}월`,
                  p.base_salary,
                  p.total_earnings,
                  p.total_deductions,
                  p.net_pay,
                  PAYROLL_STATUS[p.status] ?? p.status,
                ].join(',');
              });
              const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n');
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `급여대장_${filterYear}년${filterMonth !== 'all' ? `_${filterMonth}월` : ''}.csv`;
              a.click();
              URL.revokeObjectURL(url);
              toast.success('급여대장이 다운로드되었습니다.');
            }}>
              <FileUp className="h-3.5 w-3.5 mr-1.5" />
              엑셀 다운로드
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이름</TableHead>
                  <TableHead>부서</TableHead>
                  <TableHead>기간</TableHead>
                  <TableHead className="text-right">기본급</TableHead>
                  <TableHead className="text-right">총 지급액</TableHead>
                  <TableHead className="text-right">총 공제액</TableHead>
                  <TableHead className="text-right">실수령액</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground">
                      해당 기간의 급여 기록이 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((p) => {
                    const emp = directory.find((e) => e.id === p.employee_id);
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{emp?.name ?? p.employee_id}</TableCell>
                        <TableCell>{emp?.department ?? ''}</TableCell>
                        <TableCell className="text-sm">{p.year}년 {p.month}월</TableCell>
                        <TableCell className="text-right font-mono text-sm">{fmtWon(p.base_salary)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{fmtWon(p.total_earnings)}</TableCell>
                        <TableCell className="text-right font-mono text-sm text-destructive">{fmtWon(p.total_deductions)}</TableCell>
                        <TableCell className="text-right font-mono text-sm font-bold">{fmtWon(p.net_pay)}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(p.status)} className="text-xs">
                            {PAYROLL_STATUS[p.status] ?? p.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Link href={`/payroll/payslip/${p.id}`}>
                              <Button variant="ghost" size="sm" className="h-7 px-2">
                                <FileText className="h-3 w-3" />
                              </Button>
                            </Link>
                            {p.status === 'draft' && (
                              <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => handleStatusChange(p.id, 'confirmed')}>
                                <CheckCircle className="h-3 w-3" />
                              </Button>
                            )}
                            {p.status === 'confirmed' && (
                              <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => handleStatusChange(p.id, 'paid')}>
                                <CheckCircle className="h-3 w-3 text-green-600" />
                              </Button>
                            )}
                            {p.status === 'draft' && (
                              <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => handleDelete(p.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
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
  );
}
