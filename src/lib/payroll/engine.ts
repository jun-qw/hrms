/**
 * 급여 계산 엔진.
 *
 * 순수 함수입니다 — DB도 React도 모릅니다. 그래야 스크립트로 검증할 수 있고,
 * 소급 재계산과 화면 계산이 같은 결과를 냅니다.
 *
 * 모든 줄에 `formula` 문자열이 붙습니다. 담당자가 직원에게 "왜 이 금액인지"를
 * 설명할 수 없으면 시스템을 신뢰하지 않기 때문입니다.
 */
import type { PayMethod, PayrollRateSet } from './rate-set';
import { computeWeeklyHoliday, type WeekAttendance } from './weekly-holiday';

export type { PayMethod };

export interface PayrollLine {
  code: string;
  name: string;
  amount: number;
  /** 과세 대상 여부. 비과세 한도를 넘은 초과분은 별도 과세 줄로 나옵니다. */
  taxable: boolean;
  formula: string;
}

export interface AttendanceInput {
  /** 해당 월의 소정근로일수 */
  scheduledDays: number;
  /** 실제 근무일수 — 중도 입퇴사자는 재직일만 */
  workedDays: number;
  overtimeHours: number;
  nightHours: number;
  holidayHours: number;
  /** 시급·일급제에서 쓰는 실근로시간 */
  workedHours?: number;
  /** 주휴수당 판정용 주별 집계. 비어 있으면 주휴수당을 계산하지 않습니다. */
  weeks?: WeekAttendance[];
}

export interface EmployeeInput {
  employeeId: string;
  name: string;
  payMethod: PayMethod;
  /** 월급제·연봉제는 월 기본급, 시급제는 시급, 일급제는 일급 */
  baseAmount: number;
  /** 부양가족 수 (본인 포함). 소득세에 직접 영향을 줍니다. */
  dependents: number;
  /** 고정 수당·공제 — 급여마스터에서 유효일자로 뽑아 넘깁니다. */
  allowances: { code: string; name: string; amount: number; taxable: boolean }[];
  deductions: { code: string; name: string; amount: number }[];
  attendance: AttendanceInput;
  /** 이 달에 입사했다면 입사일, 아니면 null */
  joinedMidMonth: string | null;
  /** 이 달에 퇴사했다면 퇴사일, 아니면 null */
  leftMidMonth: string | null;
}

export interface PayrollComputation {
  employeeId: string;
  name: string;
  /** 통상시급 — 연장·야간·휴일 가산의 기준 */
  hourlyWage: number;
  /** 일할계산이 걸렸는지, 걸렸다면 몇 분의 몇인지 */
  proration: { applied: boolean; workedDays: number; scheduledDays: number } | null;
  earnings: PayrollLine[];
  deductions: PayrollLine[];
  totalEarnings: number;
  /** 과세 대상 합계 — 4대보험·소득세의 기준 */
  taxableIncome: number;
  nonTaxableTotal: number;
  totalDeductions: number;
  netPay: number;
}

const won = (n: number) => Math.round(n).toLocaleString('ko-KR');

/**
 * 한 사람의 한 달 급여.
 *
 * 순서가 중요합니다: 기본급(→ 필요하면 일할계산) → 수당 → 비과세 한도 적용 →
 * 과세소득 확정 → 4대보험 → 소득세 → 기타공제.
 */
