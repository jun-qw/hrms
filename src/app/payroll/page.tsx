'use client';

import { useState, useMemo } from 'react';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { PayrollRegister } from '@/components/payroll/payroll-register';
import { usePayrollStore } from '@/lib/stores/payroll-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calculator, FileText, CheckCircle, DollarSign, TrendingUp, Users, BarChart3, Settings2, Lock, Unlock } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import Link from 'next/link';

const fmtWon = (n: number) => new Intl.NumberFormat('ko-KR').format(n) + '원';

export default function PayrollPage() {
  const savedPayrolls = usePayrollStore((s) => s.savedPayrolls);
  const updatePayrollStatus = usePayrollStore((s) => s.updatePayrollStatus);

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
      <PayrollRegister year={Number(filterYear)} month={filterMonth === 'all' ? 'all' : Number(filterMonth)} />
    </div>
  );
}
