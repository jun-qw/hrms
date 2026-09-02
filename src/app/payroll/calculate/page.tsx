'use client';

import Link from 'next/link';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useEmployeeDirectory, type DirectoryEmployee } from '@/lib/hooks/use-employee-directory';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { usePayrollStore } from '@/lib/stores/payroll-store';
import { useSettingsStore } from '@/lib/stores/settings-store';
import { useAttendanceStore } from '@/lib/stores/attendance-store';
import { calculateInsurance } from '@/lib/utils/insurance';
import { resolveRateSet, type ResolvedRateSet } from '@/lib/actions/payroll-rate-actions';
import { DEFAULT_RATE_SET } from '@/lib/payroll/rate-set';
import { fetchSalariesAsOf, type SalaryRecord } from '@/lib/actions/salary-actions';
import {
  computeWeeklyHoliday,
  splitMonthIntoWeeks,
  type WeekAttendance,
} from '@/lib/payroll/weekly-holiday';
import { calculateMonthlyIncomeTax } from '@/lib/utils/korean-tax';
import PayrollItemSettings from '@/components/payroll/payroll-item-settings';
import type { PayrollLineItem, SavedPayroll } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import {
  Calculator,
  Settings2,
  Save,
  ChevronDown,
  ChevronRight,
  Check,
  Users,
  Calendar,
  ClipboardList,
  FileDown,
  FileUp,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  Clock,
  Moon,
  CalendarCheck,
  Upload,
  Lock,
  Unlock,
} from 'lucide-react';
import { toast } from 'sonner';

const fmtWon = (n: number) => new Intl.NumberFormat('ko-KR').format(Math.round(n)) + '원';
/** 0.03545 → '3.545%'. 기준값이 바뀌면 화면 설명도 같이 바뀝니다. */
const pctText = (rate: number) =>
  `${Number((rate * 100).toFixed(4))}%`;

const fmtNum = (n: number) => new Intl.NumberFormat('ko-KR').format(Math.round(n));

// ---- Types ----

interface AttendanceSummary {
  employeeId: string;
  workDays: number;
  normal: number;
  late: number;
  earlyLeave: number;
  absent: number;
  leave: number;
  overtimeHours: number;
  nightHours: number;
  holidayHours: number;
  /** 실제 기록된 근로시간 합계. 시급직 기본급의 근거입니다. */
  workedHours: number;
  /** 주휴수당 판정용 주별 집계 */
  weeks: WeekAttendance[];
}

interface EarningRow {
  employeeId: string;
  baseSalary: number;
  meal: number;
  transport: number;
  positionAllowance: number;
  overtimePay: number;
  nightPay: number;
  holidayPay: number;
  otherPay: number;
  total: number;
  confirmed: boolean;
  /** 주휴수당. 산정 방식은 관리자 설정을 따릅니다. */
  weeklyHolidayPay: number;
  weeklyHolidayFormula: string;
  /**
   * 가산수당 계산에 실제로 쓰인 통상시급.
   *
   * 화면에서 기본급÷209로 되짚으면 시급직은 값이 어긋납니다 — 시급직의
   * 기본급은 실근로시간의 곱이라 209로 나눠도 원래 시급이 나오지 않습니다.
   */
  hourlyWage: number;
}

interface DeductionRow {
  employeeId: string;
  taxableIncome: number;
  nationalPension: number;
  healthInsurance: number;
  longTermCare: number;
  employmentInsurance: number;
  incomeTax: number;
  localTax: number;
  otherDeduction: number;
  total: number;
}

interface ResultRow {
  employeeId: string;
  name: string;
  department: string;
  totalEarnings: number;
  totalDeductions: number;
  netPay: number;
  status: 'pending' | 'calculated';
  earnings: EarningRow;
  deductions: DeductionRow;
  attendance: AttendanceSummary;
}

// ---- Step definitions ----

const STEPS = [
  { num: 1, label: '기간설정 / 직원불러오기', icon: Users },
  { num: 2, label: '근태내역 확인', icon: Calendar },
  { num: 3, label: '지급항목 설정', icon: ClipboardList },
  { num: 4, label: '공제항목 설정', icon: Calculator },
  { num: 5, label: '계산 / 결과', icon: Save },
];

// ---- Component ----