export function computePayroll(
  input: EmployeeInput,
  rates: PayrollRateSet,
): PayrollComputation {
  const earnings: PayrollLine[] = [];
  const deductions: PayrollLine[] = [];
  const att = input.attendance;

  // ── 기본급 ────────────────────────────────────────────────────────────
  const { base, hourlyWage, proration } = computeBase(input, rates);
  earnings.push(base);

  // ── 시간외 수당 ───────────────────────────────────────────────────────
  const premium = (hours: number, multiplier: number, code: string, name: string) => {
    if (hours <= 0) return;
    const amount = Math.round(hourlyWage * multiplier * hours);
    earnings.push({
      code,
      name,
      amount,
      taxable: true,
      formula: `${won(hourlyWage)}(통상시급) × ${multiplier} × ${hours}시간 = ${won(amount)}원`,
    });
  };
  premium(att.overtimeHours, rates.premiums.overtime, 'OVT', '연장근로수당');
  premium(att.nightHours, rates.premiums.night, 'NGT', '야간근로수당');
  premium(att.holidayHours, rates.premiums.holiday, 'HOL', '휴일근로수당');

  // ── 주휴수당 ──────────────────────────────────────────────────────────
  // 방식은 회사 정책이라 기준값에서 옵니다. 월급제는 209시간에 이미 들어 있어
  // 기본값에서 제외되어 있습니다 — 여기에 또 붙이면 이중지급입니다.
  if (att.weeks && att.weeks.length > 0) {
    const weekly = computeWeeklyHoliday(att.weeks, hourlyWage, input.payMethod, rates);
    if (weekly.amount > 0) {
      earnings.push({
        code: 'WKH',
        name: '주휴수당',
        amount: weekly.amount,
        taxable: true,
        formula: weekly.formula,
      });
    }
  }

  // ── 고정 수당 ─────────────────────────────────────────────────────────
  // 비과세 항목은 한도까지만 비과세로 두고, 초과분은 과세 줄로 갈라 놓습니다.
  // 한 줄에 섞어 두면 명세서에서 왜 과세소득이 그 금액인지 설명할 수 없습니다.
  for (const item of input.allowances) {
    if (item.amount <= 0) continue;
    const limit = nonTaxableLimitFor(item.code, rates);

    if (item.taxable || limit === null) {
      earnings.push({
        code: item.code,
        name: item.name,
        amount: item.amount,
        taxable: item.taxable,
        formula: `${won(item.amount)}원${item.taxable ? '' : ' (비과세)'}`,
      });
      continue;
    }

    const exempt = Math.min(item.amount, limit);
    earnings.push({
      code: item.code,
      name: item.name,
      amount: exempt,
      taxable: false,
      formula:
        item.amount > limit
          ? `${won(item.amount)}원 중 비과세 한도 ${won(limit)}원까지`
          : `${won(exempt)}원 (비과세)`,
    });
    if (item.amount > limit) {
      earnings.push({
        code: `${item.code}_TX`,
        name: `${item.name} (한도초과)`,
        amount: item.amount - limit,
        taxable: true,
        formula: `${won(item.amount)} − 비과세 한도 ${won(limit)} = ${won(item.amount - limit)}원 (과세)`,
      });
    }
  }

  const totalEarnings = earnings.reduce((s, l) => s + l.amount, 0);
  const taxableIncome = earnings.filter((l) => l.taxable).reduce((s, l) => s + l.amount, 0);
  const nonTaxableTotal = totalEarnings - taxableIncome;

  // ── 4대보험 ───────────────────────────────────────────────────────────
  // 과세소득이 0이면 보험료도 0입니다. 국민연금 기준소득 하한을 그대로 적용하면
  // 무급휴직이나 급여가 전부 비과세인 달에도 하한액 기준 보험료가 찍힙니다.
  const pensionBase =
    taxableIncome <= 0
      ? 0
      : Math.min(
          Math.max(taxableIncome, rates.nationalPension.minBase),
          rates.nationalPension.maxBase,
        );
  const pension = Math.round(pensionBase * rates.nationalPension.rate);
  deductions.push({
    code: 'ANU',
    name: '국민연금',
    amount: pension,
    taxable: false,
    formula:
      pensionBase !== taxableIncome
        ? `기준소득 ${won(pensionBase)}원(${taxableIncome > pensionBase ? '상한' : '하한'} 적용) × ${pct(rates.nationalPension.rate)} = ${won(pension)}원`
        : `${won(taxableIncome)} × ${pct(rates.nationalPension.rate)} = ${won(pension)}원`,
  });

  const health = Math.round(taxableIncome * rates.healthInsurance.rate);
  deductions.push({
    code: 'MED',
    name: '건강보험',
    amount: health,
    taxable: false,
    formula: `${won(taxableIncome)} × ${pct(rates.healthInsurance.rate)} = ${won(health)}원`,
  });

  const care = Math.round(health * rates.longTermCare.rate);
  deductions.push({
    code: 'MME',
    name: '장기요양보험',
    amount: care,
    taxable: false,
    formula: `${won(health)}(건강보험료) × ${pct(rates.longTermCare.rate)} = ${won(care)}원`,
  });

  const employment = Math.round(taxableIncome * rates.employmentInsurance.rate);
  deductions.push({
    code: 'HIR',
    name: '고용보험',
    amount: employment,
    taxable: false,
    formula: `${won(taxableIncome)} × ${pct(rates.employmentInsurance.rate)} = ${won(employment)}원`,
  });

  // ── 소득세 ────────────────────────────────────────────────────────────
  const tax = computeIncomeTax(taxableIncome, input.dependents, rates);
  deductions.push({
    code: 'INC',
    name: '소득세',
    amount: tax.incomeTax,
    taxable: false,
    formula: tax.formula,
  });
  deductions.push({
    code: 'LOC',
    name: '지방소득세',
    amount: tax.localTax,
    taxable: false,
    formula: `${won(tax.incomeTax)}(소득세) × ${pct(rates.incomeTax.localTaxRate)} = ${won(tax.localTax)}원`,
  });

  // ── 기타 공제 ─────────────────────────────────────────────────────────
  for (const item of input.deductions) {
    if (item.amount <= 0) continue;
    deductions.push({
      code: item.code,
      name: item.name,
      amount: item.amount,
      taxable: false,
      formula: `${won(item.amount)}원`,
    });
  }

  const totalDeductions = deductions.reduce((s, l) => s + l.amount, 0);

  return {
    employeeId: input.employeeId,
    name: input.name,
    hourlyWage,
    proration,
    earnings,
    deductions,
    totalEarnings,
    taxableIncome,
    nonTaxableTotal,
    totalDeductions,
    netPay: totalEarnings - totalDeductions,
  };
}

