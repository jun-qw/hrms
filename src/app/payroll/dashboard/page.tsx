'use client';

import { useState, useMemo } from 'react';
import { useEmployeeDirectory } from '@/lib/hooks/use-employee-directory';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { usePayrollStore } from '@/lib/stores/payroll-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  BarChart3,
  PieChart as PieChartIcon,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';

const fmtWon = (n: number) => new Intl.NumberFormat('ko-KR').format(n) + '원';
const fmtM = (n: number) => new Intl.NumberFormat('ko-KR', { notation: 'compact', maximumFractionDigits: 1 }).format(n);

const CHART_COLORS = [
  'var(--color-accent-blue)',
  'var(--color-accent-amber)',
  'var(--color-accent-green)',
  'var(--color-accent-purple)',
  '#f97316', '#06b6d4', '#ec4899', '#84cc16',
  '#8b5cf6', '#f59e0b', '#10b981', '#ef4444',
];

const tooltipStyle = {
  backgroundColor: 'var(--color-background)',
  border: '1px solid var(--color-border)',
  borderRadius: '8px',
  fontSize: '12px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
};

const cursorStyle = { fill: 'var(--color-muted)', opacity: 0.5 };

type ChartView = 'trend' | 'department' | 'items' | 'distribution' | 'monthly';

