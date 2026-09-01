'use client';

import { useState, useMemo } from 'react';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { usePayrollStore, MONTHLY_WORK_HOURS } from '@/lib/stores/payroll-store';
import { useEmployeeStore } from '@/lib/stores/employee-store';
import { useSettingsStore } from '@/lib/stores/settings-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Printer, ArrowLeft, FileText } from 'lucide-react';
import Link from 'next/link';

const fmtWon = (n: number) => new Intl.NumberFormat('ko-KR').format(n);

export default function WithholdingTaxPage() {
  const session = useAuthStore((s) => s.session);
  const myId = session?.employee_id ?? '';
  const employees = useEmployeeStore((s) => s.employees);
  const departments = useEmployeeStore((s) => s.departments);
  const positionRanks = useEmployeeStore((s) => s.positionRanks);
  const savedPayrolls = usePayrollStore((s) => s.savedPayrolls);
  const company = useSettingsStore((s) => s.company);
  const workplaces = useSettingsStore((s) => s.workplaces);
  const payrollConfig = useSettingsStore((s) => s.payroll);

  const isAdmin = session?.role === 'admin' || session?.role === 'hr_manager';
  const [selectedEmpId, setSelectedEmpId] = useState(myId);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const emp = employees.find((e) => e.id === selectedEmpId);
  const dept = emp ? departments.find((d) => d.id === emp.department_id) : undefined;
  const rank = emp ? positionRanks.find((r) => r.id === emp.position_rank_id) : undefined;
  const hqWorkplace = workplaces.find((wp) => wp.is_headquarters) ?? workplaces[0];

  // Payrolls for selected year
  const yearPayrolls = useMemo(() => {
    return savedPayrolls
      .filter((p) => p.employee_id === selectedEmpId && p.year === selectedYear)
      .sort((a, b) => a.month - b.month);
  }, [savedPayrolls, selectedEmpId, selectedYear]);

  // Aggregate yearly totals
  const yearlyTotals = useMemo(() => {
    const months: {
      month: number;
      baseSalary: number;
      totalEarnings: number;
      totalDeductions: number;
      netPay: number;
      pension: number;
      health: number;
      longterm: number;
      employment: number;
      incomeTax: number;
      localTax: number;
      nonTaxable: number;
    }[] = [];

    for (const p of yearPayrolls) {
      const pension = p.items.find((i) => i.item_id === 'pi-pension')?.amount ?? 0;
      const health = p.items.find((i) => i.item_id === 'pi-health')?.amount ?? 0;
      const longterm = p.items.find((i) => i.item_id === 'pi-longterm')?.amount ?? 0;
      const employment = p.items.find((i) => i.item_id === 'pi-employment')?.amount ?? 0;
      const incomeTax = p.items.find((i) => i.item_id === 'pi-incometax')?.amount ?? 0;
      const localTax = p.items.find((i) => i.item_id === 'pi-localtax')?.amount ?? 0;
      const nonTaxable = p.items.filter((i) => i.category === 'earning' && !i.is_taxable).reduce((s, i) => s + i.amount, 0);

      months.push({
        month: p.month,
        baseSalary: p.base_salary,
        totalEarnings: p.total_earnings,
        totalDeductions: p.total_deductions,
        netPay: p.net_pay,
        pension, health, longterm, employment, incomeTax, localTax, nonTaxable,
      });
    }

    const sum = (key: keyof typeof months[0]) => months.reduce((s, m) => s + (m[key] as number), 0);
    return {
      months,
      annualEarnings: sum('totalEarnings'),
      annualDeductions: sum('totalDeductions'),
      annualNetPay: sum('netPay'),
      annualPension: sum('pension'),
      annualHealth: sum('health'),
      annualLongterm: sum('longterm'),
      annualEmployment: sum('employment'),
      annualIncomeTax: sum('incomeTax'),
      annualLocalTax: sum('localTax'),
      annualNonTaxable: sum('nonTaxable'),
      annualBaseSalary: sum('baseSalary'),
    };
  }, [yearPayrolls]);

  const today = new Date();
  const todayStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;

  if (!emp) {
    return (
      <div>
        <Breadcrumb />
        <p className="text-center text-muted-foreground py-20">사원 정보를 찾을 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Controls - no-print */}
      <div className="no-print">
        <Breadcrumb />
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">원천징수부</h1>
          <div className="flex gap-2">
            <Link href="/my">
              <Button variant="outline"><ArrowLeft className="h-4 w-4 mr-2" />마이페이지</Button>
            </Link>
            <Button onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" />인쇄
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">연도</span>
            <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
              <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[2024, 2025, 2026].map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}년</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">직원</span>
              <Select value={selectedEmpId} onValueChange={setSelectedEmpId}>
                <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {employees.filter((e) => e.status === 'active').sort((a, b) => a.name.localeCompare(b.name)).map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.name} ({e.employee_number})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {yearPayrolls.length === 0 && (
            <Badge variant="destructive">해당 연도 급여 데이터 없음</Badge>
          )}
        </div>
      </div>

      {/* Print area */}
      <Card className="max-w-5xl mx-auto print-area">
        <CardContent className="p-6">
          {/* Header */}
          <div className="text-center border-b-2 border-black pb-3 mb-4">
            <h2 className="text-xl font-bold tracking-widest">원 천 징 수 부</h2>
            <p className="text-sm text-muted-foreground mt-1">{selectedYear}년 귀속</p>
          </div>

          {/* Business & Employee Info */}
          <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
            <div className="border rounded p-3 space-y-1">
              <p className="font-bold text-xs text-muted-foreground mb-2">[ 원천징수의무자 (사업장) ]</p>
              <div className="grid grid-cols-[80px_1fr] gap-y-1">
                <span className="text-xs text-muted-foreground">상호(법인명)</span>
                <span className="font-medium">{hqWorkplace?.name ?? company.name}</span>
                <span className="text-xs text-muted-foreground">사업자번호</span>
                <span className="font-mono">{hqWorkplace?.business_number ?? company.business_number}</span>
                <span className="text-xs text-muted-foreground">대표자</span>
                <span>{hqWorkplace?.representative ?? company.ceo_name}</span>
                <span className="text-xs text-muted-foreground">소재지</span>
                <span className="text-xs">{hqWorkplace?.address ?? company.address}</span>
                <span className="text-xs text-muted-foreground">관할세무서</span>
                <span>{hqWorkplace?.tax_office ?? '-'}</span>
                <span className="text-xs text-muted-foreground">업태/종목</span>
                <span className="text-xs">{hqWorkplace?.industry_type ?? ''} / {hqWorkplace?.business_type ?? ''}</span>
              </div>
            </div>
            <div className="border rounded p-3 space-y-1">
              <p className="font-bold text-xs text-muted-foreground mb-2">[ 소득자 ]</p>
              <div className="grid grid-cols-[80px_1fr] gap-y-1">
                <span className="text-xs text-muted-foreground">성명</span>
                <span className="font-medium">{emp.name}</span>
                <span className="text-xs text-muted-foreground">사원번호</span>
                <span className="font-mono">{emp.employee_number}</span>
                <span className="text-xs text-muted-foreground">부서/직급</span>
                <span>{dept?.name ?? '-'} / {rank?.name ?? '-'}</span>
                <span className="text-xs text-muted-foreground">입사일</span>
                <span>{emp.hire_date}</span>
                <span className="text-xs text-muted-foreground">주소</span>
                <span className="text-xs">{emp.address ?? '-'}</span>
              </div>
            </div>
          </div>

          {/* Monthly breakdown table */}
          <div className="border rounded overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border-r px-2 py-1.5 text-center" rowSpan={2}>월</th>
                  <th className="border-r px-2 py-1.5 text-center" colSpan={3}>지급액</th>
                  <th className="border-r px-2 py-1.5 text-center" colSpan={4}>4대보험 (근로자부담)</th>
                  <th className="border-r px-2 py-1.5 text-center" colSpan={2}>세금</th>
                  <th className="px-2 py-1.5 text-center">차인지급액</th>
                </tr>
                <tr className="bg-gray-50">
                  <th className="border-r border-t px-1 py-1 text-center">총 지급</th>
                  <th className="border-r border-t px-1 py-1 text-center">비과세</th>
                  <th className="border-r border-t px-1 py-1 text-center">과세소득</th>
                  <th className="border-r border-t px-1 py-1 text-center">국민연금</th>
                  <th className="border-r border-t px-1 py-1 text-center">건강보험</th>
                  <th className="border-r border-t px-1 py-1 text-center">장기요양</th>
                  <th className="border-r border-t px-1 py-1 text-center">고용보험</th>
                  <th className="border-r border-t px-1 py-1 text-center">소득세</th>
                  <th className="border-r border-t px-1 py-1 text-center">지방소득세</th>
                  <th className="border-t px-1 py-1 text-center">실수령</th>
                </tr>
              </thead>
              <tbody>
                {yearlyTotals.months.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="text-center py-6 text-muted-foreground">해당 연도 급여 데이터가 없습니다.</td>
                  </tr>
                ) : (
                  <>
                    {yearlyTotals.months.map((m) => {
                      const taxable = m.totalEarnings - m.nonTaxable;
                      return (
                        <tr key={m.month} className="border-t hover:bg-muted/30">
                          <td className="border-r px-2 py-1.5 text-center font-medium">{m.month}월</td>
                          <td className="border-r px-1 py-1.5 text-right font-mono">{fmtWon(m.totalEarnings)}</td>
                          <td className="border-r px-1 py-1.5 text-right font-mono">{fmtWon(m.nonTaxable)}</td>
                          <td className="border-r px-1 py-1.5 text-right font-mono">{fmtWon(taxable)}</td>
                          <td className="border-r px-1 py-1.5 text-right font-mono">{fmtWon(m.pension)}</td>
                          <td className="border-r px-1 py-1.5 text-right font-mono">{fmtWon(m.health)}</td>
                          <td className="border-r px-1 py-1.5 text-right font-mono">{fmtWon(m.longterm)}</td>
                          <td className="border-r px-1 py-1.5 text-right font-mono">{fmtWon(m.employment)}</td>
                          <td className="border-r px-1 py-1.5 text-right font-mono">{fmtWon(m.incomeTax)}</td>
                          <td className="border-r px-1 py-1.5 text-right font-mono">{fmtWon(m.localTax)}</td>
                          <td className="px-1 py-1.5 text-right font-mono font-bold">{fmtWon(m.netPay)}</td>
                        </tr>
                      );
                    })}
                    {/* Annual total row */}
                    <tr className="border-t-2 border-black font-bold bg-gray-50">
                      <td className="border-r px-2 py-2 text-center">합계</td>
                      <td className="border-r px-1 py-2 text-right font-mono">{fmtWon(yearlyTotals.annualEarnings)}</td>
                      <td className="border-r px-1 py-2 text-right font-mono">{fmtWon(yearlyTotals.annualNonTaxable)}</td>
                      <td className="border-r px-1 py-2 text-right font-mono">{fmtWon(yearlyTotals.annualEarnings - yearlyTotals.annualNonTaxable)}</td>
                      <td className="border-r px-1 py-2 text-right font-mono">{fmtWon(yearlyTotals.annualPension)}</td>
                      <td className="border-r px-1 py-2 text-right font-mono">{fmtWon(yearlyTotals.annualHealth)}</td>
                      <td className="border-r px-1 py-2 text-right font-mono">{fmtWon(yearlyTotals.annualLongterm)}</td>
                      <td className="border-r px-1 py-2 text-right font-mono">{fmtWon(yearlyTotals.annualEmployment)}</td>
                      <td className="border-r px-1 py-2 text-right font-mono">{fmtWon(yearlyTotals.annualIncomeTax)}</td>
                      <td className="border-r px-1 py-2 text-right font-mono">{fmtWon(yearlyTotals.annualLocalTax)}</td>
                      <td className="px-1 py-2 text-right font-mono">{fmtWon(yearlyTotals.annualNetPay)}</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>

          {/* Insurance rates footnote */}
          <div className="mt-4 text-xs text-muted-foreground space-y-1">
            <p>* 4대보험 요율 (근로자 부담): 국민연금 {payrollConfig.national_pension_rate}%, 건강보험 {payrollConfig.health_insurance_rate}%, 장기요양 건강보험의 {payrollConfig.long_term_care_rate}%, 고용보험 {payrollConfig.employment_insurance_rate}%</p>
            <p>* 비과세 항목: 식대 월 {fmtWon(payrollConfig.meal_allowance_limit)}원 한도, 교통비 월 {fmtWon(payrollConfig.transport_allowance_limit)}원 한도</p>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-4 border-t-2 border-black text-center">
            <p className="text-sm">위 내용이 사실과 틀림없음을 확인합니다.</p>
            <p className="text-sm mt-4">{todayStr}</p>
            <p className="text-base font-bold mt-3">{company.name}</p>
            <p className="text-sm text-muted-foreground">{company.ceo_name}</p>
            <div className="mt-3 inline-block border-2 border-red-400 rounded-full px-6 py-2 text-red-400 text-sm font-bold opacity-50">
              직 인
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