// ---------------------------------------------------------------------------

function computeBase(
  input: EmployeeInput,
  rates: PayrollRateSet,
): { base: PayrollLine; hourlyWage: number; proration: PayrollComputation['proration'] } {
  const att = input.attendance;

  if (input.payMethod === 'hourly') {
    const hours = att.workedHours ?? 0;
    const amount = Math.round(input.baseAmount * hours);
    return {
      hourlyWage: input.baseAmount,
      proration: null,
      base: {
        code: 'BAS',
        name: '기본급 (시급)',
        amount,
        taxable: true,
        formula: `${won(input.baseAmount)}원(시급) × ${hours}시간 = ${won(amount)}원`,
      },
    };
  }

  if (input.payMethod === 'daily') {
    const amount = Math.round(input.baseAmount * att.workedDays);
    // 일급제의 통상시급은 일급을 1일 소정근로시간으로 나눕니다.
    // 209 ÷ 21.75가 아닙니다 — 209에는 주휴시간이 들어 있습니다.
    const dailyHours = rates.standardDailyHours;
    return {
      hourlyWage: Math.round(input.baseAmount / dailyHours),
      proration: null,
      base: {
        code: 'BAS',
        name: '기본급 (일급)',
        amount,
        taxable: true,
        formula: `${won(input.baseAmount)}원(일급) × ${att.workedDays}일 = ${won(amount)}원`,
      },
    };
  }

  // 월급제 · 연봉제 — 연봉제는 이미 12로 나눈 월액이 들어옵니다.
  const monthly = input.baseAmount;
  const hourlyWage = Math.round(monthly / rates.monthlyWorkHours);
  const midMonth = input.joinedMidMonth !== null || input.leftMidMonth !== null;

  if (!midMonth || att.scheduledDays <= 0 || att.workedDays >= att.scheduledDays) {
    return {
      hourlyWage,
      proration: null,
      base: {
        code: 'BAS',
        name: '기본급',
        amount: monthly,
        taxable: true,
        formula: `${won(monthly)}원`,
      },
    };
  }

  // 중도 입퇴사 일할계산 — 소정근로일수 대비 재직일수 비율.
  const amount = Math.round((monthly * att.workedDays) / att.scheduledDays);
  const reason = input.joinedMidMonth
    ? `${input.joinedMidMonth} 입사`
    : `${input.leftMidMonth} 퇴사`;
  return {
    hourlyWage,
    proration: { applied: true, workedDays: att.workedDays, scheduledDays: att.scheduledDays },
    base: {
      code: 'BAS',
      name: '기본급 (일할)',
      amount,
      taxable: true,
      formula: `${won(monthly)} × ${att.workedDays}일 / ${att.scheduledDays}일 = ${won(amount)}원 (${reason})`,
    },
  };
}