export default function PayrollDashboardPage() {
  const directory = useEmployeeDirectory();
  const savedPayrolls = usePayrollStore((s) => s.savedPayrolls);

  const [filterYear, setFilterYear] = useState('all');
  const [filterMonthFrom, setFilterMonthFrom] = useState('1');
  const [filterMonthTo, setFilterMonthTo] = useState('12');
  const [chartView, setChartView] = useState<ChartView>('trend');
  const [deptFilter, setDeptFilter] = useState('all');

  // All unique departments
  const allDepartments = useMemo(() => {
    const deptSet = new Set<string>();
    for (const emp of directory) deptSet.add(emp.department);
    return Array.from(deptSet).sort();
  }, [directory]);

  // Filter payrolls
  const filtered = useMemo(() => {
    return savedPayrolls.filter((p) => {
      if (filterYear !== 'all' && p.year !== Number(filterYear)) return false;
      if (filterYear !== 'all') {
        if (p.month < Number(filterMonthFrom) || p.month > Number(filterMonthTo)) return false;
      }
      if (deptFilter !== 'all') {
        const emp = directory.find((e) => e.id === p.employee_id);
        if (emp?.department !== deptFilter) return false;
      }
      return true;
    });
  }, [savedPayrolls, filterYear, filterMonthFrom, filterMonthTo, deptFilter]);

  // Summary KPIs
  const summary = useMemo(() => {
    const totalEarnings = filtered.reduce((s, p) => s + p.total_earnings, 0);
    const totalDeductions = filtered.reduce((s, p) => s + p.total_deductions, 0);
    const totalNetPay = filtered.reduce((s, p) => s + p.net_pay, 0);
    const empCount = new Set(filtered.map((p) => p.employee_id)).size;
    const monthCount = new Set(filtered.map((p) => `${p.year}-${p.month}`)).size;
    const avgPerPerson = empCount > 0 && monthCount > 0 ? Math.round(totalNetPay / empCount / monthCount) : 0;
    return { totalEarnings, totalDeductions, totalNetPay, empCount, monthCount, avgPerPerson };
  }, [filtered]);

  // ---- Chart data generators ----

  // 1. Monthly trend
  const monthlyTrend = useMemo(() => {
    const map = new Map<string, { label: string; earnings: number; deductions: number; netPay: number; count: number }>();
    for (const p of filtered) {
      const key = `${p.year}-${String(p.month).padStart(2, '0')}`;
      const label = `${p.year}.${String(p.month).padStart(2, '0')}`;
      const entry = map.get(key) ?? { label, earnings: 0, deductions: 0, netPay: 0, count: 0 };
      entry.earnings += p.total_earnings;
      entry.deductions += p.total_deductions;
      entry.netPay += p.net_pay;
      entry.count++;
      map.set(key, entry);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);
  }, [filtered]);

  // 2. Department breakdown
  const deptBreakdown = useMemo(() => {
    const map = new Map<string, { department: string; earnings: number; deductions: number; netPay: number; count: number }>();
    for (const p of filtered) {
      const emp = directory.find((e) => e.id === p.employee_id);
      const dept = emp?.department ?? '기타';
      const entry = map.get(dept) ?? { department: dept, earnings: 0, deductions: 0, netPay: 0, count: 0 };
      entry.earnings += p.total_earnings;
      entry.deductions += p.total_deductions;
      entry.netPay += p.net_pay;
      entry.count++;
      map.set(dept, entry);
    }
    return Array.from(map.values()).sort((a, b) => b.netPay - a.netPay);
  }, [filtered, directory]);

  // 3. Item-level breakdown (aggregate all line items)
  const itemBreakdown = useMemo(() => {
    const earningMap = new Map<string, { name: string; total: number }>();
    const deductionMap = new Map<string, { name: string; total: number }>();
    for (const p of filtered) {
      for (const item of p.items) {
        const m = item.category === 'earning' ? earningMap : deductionMap;
        const entry = m.get(item.item_id) ?? { name: item.name, total: 0 };
        entry.total += item.amount;
        m.set(item.item_id, entry);
      }
    }
    return {
      earnings: Array.from(earningMap.values()).sort((a, b) => b.total - a.total),
      deductions: Array.from(deductionMap.values()).sort((a, b) => b.total - a.total),
    };
  }, [filtered]);

  // 4. Salary distribution (histogram)
  const salaryDistribution = useMemo(() => {
    // Group by salary range
    const ranges = [
      { label: '~300만', min: 0, max: 3000000 },
      { label: '300~400만', min: 3000000, max: 4000000 },
      { label: '400~500만', min: 4000000, max: 5000000 },
      { label: '500~600만', min: 5000000, max: 6000000 },
      { label: '600~700만', min: 6000000, max: 7000000 },
      { label: '700만~', min: 7000000, max: Infinity },
    ];
    // Get unique employees from filtered
    const empMap = new Map<string, number>();
    for (const p of filtered) {
      if (!empMap.has(p.employee_id)) {
        empMap.set(p.employee_id, p.base_salary);
      }
    }
    return ranges.map((r) => ({
      range: r.label,
      count: Array.from(empMap.values()).filter((s) => s >= r.min && s < r.max).length,
    }));
  }, [filtered]);

  // Pie data for earnings/deductions
  const earningsDeductionsPie = useMemo(() => [
    { name: '실수령액', value: summary.totalNetPay },
    { name: '공제액', value: summary.totalDeductions },
  ], [summary]);

  // Top 10 employees by net pay (latest month)
  const topEmployees = useMemo(() => {
    const latestPeriods = filtered.reduce((acc, p) => {
      const key = p.employee_id;
      if (!acc.has(key) || `${p.year}-${p.month}` > `${acc.get(key)!.year}-${acc.get(key)!.month}`) {
        acc.set(key, p);
      }
      return acc;
    }, new Map<string, typeof filtered[0]>());
    return Array.from(latestPeriods.values())
      .sort((a, b) => b.total_earnings - a.total_earnings)
      .slice(0, 10)
      .map((p) => ({
        name: directory.find((e) => e.id === p.employee_id)?.name ?? p.employee_id,
        department: directory.find((e) => e.id === p.employee_id)?.department ?? '',
        earnings: p.total_earnings,
        deductions: p.total_deductions,
        netPay: p.net_pay,
      }));
  }, [filtered, directory]);

  // 5. Monthly summary table data
  const monthlySummaryTable = useMemo(() => {
    const map = new Map<string, {
      key: string;
      year: number;
      month: number;
      label: string;
      empCount: number;
      totalEarnings: number;
      totalDeductions: number;
      totalNetPay: number;
      avgEarnings: number;
      avgNetPay: number;
      overtimePay: number;
      nightPay: number;
      holidayPay: number;
      deductionRate: number;
    }>();
    for (const p of filtered) {
      const key = `${p.year}-${String(p.month).padStart(2, '0')}`;
      const entry = map.get(key) ?? {
        key,
        year: p.year,
        month: p.month,
        label: `${p.year}년 ${p.month}월`,
        empCount: 0,
        totalEarnings: 0,
        totalDeductions: 0,
        totalNetPay: 0,
        avgEarnings: 0,
        avgNetPay: 0,
        overtimePay: 0,
        nightPay: 0,
        holidayPay: 0,
        deductionRate: 0,
      };
      entry.empCount++;
      entry.totalEarnings += p.total_earnings;
      entry.totalDeductions += p.total_deductions;
      entry.totalNetPay += p.net_pay;
      for (const item of p.items) {
        if (item.item_id === 'pi-overtime') entry.overtimePay += item.amount;
        if (item.item_id === 'pi-night') entry.nightPay += item.amount;
        if (item.item_id === 'pi-holiday') entry.holidayPay += item.amount;
      }
      map.set(key, entry);
    }
    const rows = Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));
    for (const r of rows) {
      r.avgEarnings = r.empCount > 0 ? Math.round(r.totalEarnings / r.empCount) : 0;
      r.avgNetPay = r.empCount > 0 ? Math.round(r.totalNetPay / r.empCount) : 0;
      r.deductionRate = r.totalEarnings > 0 ? Math.round((r.totalDeductions / r.totalEarnings) * 1000) / 10 : 0;
    }
    return rows;
  }, [filtered]);

  // 6. Month-over-month growth rate
  const monthlyGrowth = useMemo(() => {
    return monthlySummaryTable.map((curr, idx) => {
      const prev = idx > 0 ? monthlySummaryTable[idx - 1] : null;
      const earningsGrowth = prev && prev.totalEarnings > 0
        ? Math.round(((curr.totalEarnings - prev.totalEarnings) / prev.totalEarnings) * 1000) / 10
        : 0;
      const empGrowth = prev ? curr.empCount - prev.empCount : 0;
      return {
        label: curr.label,
        earningsGrowth,
        empGrowth,
        deductionRate: curr.deductionRate,
        avgEarnings: curr.avgEarnings,
      };
    });
  }, [monthlySummaryTable]);

  // 7. Overtime trend by month
  const overtimeTrend = useMemo(() => {
    return monthlySummaryTable.map((m) => ({
      label: m.label,
      연장수당: m.overtimePay,
      야간수당: m.nightPay,
      휴일수당: m.holidayPay,
      합계: m.overtimePay + m.nightPay + m.holidayPay,
    }));
  }, [monthlySummaryTable]);

  return (
    <div>
      <Breadcrumb />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">급여 대시보드</h1>
        <Link href="/payroll">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            급여관리
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">연도</span>
              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2026">2026</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {filterYear !== 'all' && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">기간</span>
                <Select value={filterMonthFrom} onValueChange={setFilterMonthFrom}>
                  <SelectTrigger className="w-[80px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}월</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">~</span>
                <Select value={filterMonthTo} onValueChange={setFilterMonthTo}>
                  <SelectTrigger className="w-[80px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}월</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">부서</span>
              <Select value={deptFilter} onValueChange={setDeptFilter}>
                <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 부서</SelectItem>
                  {allDepartments.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Badge variant="outline" className="ml-auto">
              {filtered.length}건 / {summary.empCount}명 / {summary.monthCount}개월
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">총 지급액</CardTitle>
            <div className="p-2 rounded-lg bg-accent-green-subtle text-accent-green">
              <DollarSign className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{fmtWon(summary.totalEarnings)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">총 공제액</CardTitle>
            <div className="p-2 rounded-lg bg-red-100 text-red-600">
              <TrendingDown className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-destructive">{fmtWon(summary.totalDeductions)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">총 실수령액</CardTitle>
            <div className="p-2 rounded-lg bg-accent-blue-subtle text-accent-blue">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-primary">{fmtWon(summary.totalNetPay)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">1인당 월평균</CardTitle>
            <div className="p-2 rounded-lg bg-accent-purple-subtle text-accent-purple">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{fmtWon(summary.avgPerPerson)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart View Selector */}
      <div className="flex gap-2 mb-4">
        {([
          { key: 'trend', label: '월별 추이', icon: BarChart3 },
          { key: 'department', label: '부서별 비교', icon: BarChart3 },
          { key: 'items', label: '항목별 분석', icon: PieChartIcon },
          { key: 'distribution', label: '급여 분포', icon: BarChart3 },
          { key: 'monthly', label: '월별 집계', icon: BarChart3 },
        ] as const).map(({ key, label, icon: Icon }) => (
          <Button
            key={key}
            variant={chartView === key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setChartView(key)}
          >
            <Icon className="h-3.5 w-3.5 mr-1" />
            {label}
          </Button>
        ))}
      </div>

      {/* Charts */}
      {chartView === 'trend' && (
        <div className="grid gap-6 md:grid-cols-2 mb-6">
          {/* Monthly trend bar */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">월별 급여 추이</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <BarChart data={monthlyTrend} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => fmtM(v)} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      cursor={cursorStyle}
                      formatter={(value) => fmtWon(value as number)}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="earnings" fill="var(--color-accent-blue)" radius={[4, 4, 0, 0]} name="총 지급액" />
                    <Bar dataKey="deductions" fill="var(--color-accent-amber)" radius={[4, 4, 0, 0]} name="공제액" />
                    <Bar dataKey="netPay" fill="var(--color-accent-green)" radius={[4, 4, 0, 0]} name="실수령액" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Monthly trend line */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">월별 실수령액 추이</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <AreaChart data={monthlyTrend} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <defs>
                      <linearGradient id="netPayGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-accent-blue)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--color-accent-blue)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => fmtM(v)} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(value) => fmtWon(value as number)} />
                    <Area type="monotone" dataKey="netPay" stroke="var(--color-accent-blue)" fill="url(#netPayGrad)" name="실수령액" strokeWidth={2} />
                    <Line type="monotone" dataKey="count" stroke="var(--color-accent-amber)" name="인원" yAxisId="right" dot={false} strokeDasharray="5 5" hide />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Earnings vs Deductions pie */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">지급/공제 비율</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <PieChart>
                    <Pie
                      data={earningsDeductionsPie}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(1)}%`}
                    >
                      <Cell fill="var(--color-accent-blue)" />
                      <Cell fill="var(--color-accent-amber)" />
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={(value) => fmtWon(value as number)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Monthly headcount */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">월별 급여 지급 인원</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <BarChart data={monthlyTrend} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" fill="var(--color-accent-purple)" radius={[4, 4, 0, 0]} name="인원" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {chartView === 'department' && (
        <div className="grid gap-6 md:grid-cols-2 mb-6">
          {/* Dept bar chart */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">부서별 급여 비교</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <BarChart data={deptBreakdown} margin={{ top: 5, right: 20, left: 10, bottom: 40 }} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-muted" />
                    <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => fmtM(v)} />
                    <YAxis type="category" dataKey="department" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={110} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(value) => fmtWon(value as number)} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="earnings" fill="var(--color-accent-blue)" radius={[0, 4, 4, 0]} name="지급액" />
                    <Bar dataKey="deductions" fill="var(--color-accent-amber)" radius={[0, 4, 4, 0]} name="공제액" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Dept pie chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">부서별 인건비 비중</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <PieChart>
                    <Pie
                      data={deptBreakdown}
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      dataKey="netPay"
                      nameKey="department"
                      label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    >
                      {deptBreakdown.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={(value) => fmtWon(value as number)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Dept table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">부서별 상세</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg max-h-[350px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>부서</TableHead>
                      <TableHead className="text-right">인원</TableHead>
                      <TableHead className="text-right">총 지급</TableHead>
                      <TableHead className="text-right">총 공제</TableHead>
                      <TableHead className="text-right">실수령</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deptBreakdown.map((d) => (
                      <TableRow key={d.department}>
                        <TableCell className="font-medium text-sm">{d.department}</TableCell>
                        <TableCell className="text-right text-sm">{d.count}</TableCell>
                        <TableCell className="text-right text-sm font-mono">{fmtM(d.earnings)}</TableCell>
                        <TableCell className="text-right text-sm font-mono text-destructive">{fmtM(d.deductions)}</TableCell>
                        <TableCell className="text-right text-sm font-mono font-bold">{fmtM(d.netPay)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {chartView === 'items' && (
        <div className="grid gap-6 md:grid-cols-2 mb-6">
          {/* Earnings pie */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">지급 항목별 비중</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <PieChart>
                    <Pie
                      data={itemBreakdown.earnings}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={110}
                      paddingAngle={3}
                      dataKey="total"
                      nameKey="name"
                      label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(1)}%`}
                    >
                      {itemBreakdown.earnings.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={(value) => fmtWon(value as number)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Deductions pie */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">공제 항목별 비중</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <PieChart>
                    <Pie
                      data={itemBreakdown.deductions}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={110}
                      paddingAngle={3}
                      dataKey="total"
                      nameKey="name"
                      label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(1)}%`}
                    >
                      {itemBreakdown.deductions.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[(i + 4) % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={(value) => fmtWon(value as number)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Items bar chart */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">항목별 금액 비교</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <BarChart
                    data={[...itemBreakdown.earnings, ...itemBreakdown.deductions].map((item) => ({
                      ...item,
                      category: itemBreakdown.earnings.includes(item) ? '지급' : '공제',
                    }))}
                    margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-muted" />
                    <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => fmtM(v)} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={100} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(value) => fmtWon(value as number)} />
                    <Bar dataKey="total" name="금액" radius={[0, 4, 4, 0]}>
                      {[...itemBreakdown.earnings, ...itemBreakdown.deductions].map((item, i) => (
                        <Cell
                          key={i}
                          fill={itemBreakdown.earnings.includes(item) ? 'var(--color-accent-blue)' : 'var(--color-accent-amber)'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {chartView === 'distribution' && (
        <div className="grid gap-6 md:grid-cols-2 mb-6">
          {/* Salary range distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">기본급 분포</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <BarChart data={salaryDistribution} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                    <XAxis dataKey="range" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" fill="var(--color-accent-purple)" radius={[4, 4, 0, 0]} name="인원수" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Top earners */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">급여 상위 10명</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <BarChart data={topEmployees} margin={{ top: 5, right: 20, left: 10, bottom: 5 }} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-muted" />
                    <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => fmtM(v)} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={60} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(value) => fmtWon(value as number)} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="earnings" fill="var(--color-accent-blue)" radius={[0, 4, 4, 0]} name="지급액" stackId="a" />
                    <Bar dataKey="deductions" fill="var(--color-accent-amber)" radius={[0, 4, 4, 0]} name="공제액" stackId="b" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Top earners table */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">급여 상위 10명 상세</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>순위</TableHead>
                      <TableHead>이름</TableHead>
                      <TableHead>부서</TableHead>
                      <TableHead className="text-right">총 지급액</TableHead>
                      <TableHead className="text-right">총 공제액</TableHead>
                      <TableHead className="text-right">실수령액</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topEmployees.map((emp, i) => (
                      <TableRow key={emp.name}>
                        <TableCell className="font-bold">{i + 1}</TableCell>
                        <TableCell className="font-medium">{emp.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{emp.department}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{fmtWon(emp.earnings)}</TableCell>
                        <TableCell className="text-right font-mono text-sm text-destructive">{fmtWon(emp.deductions)}</TableCell>
                        <TableCell className="text-right font-mono text-sm font-bold">{fmtWon(emp.netPay)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {chartView === 'monthly' && (
        <div className="space-y-6 mb-6">
          {/* Monthly Summary Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">월별 급여 집계표</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>기간</TableHead>
                      <TableHead className="text-right">인원</TableHead>
                      <TableHead className="text-right">총 지급액</TableHead>
                      <TableHead className="text-right">총 공제액</TableHead>
                      <TableHead className="text-right">총 실수령액</TableHead>
                      <TableHead className="text-right">1인 평균 지급</TableHead>
                      <TableHead className="text-right">1인 평균 실수령</TableHead>
                      <TableHead className="text-right">공제율</TableHead>
                      <TableHead className="text-right">연장수당</TableHead>
                      <TableHead className="text-right">야간수당</TableHead>
                      <TableHead className="text-right">휴일수당</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthlySummaryTable.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center text-muted-foreground">데이터가 없습니다.</TableCell>
                      </TableRow>
                    ) : (
                      <>
                        {monthlySummaryTable.map((m) => (
                          <TableRow key={m.key}>
                            <TableCell className="font-medium">{m.label}</TableCell>
                            <TableCell className="text-right">{m.empCount}명</TableCell>
                            <TableCell className="text-right font-mono text-sm">{fmtM(m.totalEarnings)}</TableCell>
                            <TableCell className="text-right font-mono text-sm text-destructive">{fmtM(m.totalDeductions)}</TableCell>
                            <TableCell className="text-right font-mono text-sm font-bold">{fmtM(m.totalNetPay)}</TableCell>
                            <TableCell className="text-right font-mono text-sm">{fmtWon(m.avgEarnings)}</TableCell>
                            <TableCell className="text-right font-mono text-sm">{fmtWon(m.avgNetPay)}</TableCell>
                            <TableCell className="text-right text-sm">
                              <Badge variant={m.deductionRate > 20 ? 'destructive' : 'outline'} className="text-xs">
                                {m.deductionRate}%
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm text-blue-600">{m.overtimePay > 0 ? fmtM(m.overtimePay) : '-'}</TableCell>
                            <TableCell className="text-right font-mono text-sm text-purple-600">{m.nightPay > 0 ? fmtM(m.nightPay) : '-'}</TableCell>
                            <TableCell className="text-right font-mono text-sm text-orange-600">{m.holidayPay > 0 ? fmtM(m.holidayPay) : '-'}</TableCell>
                          </TableRow>
                        ))}
                        {/* Totals row */}
                        <TableRow className="bg-muted/50 font-bold">
                          <TableCell>합계</TableCell>
                          <TableCell className="text-right">{summary.empCount}명</TableCell>
                          <TableCell className="text-right font-mono text-sm">{fmtM(summary.totalEarnings)}</TableCell>
                          <TableCell className="text-right font-mono text-sm text-destructive">{fmtM(summary.totalDeductions)}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{fmtM(summary.totalNetPay)}</TableCell>
                          <TableCell className="text-right font-mono text-sm">-</TableCell>
                          <TableCell className="text-right font-mono text-sm">-</TableCell>
                          <TableCell className="text-right text-sm">
                            {summary.totalEarnings > 0 ? (
                              <Badge variant="outline" className="text-xs">
                                {(Math.round((summary.totalDeductions / summary.totalEarnings) * 1000) / 10)}%
                              </Badge>
                            ) : '-'}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm text-blue-600">{fmtM(monthlySummaryTable.reduce((s, m) => s + m.overtimePay, 0))}</TableCell>
                          <TableCell className="text-right font-mono text-sm text-purple-600">{fmtM(monthlySummaryTable.reduce((s, m) => s + m.nightPay, 0))}</TableCell>
                          <TableCell className="text-right font-mono text-sm text-orange-600">{fmtM(monthlySummaryTable.reduce((s, m) => s + m.holidayPay, 0))}</TableCell>
                        </TableRow>
                      </>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Deduction Rate Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">월별 공제율 추이</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <LineChart data={monthlyGrowth} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
                      <Tooltip contentStyle={tooltipStyle} formatter={(value) => `${value}%`} />
                      <Line type="monotone" dataKey="deductionRate" stroke="var(--color-accent-amber)" strokeWidth={2} dot={{ r: 4 }} name="공제율" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* MoM Earnings Growth */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">인건비 전월 대비 증감률</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <BarChart data={monthlyGrowth} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
                      <Tooltip contentStyle={tooltipStyle} formatter={(value) => `${value}%`} />
                      <Bar dataKey="earningsGrowth" name="증감률" radius={[4, 4, 0, 0]}>
                        {monthlyGrowth.map((entry, i) => (
                          <Cell key={i} fill={entry.earningsGrowth >= 0 ? 'var(--color-accent-green)' : 'var(--color-accent-amber)'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Overtime Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">월별 수당 구성 변화</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <AreaChart data={overtimeTrend} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <defs>
                        <linearGradient id="gradOvertime" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--color-accent-blue)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="var(--color-accent-blue)" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradNight" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--color-accent-purple)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="var(--color-accent-purple)" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradHoliday" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => fmtM(v)} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(value) => fmtWon(value as number)} />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      <Area type="monotone" dataKey="연장수당" stroke="var(--color-accent-blue)" fill="url(#gradOvertime)" strokeWidth={2} />
                      <Area type="monotone" dataKey="야간수당" stroke="var(--color-accent-purple)" fill="url(#gradNight)" strokeWidth={2} />
                      <Area type="monotone" dataKey="휴일수당" stroke="#f97316" fill="url(#gradHoliday)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Average Earnings per Person Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">1인당 평균 급여 추이</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <LineChart data={monthlyGrowth} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => fmtM(v)} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(value) => fmtWon(value as number)} />
                      <Line type="monotone" dataKey="avgEarnings" stroke="var(--color-accent-green)" strokeWidth={2.5} dot={{ r: 4, fill: 'var(--color-accent-green)' }} name="1인 평균 지급액" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