export default function PayrollCalculatePage() {
  const directory = useEmployeeDirectory();
  const payrollItems = usePayrollStore((s) => s.payrollItems);
  const savePayroll = usePayrollStore((s) => s.savePayroll);
  const updatePayrollStatus = usePayrollStore((s) => s.updatePayrollStatus);
  const employeePayrollSettings = usePayrollStore((s) => s.employeePayrollSettings);
  // 공휴일은 주휴 판정의 소정근로일 계산에 필요합니다.
  const holidays = useSettingsStore((s) => s.holidays);
  const attendanceRecords = useAttendanceStore((s) => s.records);

  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Step 1 state
  const [year, setYear] = useState('2026');
  const [month, setMonth] = useState('2');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loadedEmployees, setLoadedEmployees] = useState<typeof directory>([]);
  const [departmentFilter, setDepartmentFilter] = useState('all');

  // Step 2 state
  const [attendanceData, setAttendanceData] = useState<Map<string, AttendanceSummary>>(new Map());
  /** 사번별 부양가족 수(본인 포함). 소득세 인적공제에 그대로 들어갑니다. */
  const [dependents, setDependents] = useState<Map<string, number>>(new Map());


  // 해당 연도 기준값 — 4대보험 요율·비과세 한도·세율 구간이 여기서 옵니다.
  // 개편 전에는 이 값들이 코드 상수였고 설정 화면의 숫자는 계산에 닿지 않았습니다.
  const [rateSet, setRateSet] = useState<ResolvedRateSet>({
    rates: DEFAULT_RATE_SET,
    source: 'default',
  });
  useEffect(() => {
    let alive = true;
    resolveRateSet(Number(year)).then((r) => {
      if (alive) setRateSet(r);
    });
    return () => {
      alive = false;
    };
  }, [year]);

  /**
   * 그 달에 유효했던 급여.
   *
   * `employees.base_salary`는 오늘 값이라, 4월에 3월분을 다시 돌리면 4월에
   * 올린 단가가 적용됩니다. 급여 이력에서 해당 월 기준으로 가져옵니다.
   */
  const [salaryAsOf, setSalaryAsOf] = useState<Record<string, SalaryRecord>>({});
  useEffect(() => {
    let alive = true;
    const asOf = `${year}-${String(month).padStart(2, '0')}-01`;
    fetchSalariesAsOf(asOf).then((m) => {
      if (alive) setSalaryAsOf(m);
    });
    return () => {
      alive = false;
    };
  }, [year, month]);

  /**
   * 급여방식별 기본급과 통상시급.
   *
   * 월급·연봉제는 월 기본급을 소정근로시간으로 나눠 통상시급을 얻고, 시급제는
   * 시급이 곧 통상시급입니다. 일급제는 1일 소정근로시간으로 환산합니다.
   */
  const computeBaseFor = useCallback(
    (
      emp: DirectoryEmployee,
      workedHours: number,
      workedDays: number,
      rates: { monthlyWorkHours: number; standardDailyHours: number },
    ): { baseSalary: number; hourlyWage: number } => {
      // 이력에 그 달 값이 있으면 그것을, 없으면 현재 값을 씁니다.
      const record = salaryAsOf[emp.id];
      const monthly = record?.base_salary ?? emp.base_salary ?? 0;
      const unit = record?.hourly_wage ?? emp.hourly_wage ?? 0;

      switch (emp.pay_method) {
        case 'hourly':
          return { baseSalary: Math.round(unit * workedHours), hourlyWage: unit };
        case 'daily':
          return {
            baseSalary: Math.round(unit * workedDays),
            hourlyWage: Math.round(unit / rates.standardDailyHours),
          };
        default:
          return {
            baseSalary: monthly,
            hourlyWage: Math.round(monthly / rates.monthlyWorkHours),
          };
      }
    },
    [salaryAsOf],
  );

  // Step 3 state
  const [earningRows, setEarningRows] = useState<Map<string, EarningRow>>(new Map());

  // Step 4 state
  const [deductionRows, setDeductionRows] = useState<Map<string, DeductionRow>>(new Map());

  // Step 5 state
  const [results, setResults] = useState<ResultRow[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Excel dialog
  const [excelDialogOpen, setExcelDialogOpen] = useState(false);
  const [pasteData, setPasteData] = useState('');
  const [parsedPasteRows, setParsedPasteRows] = useState<Array<Record<string, string>>>([]);

  // Derived
  const departments = useMemo(() => {
    const depts = new Set(directory.map((e) => e.department));
    return Array.from(depts).sort();
  }, [directory]);

  const filteredLoadedEmployees = useMemo(() => {
    if (departmentFilter === 'all') return loadedEmployees;
    return loadedEmployees.filter((e) => e.department === departmentFilter);
  }, [loadedEmployees, departmentFilter]);

  const selectedEmployees = useMemo(() => {
    return loadedEmployees.filter((e) => selectedIds.has(e.id));
  }, [loadedEmployees, selectedIds]);

  // ---- Step navigation ----

  const markComplete = useCallback((step: number) => {
    setCompletedSteps((prev) => new Set([...prev, step]));
  }, []);

  const goNext = useCallback(() => {
    markComplete(currentStep);
    setCurrentStep((prev) => Math.min(prev + 1, 5));
  }, [currentStep, markComplete]);

  const goPrev = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  }, []);

  const goToStep = useCallback(
    (step: number) => {
      if (step <= currentStep || completedSteps.has(step - 1) || step === 1) {
        setCurrentStep(step);
      }
    },
    [currentStep, completedSteps]
  );

  // ---- Step 1: Load employees ----

  const handleLoadEmployees = useCallback(() => {
    const endOfMonth = new Date(Number(year), Number(month), 0);
    const eligible = directory.filter((e) => {
      const hireDate = new Date(e.hire_date);
      return hireDate <= endOfMonth;
    });
    setLoadedEmployees(eligible);
    setSelectedIds(new Set(eligible.map((e) => e.id)));
    toast.success(`${eligible.length}명의 직원을 불러왔습니다.`);
  }, [year, month, directory]);

  const toggleEmployee = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(filteredLoadedEmployees.map((e) => e.id)));
  }, [filteredLoadedEmployees]);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // ---- Step 2: Build attendance ----

  const buildAttendanceData = useCallback(() => {
    const map = new Map<string, AttendanceSummary>();
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    const dateKeyOf = (day: number) => `${prefix}-${String(day).padStart(2, '0')}`;
    const holidaySet = new Set(holidays.filter((h) => h.is_active).map((h) => h.date));

    for (const emp of selectedEmployees) {
      const records = attendanceRecords.filter(
        (r) => r.employee_id === emp.id && r.date.startsWith(prefix),
      );

      // 기록이 없으면 0으로 둡니다. 예전에는 가짜 근태를 만들어 채웠는데,
      // 시급직은 실근로시간이 그대로 기본급이라 지어낸 숫자가 급여로 나갑니다.
      // 비어 있으면 비어 있는 대로 보이고, 근태대장에서 채우게 해야 합니다.
      let normal = 0, late = 0, earlyLeave = 0, absent = 0, leaveD = 0;
      let ot = 0, holiday = 0, hours = 0;
      // 야간근로는 아직 별도 기록 원천이 없습니다. 근태대장에 야간 코드를
      // 추가하기 전까지 0으로 두고, 필요하면 급여계산에서 직접 입력합니다.
      const night = 0;

      for (const r of records) {
        if (r.status === 'normal') normal++;
        else if (r.status === 'late') late++;
        else if (r.status === 'early_leave') earlyLeave++;
        else if (r.status === 'absent') absent++;
        else if (r.status === 'leave' || r.status === 'half_day') leaveD++;
        ot += r.overtime_hours ?? 0;

        // 공휴일·주말에 찍힌 근무는 휴일근로(1.5배)입니다. 예전에는 상태가
        // 'holiday'인 기록만 갈라내서, 추석에 나와 일한 날이 평일 근무처럼
        // 기본급에 1.0배로 섞였습니다. 근태대장은 그 날을 근무일에서 빼는데
        // 급여는 더해, 두 화면의 근무일수가 어긋나기도 했습니다.
        const dow = new Date(r.date).getDay();
        const onRestDay =
          r.status === 'holiday' || dow === 0 || dow === 6 || holidaySet.has(r.date);
        if (onRestDay) holiday += r.work_hours ?? 0;
        else hours += r.work_hours ?? 0;
      }

      // 주휴수당 판정용 주 단위 집계. 코드가 아니라 상태로 판단합니다.
      const byDate = new Map(records.map((r) => [r.date, r]));
      const weeks = splitMonthIntoWeeks(
        Number(year),
        Number(month),
        (day) => holidaySet.has(dateKeyOf(day)),
        (day) => {
          const rec = byDate.get(dateKeyOf(day));
          return {
            worked: (rec?.work_hours ?? 0) > 0,
            absent: rec?.status === 'absent',
          };
        },
      );

      map.set(emp.id, {
        employeeId: emp.id,
        weeks,
        workDays: records.filter((r) => {
          if ((r.work_hours ?? 0) <= 0) return false;
          const dow = new Date(r.date).getDay();
          return !(r.status === 'holiday' || dow === 0 || dow === 6 || holidaySet.has(r.date));
        }).length,
        normal,
        late,
        earlyLeave,
        absent,
        leave: leaveD,
        overtimeHours: Math.round(ot * 100) / 100,
        nightHours: night,
        holidayHours: Math.round(holiday * 100) / 100,
        workedHours: Math.round(hours * 100) / 100,
      });
    }
    setAttendanceData(map);
  }, [selectedEmployees, attendanceRecords, year, month, holidays]);

  /** 근태가 한 건도 없는 사람 — 시급직이면 기본급이 0원이 되므로 반드시 짚어야 합니다. */
  const noAttendance = useMemo(
    () => selectedEmployees.filter((e) => (attendanceData.get(e.id)?.workDays ?? 0) === 0),
    [selectedEmployees, attendanceData],
  );
  const hourlyNoAttendance = noAttendance.filter(
    (e) => e.pay_method === 'hourly' || e.pay_method === 'daily',
  ).length;

  // ---- Step 3: Build earning rows ----

  const buildEarningRows = useCallback(() => {
    const map = new Map<string, EarningRow>();
    for (const emp of selectedEmployees) {
      const att = attendanceData.get(emp.id);

      // 급여방식에 따라 기본급 산정이 갈립니다. 현장직은 통상 시급제라
      // 근태 실근로시간이 그대로 기본급이 됩니다.
      //
      // 근무일수 × 1일 소정근로시간으로 환산합니다. 월 209시간을 근무일수로
      // 나누면 안 됩니다 — 209에는 주휴시간이 포함되어 있어 실근로시간보다
      // 20%가량 부풀려집니다.
      // 근태대장에 적힌 실근로시간을 그대로 씁니다. 기록이 없을 때만
      // 근무일수 × 1일 소정근로시간으로 환산합니다.
      const workedHours =
        att?.workedHours && att.workedHours > 0
          ? att.workedHours
          : (att?.workDays ?? 0) * rateSet.rates.standardDailyHours;
      const { baseSalary, hourlyWage } = computeBaseFor(emp, workedHours, att?.workDays ?? 0, rateSet.rates);

      const empSettings = employeePayrollSettings.filter(
        (s) => s.employee_id === emp.id && s.is_active
      );
      const positionSetting = empSettings.find((s) => s.item_code === 'position_allowance');
      const positionAllowance = positionSetting?.amount ?? 0;

      const overtimeHours = att?.overtimeHours ?? 0;
      const nightHours = att?.nightHours ?? 0;
      const holidayHours = att?.holidayHours ?? 0;

      const { premiums, nonTaxableLimits } = rateSet.rates;
      const overtimePay = Math.round(hourlyWage * premiums.overtime * overtimeHours);
      const nightPay = Math.round(hourlyWage * premiums.night * nightHours);
      const holidayPay = Math.round(hourlyWage * premiums.holiday * holidayHours);
      const meal = nonTaxableLimits.meal;
      const transport = nonTaxableLimits.transport;

      // 주휴수당 — 방식은 설정 > 급여 기준값에서 관리자가 고릅니다.
      const weekly = computeWeeklyHoliday(
        att?.weeks ?? [],
        hourlyWage,
        emp.pay_method,
        rateSet.rates,
      );
      const weeklyHolidayPay = weekly.amount;

      const total =
        baseSalary + meal + transport + positionAllowance + overtimePay + nightPay + holidayPay + weeklyHolidayPay;
      map.set(emp.id, {
        employeeId: emp.id,
        baseSalary,
        meal,
        transport,
        positionAllowance,
        overtimePay,
        nightPay,
        holidayPay,
        weeklyHolidayPay,
        weeklyHolidayFormula: weekly.formula,
        hourlyWage,
        otherPay: 0,
        total,
        confirmed: false,
      });
    }
    setEarningRows(map);
  }, [selectedEmployees, attendanceData, employeePayrollSettings, rateSet, computeBaseFor]);

  // ---- Step 4: Build deduction rows ----

  const buildDeductionRows = useCallback(() => {
    const map = new Map<string, DeductionRow>();
    for (const emp of selectedEmployees) {
      const er = earningRows.get(emp.id);
      if (!er) continue;
      const taxableIncome =
        er.baseSalary + er.positionAllowance + er.overtimePay + er.nightPay + er.holidayPay + er.weeklyHolidayPay + er.otherPay;
      const insurance = calculateInsurance(taxableIncome, rateSet.rates);
      const tax = calculateMonthlyIncomeTax(taxableIncome, dependents.get(emp.id) ?? 1, rateSet.rates);
      map.set(emp.id, {
        employeeId: emp.id,
        taxableIncome,
        nationalPension: insurance.nationalPension,
        healthInsurance: insurance.healthInsurance,
        longTermCare: insurance.longTermCare,
        employmentInsurance: insurance.employmentInsurance,
        incomeTax: tax.incomeTax,
        localTax: tax.localTax,
        otherDeduction: 0,
        total:
          insurance.nationalPension +
          insurance.healthInsurance +
          insurance.longTermCare +
          insurance.employmentInsurance +
          tax.incomeTax +
          tax.localTax,
      });
    }
    setDeductionRows(map);
  }, [selectedEmployees, earningRows, dependents, rateSet]);

  // ---- Step 5: Calculate results ----

  const calculateAll = useCallback(() => {
    const rows: ResultRow[] = [];
    for (const emp of selectedEmployees) {
      const er = earningRows.get(emp.id);
      const dr = deductionRows.get(emp.id);
      const att = attendanceData.get(emp.id);
      if (!er || !dr || !att) continue;
      const totalEarnings = er.total;
      const totalDeductions = dr.total;
      rows.push({
        employeeId: emp.id,
        name: emp.name,
        department: emp.department,
        totalEarnings,
        totalDeductions,
        netPay: totalEarnings - totalDeductions,
        status: 'calculated',
        earnings: er,
        deductions: dr,
        attendance: att,
      });
    }
    setResults(rows);
    toast.success(`${rows.length}명의 급여가 계산되었습니다.`);
  }, [selectedEmployees, earningRows, deductionRows, attendanceData]);

  const calculateSingle = useCallback(
    (empId: string) => {
      const emp = selectedEmployees.find((e) => e.id === empId);
      const er = earningRows.get(empId);
      const dr = deductionRows.get(empId);
      const att = attendanceData.get(empId);
      if (!emp || !er || !dr || !att) return;
      const totalEarnings = er.total;
      const totalDeductions = dr.total;
      const row: ResultRow = {
        employeeId: emp.id,
        name: emp.name,
        department: emp.department,
        totalEarnings,
        totalDeductions,
        netPay: totalEarnings - totalDeductions,
        status: 'calculated',
        earnings: er,
        deductions: dr,
        attendance: att,
      };
      setResults((prev) => {
        const idx = prev.findIndex((r) => r.employeeId === empId);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = row;
          return next;
        }
        return [...prev, row];
      });
    },
    [selectedEmployees, earningRows, deductionRows, attendanceData]
  );

  // ---- Save all ----

  const handleSaveAll = useCallback(() => {
    for (const row of results) {
      const items: PayrollLineItem[] = [
        { item_id: 'pi-base', name: '기본급', category: 'earning', amount: row.earnings.baseSalary, is_taxable: true, formula: `${fmtWon(row.earnings.baseSalary)} (기본급)` },
        { item_id: 'pi-meal', name: '식대', category: 'earning', amount: row.earnings.meal, is_taxable: false, formula: `${fmtWon(row.earnings.meal)} (비과세)` },
        { item_id: 'pi-transport', name: '교통비', category: 'earning', amount: row.earnings.transport, is_taxable: false, formula: `${fmtWon(row.earnings.transport)} (비과세)` },
      ];
      if (row.earnings.positionAllowance > 0) {
        items.push({ item_id: 'pi-position', name: '직책수당', category: 'earning', amount: row.earnings.positionAllowance, is_taxable: true, formula: `${fmtWon(row.earnings.positionAllowance)} (직책수당)` });
      }
      if (row.earnings.overtimePay > 0) {
        items.push({ item_id: 'pi-overtime', name: '연장근로수당', category: 'earning', amount: row.earnings.overtimePay, is_taxable: true, formula: `시급 x 1.5 x ${row.attendance.overtimeHours}h` });
      }
      if (row.earnings.nightPay > 0) {
        items.push({ item_id: 'pi-night', name: '야간근로수당', category: 'earning', amount: row.earnings.nightPay, is_taxable: true, formula: `시급 x 0.5 x ${row.attendance.nightHours}h` });
      }
      if (row.earnings.holidayPay > 0) {
        items.push({ item_id: 'pi-holiday', name: '휴일근로수당', category: 'earning', amount: row.earnings.holidayPay, is_taxable: true, formula: `시급 x 1.5 x ${row.attendance.holidayHours}h` });
      }
      if (row.earnings.weeklyHolidayPay > 0) {
        items.push({ item_id: 'pi-weeklyholiday', name: '주휴수당', category: 'earning', amount: row.earnings.weeklyHolidayPay, is_taxable: true, formula: row.earnings.weeklyHolidayFormula });
      }
      if (row.earnings.otherPay > 0) {
        items.push({ item_id: 'pi-other', name: '기타수당', category: 'earning', amount: row.earnings.otherPay, is_taxable: true, formula: `${fmtWon(row.earnings.otherPay)}` });
      }
      items.push(
        { item_id: 'pi-pension', name: '국민연금', category: 'deduction', amount: row.deductions.nationalPension, is_taxable: false, formula: `과세소득 × ${pctText(rateSet.rates.nationalPension.rate)}` },
        { item_id: 'pi-health', name: '건강보험', category: 'deduction', amount: row.deductions.healthInsurance, is_taxable: false, formula: `과세소득 × ${pctText(rateSet.rates.healthInsurance.rate)}` },
        { item_id: 'pi-longterm', name: '장기요양보험', category: 'deduction', amount: row.deductions.longTermCare, is_taxable: false, formula: `건강보험 × ${pctText(rateSet.rates.longTermCare.rate)}` },
        { item_id: 'pi-employment', name: '고용보험', category: 'deduction', amount: row.deductions.employmentInsurance, is_taxable: false, formula: `과세소득 × ${pctText(rateSet.rates.employmentInsurance.rate)}` },
        { item_id: 'pi-incometax', name: '소득세', category: 'deduction', amount: row.deductions.incomeTax, is_taxable: false, formula: `간이세액표 기반` },
        { item_id: 'pi-localtax', name: '지방소득세', category: 'deduction', amount: row.deductions.localTax, is_taxable: false, formula: `소득세 x 10%` }
      );
      if (row.deductions.otherDeduction > 0) {
        items.push({ item_id: 'pi-other-ded', name: '기타공제', category: 'deduction', amount: row.deductions.otherDeduction, is_taxable: false, formula: `${fmtWon(row.deductions.otherDeduction)}` });
      }
      const payroll: SavedPayroll = {
        id: `sp-${row.employeeId}-${year}-${month.padStart(2, '0')}`,
        employee_id: row.employeeId,
        year: Number(year),
        month: Number(month),
        base_salary: row.earnings.baseSalary,
        items,
        total_earnings: row.totalEarnings,
        total_deductions: row.totalDeductions,
        net_pay: row.netPay,
        dependents: dependents.get(row.employeeId) ?? 1,
        status: 'draft',
        created_at: new Date().toISOString().slice(0, 10),
      };
      savePayroll(payroll);
    }
    toast.success(`${results.length}건의 급여가 저장되었습니다.`);
  }, [results, year, month, savePayroll, dependents, rateSet]);

  // ---- Excel download ----

  const handleExcelDownload = useCallback(() => {
    const headers = [
      '사원번호', '이름', '부서', '기본급', '식대', '교통비', '직책수당',
      '연장수당', '야간수당', '휴일수당', '기타수당', '총지급액',
      '국민연금', '건강보험', '장기요양', '고용보험', '소득세', '지방소득세', '기타공제', '총공제액',
      '실수령액',
    ];
    const rows = results.map((r) => [
      r.employeeId,
      r.name,
      r.department,
      r.earnings.baseSalary,
      r.earnings.meal,
      r.earnings.transport,
      r.earnings.positionAllowance,
      r.earnings.overtimePay,
      r.earnings.nightPay,
      r.earnings.holidayPay,
      r.earnings.otherPay,
      r.totalEarnings,
      r.deductions.nationalPension,
      r.deductions.healthInsurance,
      r.deductions.longTermCare,
      r.deductions.employmentInsurance,
      r.deductions.incomeTax,
      r.deductions.localTax,
      r.deductions.otherDeduction,
      r.totalDeductions,
      r.netPay,
    ]);
    const csv = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `급여대장_${year}년_${month.padStart(2, '0')}월.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('엑셀 파일이 다운로드되었습니다.');
  }, [results, year, month]);

  // ---- Excel paste ----

  const handleParsePaste = useCallback(() => {
    const lines = pasteData.trim().split('\n');
    if (lines.length < 2) {
      toast.error('데이터가 충분하지 않습니다. 헤더 포함 2줄 이상 필요합니다.');
      return;
    }
    const headers = lines[0].split('\t');
    const parsed = lines.slice(1).map((line) => {
      const values = line.split('\t');
      const row: Record<string, string> = {};
      headers.forEach((h, i) => {
        row[h.trim()] = values[i]?.trim() ?? '';
      });
      return row;
    });
    setParsedPasteRows(parsed);
    toast.success(`${parsed.length}건의 데이터가 파싱되었습니다.`);
  }, [pasteData]);

  const handleApplyPaste = useCallback(() => {
    let applied = 0;
    for (const row of parsedPasteRows) {
      const empId = row['사원번호'];
      if (!empId) continue;
      const existing = earningRows.get(empId);
      if (!existing) continue;
      const updated = { ...existing };
      if (row['식대']) updated.meal = Number(row['식대']) || updated.meal;
      if (row['교통비']) updated.transport = Number(row['교통비']) || updated.transport;
      if (row['직책수당']) updated.positionAllowance = Number(row['직책수당']) || updated.positionAllowance;
      if (row['기타수당']) updated.otherPay = Number(row['기타수당']) || updated.otherPay;
      updated.total =
        updated.baseSalary + updated.meal + updated.transport + updated.positionAllowance +
        updated.overtimePay + updated.nightPay + updated.holidayPay + updated.otherPay;
      setEarningRows((prev) => new Map(prev).set(empId, updated));
      applied++;
    }
    setExcelDialogOpen(false);
    setPasteData('');
    setParsedPasteRows([]);
    toast.success(`${applied}건의 데이터가 적용되었습니다.`);
  }, [parsedPasteRows, earningRows]);

  // ---- Excel file upload ----

  const handleExcelFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      const lines = text.replace(/^\uFEFF/, '').trim().split('\n');
      if (lines.length < 2) {
        toast.error('데이터가 충분하지 않습니다.');
        return;
      }
      const separator = lines[0].includes('\t') ? '\t' : ',';
      const headers = lines[0].split(separator).map((h) => h.trim().replace(/"/g, ''));
      let applied = 0;
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(separator).map((v) => v.trim().replace(/"/g, ''));
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => { row[h] = values[idx] ?? ''; });
        const empId = row['사원번호'];
        if (!empId) continue;
        const existing = earningRows.get(empId);
        if (!existing) continue;
        const updated = { ...existing };
        if (row['식대']) updated.meal = Number(row['식대']) || updated.meal;
        if (row['교통비']) updated.transport = Number(row['교통비']) || updated.transport;
        if (row['직책수당']) updated.positionAllowance = Number(row['직책수당']) || updated.positionAllowance;
        if (row['기타수당']) updated.otherPay = Number(row['기타수당']) || updated.otherPay;
        updated.total =
          updated.baseSalary + updated.meal + updated.transport + updated.positionAllowance +
          updated.overtimePay + updated.nightPay + updated.holidayPay + updated.otherPay;
        setEarningRows((prev) => new Map(prev).set(empId, updated));
        applied++;
      }
      toast.success(`${applied}건의 데이터가 엑셀 파일에서 적용되었습니다.`);
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  }, [earningRows]);

  // ---- 마감 (Close) / 마감해제 (Reopen) ----

  const [isClosed, setIsClosed] = useState(false);

  const handleClose = useCallback(() => {
    for (const row of results) {
      const payrollId = `sp-${row.employeeId}-${year}-${month.padStart(2, '0')}`;
      updatePayrollStatus(payrollId, 'confirmed');
    }
    setIsClosed(true);
    toast.success(`${year}년 ${month}월 급여가 마감되었습니다.`);
  }, [results, year, month, updatePayrollStatus]);

  const handleReopen = useCallback(() => {
    for (const row of results) {
      const payrollId = `sp-${row.employeeId}-${year}-${month.padStart(2, '0')}`;
      updatePayrollStatus(payrollId, 'draft');
    }
    setIsClosed(false);
    toast.success(`${year}년 ${month}월 급여 마감이 해제되었습니다. 재계산이 가능합니다.`);
  }, [results, year, month, updatePayrollStatus]);

  // ---- Update helpers ----

  const updateEarningField = useCallback(
    (empId: string, field: keyof EarningRow, value: number) => {
      setEarningRows((prev) => {
        const map = new Map(prev);
        const row = map.get(empId);
        if (!row) return prev;
        const updated = { ...row, [field]: value };
        updated.total =
          updated.baseSalary + updated.meal + updated.transport + updated.positionAllowance +
          updated.overtimePay + updated.nightPay + updated.holidayPay + updated.otherPay;
        map.set(empId, updated);
        return map;
      });
    },
    []
  );

  const updateDeductionField = useCallback(
    (empId: string, field: keyof DeductionRow, value: number) => {
      setDeductionRows((prev) => {
        const map = new Map(prev);
        const row = map.get(empId);
        if (!row) return prev;
        const updated = { ...row, [field]: value };
        updated.total =
          updated.nationalPension + updated.healthInsurance + updated.longTermCare +
          updated.employmentInsurance + updated.incomeTax + updated.localTax + updated.otherDeduction;
        map.set(empId, updated);
        return map;
      });
    },
    []
  );

  const toggleConfirm = useCallback((empId: string) => {
    setEarningRows((prev) => {
      const map = new Map(prev);
      const row = map.get(empId);
      if (!row) return prev;
      map.set(empId, { ...row, confirmed: !row.confirmed });
      return map;
    });
  }, []);

  const toggleResultExpand = useCallback((empId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(empId)) next.delete(empId);
      else next.add(empId);
      return next;
    });
  }, []);

  // ---- Auto-advance helpers ----

  const handleStep1Next = useCallback(() => {
    if (selectedIds.size === 0) {
      toast.error('최소 1명 이상의 직원을 선택해주세요.');
      return;
    }
    buildAttendanceData();
    goNext();
  }, [selectedIds, buildAttendanceData, goNext]);

  const handleStep2Next = useCallback(() => {
    buildEarningRows();
    goNext();
  }, [buildEarningRows, goNext]);

  const handleStep3Next = useCallback(() => {
    buildDeductionRows();
    goNext();
  }, [buildDeductionRows, goNext]);

  const handleStep4Next = useCallback(() => {
    goNext();
  }, [goNext]);

  // ---- Attendance summary stats ----

  const attendanceStats = useMemo(() => {
    const data = Array.from(attendanceData.values());
    if (data.length === 0) return null;
    const totalPeople = data.length;
    const avgWorkDays = Math.round((data.reduce((s, d) => s + d.workDays, 0) / totalPeople) * 10) / 10;
    const totalOvertime = data.reduce((s, d) => s + d.overtimeHours, 0);
    const irregularCount = data.filter((d) => d.late > 0 || d.absent > 0).length;
    return { totalPeople, avgWorkDays, totalOvertime, irregularCount };
  }, [attendanceData]);

  // ---- Earnings/Deductions totals ----

  const earningsTotal = useMemo(() => {
    return Array.from(earningRows.values()).reduce((s, r) => s + r.total, 0);
  }, [earningRows]);

  const deductionsTotal = useMemo(() => {
    return Array.from(deductionRows.values()).reduce((s, r) => s + r.total, 0);
  }, [deductionRows]);

  // ---- Render ----

  return (
    <TooltipProvider>
      <div>
        <Breadcrumb />
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">급여 계산</h1>
          <Button variant="outline" onClick={() => setSettingsOpen(true)}>
            <Settings2 className="h-4 w-4 mr-2" />
            항목 설정
          </Button>
        </div>

        {/* ---- Stepper ---- */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            {STEPS.map((step, idx) => {
              const isCompleted = completedSteps.has(step.num);
              const isCurrent = currentStep === step.num;
              const isClickable = step.num <= currentStep || completedSteps.has(step.num - 1) || step.num === 1;
              const Icon = step.icon;
              return (
                <div key={step.num} className="flex items-center flex-1">
                  <button
                    onClick={() => isClickable && goToStep(step.num)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors w-full ${
                      isCurrent
                        ? 'bg-primary text-primary-foreground'
                        : isCompleted
                          ? 'bg-green-100 text-green-800'
                          : isClickable
                            ? 'bg-muted hover:bg-muted/80 cursor-pointer'
                            : 'bg-muted/50 text-muted-foreground cursor-not-allowed'
                    }`}
                    disabled={!isClickable}
                  >
                    <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0 ${
                      isCurrent
                        ? 'bg-primary-foreground text-primary'
                        : isCompleted
                          ? 'bg-green-600 text-white'
                          : 'bg-background text-foreground'
                    }`}>
                      {isCompleted ? <Check className="h-3.5 w-3.5" /> : step.num}
                    </div>
                    <div className="text-left min-w-0 hidden lg:block">
                      <div className="text-xs font-medium truncate">{step.label}</div>
                    </div>
                  </button>
                  {idx < STEPS.length - 1 && (
                    <ArrowRight className="h-4 w-4 mx-1 text-muted-foreground shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
          <Progress value={(currentStep / 5) * 100} className="mt-3 h-1.5" />
        </div>

        {/* ---- Step 1: 기간설정 / 직원 불러오기 ---- */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">기간 설정</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-4">
                  <div className="space-y-2">
                    <Label>연도</Label>
                    <Select value={year} onValueChange={setYear}>
                      <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2025">2025</SelectItem>
                        <SelectItem value="2026">2026</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>월</Label>
                    <Select value={month} onValueChange={setMonth}>
                      <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => (
                          <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}월</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleLoadEmployees}>
                    <Users className="h-4 w-4 mr-2" />
                    직원 불러오기
                  </Button>
                </div>
              </CardContent>
            </Card>

            {loadedEmployees.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">직원 목록</CardTitle>
                    <div className="flex items-center gap-2">
                      <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                        <SelectTrigger className="w-44"><SelectValue placeholder="부서 필터" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">전체 부서</SelectItem>
                          {departments.map((d) => (
                            <SelectItem key={d} value={d}>{d}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button variant="outline" size="sm" onClick={selectAll}>전체선택</Button>
                      <Button variant="outline" size="sm" onClick={deselectAll}>전체해제</Button>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    <Badge variant="secondary">{selectedIds.size}명 선택됨</Badge>
                    <span className="ml-2">/ 총 {filteredLoadedEmployees.length}명</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="max-h-[500px] overflow-auto border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10"></TableHead>
                          <TableHead>사원번호</TableHead>
                          <TableHead>이름</TableHead>
                          <TableHead>부서</TableHead>
                          <TableHead>직급</TableHead>
                          <TableHead>입사일</TableHead>
                          <TableHead className="text-right">기본급</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredLoadedEmployees.map((emp) => (
                          <TableRow key={emp.id} className="cursor-pointer" onClick={() => toggleEmployee(emp.id)}>
                            <TableCell>
                              <Checkbox
                                checked={selectedIds.has(emp.id)}
                                onCheckedChange={() => toggleEmployee(emp.id)}
                              />
                            </TableCell>
                            <TableCell className="font-mono text-xs">{emp.employee_number}</TableCell>
                            <TableCell className="font-medium">{emp.name}</TableCell>
                            <TableCell>{emp.department}</TableCell>
                            <TableCell>{emp.position_rank}</TableCell>
                            <TableCell>{emp.hire_date}</TableCell>
                            <TableCell className="text-right font-mono">
                              {emp.base_salary ? fmtWon(emp.base_salary) : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end">
              <Button onClick={handleStep1Next} disabled={selectedIds.size === 0}>
                다음 단계
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* ---- Step 2: 근태내역 확인 ---- */}
        {currentStep === 2 && (
          <div className="space-y-4">
            {noAttendance.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2.5 text-xs">
                <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
                <span>
                  근태 기록이 하나도 없는 사람이 <strong>{noAttendance.length}명</strong> 있습니다
                  {hourlyNoAttendance > 0 && (
                    <>
                      {' '}— 그중 <strong className="text-destructive">시급직 {hourlyNoAttendance}명</strong>은
                      실근로시간이 그대로 기본급이라 이대로 계산하면 기본급이 0원이 됩니다
                    </>
                  )}
                  . 근태대장에서 먼저 입력하세요.
                </span>
                <Link href="/attendance/register" className="ml-auto shrink-0">
                  <Button variant="outline" size="sm" className="h-7 text-xs">
                    근태대장 열기
                  </Button>
                </Link>
              </div>
            )}
            {attendanceStats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-sm text-muted-foreground">총 대상인원</div>
                    <div className="text-2xl font-bold">{attendanceStats.totalPeople}명</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-sm text-muted-foreground">평균근무일수</div>
                    <div className="text-2xl font-bold">{attendanceStats.avgWorkDays}일</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-sm text-muted-foreground">총 연장근로시간</div>
                    <div className="text-2xl font-bold">{fmtNum(attendanceStats.totalOvertime)}시간</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                      지각/결근 특이인원
                    </div>
                    <div className="text-2xl font-bold text-destructive">{attendanceStats.irregularCount}명</div>
                  </CardContent>
                </Card>
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-base">근태내역 ({year}년 {month}월)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-[600px] overflow-auto border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>이름</TableHead>
                        <TableHead>부서</TableHead>
                        <TableHead className="text-center">근무일수</TableHead>
                        <TableHead className="text-center">정상</TableHead>
                        <TableHead className="text-center">지각</TableHead>
                        <TableHead className="text-center">조퇴</TableHead>
                        <TableHead className="text-center">결근</TableHead>
                        <TableHead className="text-center">휴가</TableHead>
                        <TableHead className="text-center">연장(h)</TableHead>
                        <TableHead className="text-center">야간(h)</TableHead>
                        <TableHead className="text-center">휴일(h)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedEmployees.map((emp) => {
                        const att = attendanceData.get(emp.id);
                        if (!att) return null;
                        return (
                          <TableRow key={emp.id}>
                            <TableCell className="font-medium">{emp.name}</TableCell>
                            <TableCell>{emp.department}</TableCell>
                            <TableCell className="text-center">{att.workDays}</TableCell>
                            <TableCell className="text-center">{att.normal}</TableCell>
                            <TableCell className={`text-center ${att.late > 0 ? 'bg-red-100 text-red-700 font-semibold' : ''}`}>
                              {att.late}
                            </TableCell>
                            <TableCell className={`text-center ${att.earlyLeave > 0 ? 'bg-orange-100 text-orange-700 font-semibold' : ''}`}>
                              {att.earlyLeave}
                            </TableCell>
                            <TableCell className={`text-center ${att.absent > 0 ? 'bg-red-100 text-red-700 font-semibold' : ''}`}>
                              {att.absent}
                            </TableCell>
                            <TableCell className="text-center">{att.leave}</TableCell>
                            <TableCell className={`text-center ${att.overtimeHours > 0 ? 'bg-blue-100 text-blue-700 font-semibold' : ''}`}>
                              {att.overtimeHours}
                            </TableCell>
                            <TableCell className={`text-center ${att.nightHours > 0 ? 'bg-purple-100 text-purple-700 font-semibold' : ''}`}>
                              {att.nightHours}
                            </TableCell>
                            <TableCell className="text-center">{att.holidayHours}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={goPrev}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                이전 단계
              </Button>
              <Button onClick={handleStep2Next}>
                다음 단계
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* ---- Step 3: 지급항목 설정 ---- */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">지급항목 설정 ({year}년 {month}월)</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <label className="cursor-pointer">
                        <Upload className="h-4 w-4 mr-2" />
                        엑셀 업로드
                        <input type="file" accept=".csv,.tsv,.txt,.xlsx" className="hidden" onChange={handleExcelFileUpload} />
                      </label>
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setExcelDialogOpen(true)}>
                      <FileUp className="h-4 w-4 mr-2" />
                      엑셀 붙여넣기
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-auto border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky left-0 bg-background z-10">이름</TableHead>
                        <TableHead>부서</TableHead>
                        <TableHead className="text-right">기본급</TableHead>
                        <TableHead className="text-right">식대</TableHead>
                        <TableHead className="text-right">교통비</TableHead>
                        <TableHead className="text-right">직책수당</TableHead>
                        <TableHead className="text-right">연장수당</TableHead>
                        <TableHead className="text-right">야간수당</TableHead>
                        <TableHead className="text-right">휴일수당</TableHead>
                        <TableHead className="text-right">주휴수당</TableHead>
                        <TableHead className="text-right">기타수당</TableHead>
                        <TableHead className="text-right">합계</TableHead>
                        <TableHead className="text-center">확인</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedEmployees.map((emp) => {
                        const row = earningRows.get(emp.id);
                        if (!row) return null;
                        const att = attendanceData.get(emp.id);
                        const hourlyWage = row.hourlyWage;
                        return (
                          <TableRow key={emp.id} className={row.confirmed ? 'bg-green-50' : ''}>
                            <TableCell className="sticky left-0 bg-background z-10 font-medium">{emp.name}</TableCell>
                            <TableCell className="text-sm">{emp.department}</TableCell>
                            <TableCell className="text-right font-mono text-sm">{fmtNum(row.baseSalary)}</TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                className="w-24 text-right text-sm h-8"
                                value={row.meal}
                                onChange={(e) => updateEarningField(emp.id, 'meal', Number(e.target.value))}
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                className="w-24 text-right text-sm h-8"
                                value={row.transport}
                                onChange={(e) => updateEarningField(emp.id, 'transport', Number(e.target.value))}
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                className="w-24 text-right text-sm h-8"
                                value={row.positionAllowance}
                                onChange={(e) => updateEarningField(emp.id, 'positionAllowance', Number(e.target.value))}
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-1 justify-end">
                                    <Input
                                      type="number"
                                      className="w-28 text-right text-sm h-8"
                                      value={row.overtimePay}
                                      onChange={(e) => updateEarningField(emp.id, 'overtimePay', Number(e.target.value))}
                                    />
                                    <Clock className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{fmtNum(hourlyWage)}(통상시급) x {rateSet.rates.premiums.overtime} x {att?.overtimeHours ?? 0}h = {fmtWon(row.overtimePay)}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TableCell>
                            <TableCell className="text-right">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-1 justify-end">
                                    <Input
                                      type="number"
                                      className="w-28 text-right text-sm h-8"
                                      value={row.nightPay}
                                      onChange={(e) => updateEarningField(emp.id, 'nightPay', Number(e.target.value))}
                                    />
                                    <Moon className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{fmtNum(hourlyWage)}(통상시급) x {rateSet.rates.premiums.night} x {att?.nightHours ?? 0}h = {fmtWon(row.nightPay)}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TableCell>
                            <TableCell className="text-right">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-1 justify-end">
                                    <Input
                                      type="number"
                                      className="w-28 text-right text-sm h-8"
                                      value={row.holidayPay}
                                      onChange={(e) => updateEarningField(emp.id, 'holidayPay', Number(e.target.value))}
                                    />
                                    <CalendarCheck className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{fmtNum(hourlyWage)}(통상시급) x {rateSet.rates.premiums.holiday} x {att?.holidayHours ?? 0}h = {fmtWon(row.holidayPay)}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                className="w-24 text-right text-sm h-8"
                                value={row.otherPay}
                                onChange={(e) => updateEarningField(emp.id, 'otherPay', Number(e.target.value))}
                              />
                            </TableCell>
                            <TableCell className="text-right font-mono font-semibold text-sm">{fmtNum(row.total)}</TableCell>
                            <TableCell className="text-center">
                              <Checkbox
                                checked={row.confirmed}
                                onCheckedChange={() => toggleConfirm(emp.id)}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <div className="mt-4 flex justify-end">
                  <div className="text-sm font-semibold">
                    총 지급액 합계: <span className="text-lg font-mono">{fmtWon(earningsTotal)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={goPrev}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                이전 단계
              </Button>
              <Button onClick={handleStep3Next}>
                다음 단계
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* ---- Step 4: 공제항목 설정 ---- */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">공제항목 설정 ({year}년 {month}월)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-auto border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky left-0 bg-background z-10">이름</TableHead>
                        <TableHead>부서</TableHead>
                        <TableHead className="text-right">과세소득</TableHead>
                        <TableHead className="text-center">부양가족</TableHead>
                        <TableHead className="text-right">국민연금</TableHead>
                        <TableHead className="text-right">건강보험</TableHead>
                        <TableHead className="text-right">장기요양</TableHead>
                        <TableHead className="text-right">고용보험</TableHead>
                        <TableHead className="text-right">소득세</TableHead>
                        <TableHead className="text-right">지방소득세</TableHead>
                        <TableHead className="text-right">기타공제</TableHead>
                        <TableHead className="text-right">합계</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedEmployees.map((emp) => {
                        const row = deductionRows.get(emp.id);
                        if (!row) return null;
                        return (
                          <TableRow key={emp.id}>
                            <TableCell className="sticky left-0 bg-background z-10 font-medium">{emp.name}</TableCell>
                            <TableCell className="text-sm">{emp.department}</TableCell>
                            <TableCell className="text-right font-mono text-sm">{fmtNum(row.taxableIncome)}</TableCell>
                            <TableCell className="text-center">
                              <Input
                                type="number"
                                min={1}
                                className="mx-auto h-8 w-16 text-center text-sm"
                                value={dependents.get(emp.id) ?? 1}
                                onChange={(e) => {
                                  const n = Math.max(1, Number(e.target.value) || 1);
                                  setDependents((prev) => new Map(prev).set(emp.id, n));
                                }}
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="font-mono text-sm cursor-help">{fmtNum(row.nationalPension)}</span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>min(max({fmtNum(row.taxableIncome)}, {fmtNum(rateSet.rates.nationalPension.minBase)}), {fmtNum(rateSet.rates.nationalPension.maxBase)}) × {(rateSet.rates.nationalPension.rate * 100).toFixed(3).replace(/.?0+$/, '')}%</p>
                                </TooltipContent>
                              </Tooltip>
                            </TableCell>
                            <TableCell className="text-right">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="font-mono text-sm cursor-help">{fmtNum(row.healthInsurance)}</span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{fmtNum(row.taxableIncome)} × {(rateSet.rates.healthInsurance.rate * 100).toFixed(3).replace(/.?0+$/, '')}%</p>
                                </TooltipContent>
                              </Tooltip>
                            </TableCell>
                            <TableCell className="text-right">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="font-mono text-sm cursor-help">{fmtNum(row.longTermCare)}</span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{fmtNum(row.healthInsurance)}(건강보험) × {pctText(rateSet.rates.longTermCare.rate)}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TableCell>
                            <TableCell className="text-right">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="font-mono text-sm cursor-help">{fmtNum(row.employmentInsurance)}</span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{fmtNum(row.taxableIncome)} × {(rateSet.rates.employmentInsurance.rate * 100).toFixed(3).replace(/.?0+$/, '')}%</p>
                                </TooltipContent>
                              </Tooltip>
                            </TableCell>
                            <TableCell className="text-right">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="font-mono text-sm cursor-help">{fmtNum(row.incomeTax)}</span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>간이세액표 기반 (연환산 → 근로소득공제 → 인적공제 → 세율적용 → 월할)</p>
                                </TooltipContent>
                              </Tooltip>
                            </TableCell>
                            <TableCell className="text-right">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="font-mono text-sm cursor-help">{fmtNum(row.localTax)}</span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{fmtNum(row.incomeTax)}(소득세) x 10%</p>
                                </TooltipContent>
                              </Tooltip>
                            </TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                className="w-24 text-right text-sm h-8"
                                value={row.otherDeduction}
                                onChange={(e) => updateDeductionField(emp.id, 'otherDeduction', Number(e.target.value))}
                              />
                            </TableCell>
                            <TableCell className="text-right font-mono font-semibold text-sm text-destructive">{fmtNum(row.total)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <div className="mt-4 flex justify-end">
                  <div className="text-sm font-semibold">
                    총 공제액 합계: <span className="text-lg font-mono text-destructive">{fmtWon(deductionsTotal)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={goPrev}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                이전 단계
              </Button>
              <Button onClick={handleStep4Next}>
                다음 단계
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* ---- Step 5: 계산 / 결과 ---- */}
        {currentStep === 5 && (
          <div className="space-y-4">
            {isClosed && (
              <div className="mb-4 p-4 rounded-lg border border-green-200 bg-green-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-semibold text-green-800">{year}년 {month}월 급여 마감 완료</p>
                    <p className="text-sm text-green-600">재계산이 필요하면 마감 해제를 진행하세요.</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="border-orange-500 text-orange-600 hover:bg-orange-50" onClick={handleReopen}>
                  <Unlock className="h-4 w-4 mr-2" />
                  마감 해제
                </Button>
              </div>
            )}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">계산 결과 ({year}년 {month}월)</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button onClick={calculateAll} disabled={isClosed}>
                      <Calculator className="h-4 w-4 mr-2" />
                      일괄 계산
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-auto border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8"></TableHead>
                        <TableHead>이름</TableHead>
                        <TableHead>부서</TableHead>
                        <TableHead className="text-right">총지급액</TableHead>
                        <TableHead className="text-right">총공제액</TableHead>
                        <TableHead className="text-right">실수령액</TableHead>
                        <TableHead className="text-center">상태</TableHead>
                        <TableHead className="text-center">작업</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedEmployees.map((emp) => {
                        const row = results.find((r) => r.employeeId === emp.id);
                        const isExpanded = expandedRows.has(emp.id);
                        const er = earningRows.get(emp.id);
                        const dr = deductionRows.get(emp.id);
                        const att = attendanceData.get(emp.id);
                        const hourlyWage = er?.hourlyWage ?? 0;
                        return (
                          <React.Fragment key={emp.id}>
                            <TableRow
                              className={`cursor-pointer ${row ? 'hover:bg-muted/50' : ''}`}
                              onClick={() => row && toggleResultExpand(emp.id)}
                            >
                              <TableCell>
                                {row && (
                                  isExpanded
                                    ? <ChevronDown className="h-4 w-4" />
                                    : <ChevronRight className="h-4 w-4" />
                                )}
                              </TableCell>
                              <TableCell className="font-medium">{emp.name}</TableCell>
                              <TableCell>{emp.department}</TableCell>
                              <TableCell className="text-right font-mono">
                                {row ? fmtWon(row.totalEarnings) : '-'}
                              </TableCell>
                              <TableCell className="text-right font-mono text-destructive">
                                {row ? fmtWon(row.totalDeductions) : '-'}
                              </TableCell>
                              <TableCell className="text-right font-mono font-bold text-primary">
                                {row ? fmtWon(row.netPay) : '-'}
                              </TableCell>
                              <TableCell className="text-center">
                                {row ? (
                                  <Badge variant="default" className="bg-green-600">계산완료</Badge>
                                ) : (
                                  <Badge variant="secondary">대기</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={isClosed}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    calculateSingle(emp.id);
                                  }}
                                >
                                  <Calculator className="h-3.5 w-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                            {row && isExpanded && er && dr && att && (
                              <TableRow>
                                <TableCell colSpan={8} className="bg-muted/30 p-0">
                                  <div className="p-4 font-mono text-sm space-y-1 whitespace-pre">
                                    <div className="font-bold text-foreground mb-2">{emp.name} - 급여 상세 내역</div>
                                    <div>기본급: {fmtWon(er.baseSalary)}</div>
                                    <div>+ 식대: {fmtWon(er.meal)} (비과세)</div>
                                    <div>+ 교통비: {fmtWon(er.transport)} (비과세)</div>
                                    {er.positionAllowance > 0 && (
                                      <div>+ 직책수당: {fmtWon(er.positionAllowance)}</div>
                                    )}
                                    {er.overtimePay > 0 && (
                                      <div>+ 연장수당: {fmtNum(hourlyWage)}(통상시급) x {rateSet.rates.premiums.overtime} x {att.overtimeHours}h = {fmtWon(er.overtimePay)}</div>
                                    )}
                                    {er.nightPay > 0 && (
                                      <div>+ 야간수당: {fmtNum(hourlyWage)}(통상시급) x {rateSet.rates.premiums.night} x {att.nightHours}h = {fmtWon(er.nightPay)}</div>
                                    )}
                                    {er.holidayPay > 0 && (
                                      <div>+ 휴일수당: {fmtNum(hourlyWage)}(통상시급) x {rateSet.rates.premiums.holiday} x {att.holidayHours}h = {fmtWon(er.holidayPay)}</div>
                                    )}
                                    {er.weeklyHolidayPay > 0 && (
                                      <div>
                                        + 주휴수당: {fmtWon(er.weeklyHolidayPay)}
                                        <span className="ml-1 opacity-70">({er.weeklyHolidayFormula})</span>
                                      </div>
                                    )}
                                    {er.otherPay > 0 && (
                                      <div>+ 기타수당: {fmtWon(er.otherPay)}</div>
                                    )}
                                    <Separator className="my-2" />
                                    <div className="font-semibold">총 지급액: {fmtWon(row.totalEarnings)}</div>
                                    <div className="mt-2">- 국민연금: {fmtWon(dr.nationalPension)} (min(max({fmtNum(dr.taxableIncome)}, {fmtNum(rateSet.rates.nationalPension.minBase)}), {fmtNum(rateSet.rates.nationalPension.maxBase)}) × {pctText(rateSet.rates.nationalPension.rate)})</div>
                                    <div>- 건강보험: {fmtWon(dr.healthInsurance)} ({fmtNum(dr.taxableIncome)} × {pctText(rateSet.rates.healthInsurance.rate)})</div>
                                    <div>- 장기요양: {fmtWon(dr.longTermCare)} ({fmtNum(dr.healthInsurance)} × {pctText(rateSet.rates.longTermCare.rate)})</div>
                                    <div>- 고용보험: {fmtWon(dr.employmentInsurance)} ({fmtNum(dr.taxableIncome)} × {pctText(rateSet.rates.employmentInsurance.rate)})</div>
                                    <div>- 소득세: {fmtWon(dr.incomeTax)} (간이세액표 기반)</div>
                                    <div>- 지방소득세: {fmtWon(dr.localTax)} ({fmtNum(dr.incomeTax)} x 10%)</div>
                                    {dr.otherDeduction > 0 && (
                                      <div>- 기타공제: {fmtWon(dr.otherDeduction)}</div>
                                    )}
                                    <Separator className="my-2" />
                                    <div className="font-semibold text-destructive">총 공제액: {fmtWon(row.totalDeductions)}</div>
                                    <Separator className="my-2" />
                                    <div className="font-bold text-primary text-base">실수령액: {fmtWon(row.netPay)}</div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {results.length > 0 && (
                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      {results.length}명 계산 완료 | 총 지급: {fmtWon(results.reduce((s, r) => s + r.totalEarnings, 0))} | 총 공제: {fmtWon(results.reduce((s, r) => s + r.totalDeductions, 0))} | 총 실수령: {fmtWon(results.reduce((s, r) => s + r.netPay, 0))}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" onClick={handleExcelDownload}>
                        <FileDown className="h-4 w-4 mr-2" />
                        엑셀 다운로드
                      </Button>
                      {!isClosed ? (
                        <>
                          <Button onClick={handleSaveAll}>
                            <Save className="h-4 w-4 mr-2" />
                            전체 저장
                          </Button>
                          <Button variant="default" className="bg-green-600 hover:bg-green-700" onClick={handleClose} disabled={results.length === 0}>
                            <Lock className="h-4 w-4 mr-2" />
                            마감
                          </Button>
                        </>
                      ) : (
                        <Button variant="outline" className="border-orange-500 text-orange-600 hover:bg-orange-50" onClick={handleReopen}>
                          <Unlock className="h-4 w-4 mr-2" />
                          마감 해제
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-start">
              <Button variant="outline" onClick={goPrev}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                이전 단계
              </Button>
            </div>
          </div>
        )}

        {/* ---- Excel Paste Dialog ---- */}
        <Dialog open={excelDialogOpen} onOpenChange={setExcelDialogOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>엑셀 데이터 붙여넣기</DialogTitle>
              <DialogDescription>
                엑셀에서 복사한 탭 구분 데이터를 붙여넣어주세요. 첫 행은 헤더(사원번호, 식대, 교통비, 직책수당, 기타수당)여야 합니다.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <textarea
                className="w-full h-40 border rounded-md p-3 text-sm font-mono resize-none"
                placeholder={"사원번호\t식대\t교통비\t직책수당\t기타수당\ne010\t200000\t200000\t300000\t0\ne011\t200000\t200000\t0\t50000"}
                value={pasteData}
                onChange={(e) => setPasteData(e.target.value)}
              />
              <Button variant="outline" onClick={handleParsePaste} disabled={!pasteData.trim()}>
                파싱 미리보기
              </Button>
              {parsedPasteRows.length > 0 && (
                <div className="max-h-48 overflow-auto border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {Object.keys(parsedPasteRows[0]).map((key) => (
                          <TableHead key={key} className="text-xs">{key}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedPasteRows.map((row, idx) => (
                        <TableRow key={idx}>
                          {Object.values(row).map((val, i) => (
                            <TableCell key={i} className="text-xs">{val}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setExcelDialogOpen(false); setPasteData(''); setParsedPasteRows([]); }}>
                취소
              </Button>
              <Button onClick={handleApplyPaste} disabled={parsedPasteRows.length === 0}>
                적용
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <PayrollItemSettings open={settingsOpen} onOpenChange={setSettingsOpen} />
      </div>
    </TooltipProvider>
  );
}