/**
 * 월 소득세 — 연 환산 후 근로소득공제·인적공제를 빼고 세율을 적용해 12로 나눕니다.
 *
 * 국세청 간이세액표를 그대로 옮긴 것이 아니라 **근사 계산**입니다. 실제 원천징수
 * 세액과는 차이가 날 수 있고, 연말정산에서 정산됩니다. 정확한 표가 필요하면
 * 이 함수만 교체하면 되도록 다른 계산과 분리해 두었습니다.
 */
export function computeIncomeTax(
  monthlyTaxableIncome: number,
  dependents: number,
  rates: PayrollRateSet,
): { incomeTax: number; localTax: number; formula: string } {
  const annual = monthlyTaxableIncome * 12;

  let earnedDeduction = 0;
  let lower = 0;
  for (const band of rates.incomeTax.earnedIncomeDeduction) {
    if (band.upTo === null || annual <= band.upTo) {
      earnedDeduction = band.base + (annual - lower) * band.rate;
      break;
    }
    lower = band.upTo;
  }

  const personal = Math.max(1, dependents) * rates.incomeTax.personalDeductionPerDependent;
  const taxBase = Math.max(0, annual - earnedDeduction - personal);

  const bracket =
    rates.incomeTax.brackets.find((b) => b.upTo === null || taxBase <= b.upTo) ??
    rates.incomeTax.brackets[rates.incomeTax.brackets.length - 1];
  const annualTax = Math.max(0, Math.round(taxBase * bracket.rate - bracket.progressive));
  const incomeTax = Math.round(annualTax / 12);
  const localTax = Math.round(incomeTax * rates.incomeTax.localTaxRate);

  return {
    incomeTax,
    localTax,
    formula:
      `연환산 ${won(annual)} − 근로소득공제 ${won(earnedDeduction)} − 인적공제 ${won(personal)}(${dependents}인)` +
      ` = 과세표준 ${won(taxBase)} → ${pct(bracket.rate)} − 누진공제 ${won(bracket.progressive)}` +
      ` = 연 ${won(annualTax)} ÷ 12 = ${won(incomeTax)}원`,
  };
}

function nonTaxableLimitFor(code: string, rates: PayrollRateSet): number | null {
  const map: Record<string, number> = {
    MEAL: rates.nonTaxableLimits.meal,
    TRANSPORT: rates.nonTaxableLimits.transport,
    CHILDCARE: rates.nonTaxableLimits.childcare,
    RESEARCH: rates.nonTaxableLimits.research,
  };
  return map[code] ?? null;
}

/** 0.03545 → '3.545%'. 소수점 이하 불필요한 0은 Number 변환으로 떨어집니다. */
function pct(rate: number): string {
  return `${Number((rate * 100).toFixed(4))}%`;
}
