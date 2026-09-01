/**
 * 근로소득 원천징수 세액 (근사).
 *
 * 계산은 `@/lib/payroll/engine`의 `computeIncomeTax`가 하고, 여기서는 연도별
 * 기준값을 받아 넘기는 껍데기만 둡니다.
 *
 * 국세청 간이세액표를 그대로 옮긴 것이 아니라 연 환산 후 근로소득공제·인적공제를
 * 빼고 세율을 적용하는 **근사 계산**입니다. 실제 원천징수액과 차이가 날 수 있고
 * 연말정산에서 정산됩니다. 정확한 표가 필요해지면 엔진의 해당 함수만 교체하면
 * 나머지 계산은 손대지 않아도 됩니다.
 */
import { computeIncomeTax } from '@/lib/payroll/engine';
import { DEFAULT_RATE_SET, type PayrollRateSet } from '@/lib/payroll/rate-set';

export function calculateMonthlyIncomeTax(
  monthlyTaxableIncome: number,
  dependents: number = 1,
  rates: PayrollRateSet = DEFAULT_RATE_SET,
): { incomeTax: number; localTax: number; formula: string } {
  return computeIncomeTax(monthlyTaxableIncome, dependents, rates);
}

/** 연 과세표준에 대한 산출세액. 퇴직소득·연말정산 화면에서 씁니다. */
export function calculateIncomeTax(
  annualTaxBase: number,
  rates: PayrollRateSet = DEFAULT_RATE_SET,
): number {
  const bracket =
    rates.incomeTax.brackets.find((b) => b.upTo === null || annualTaxBase <= b.upTo) ??
    rates.incomeTax.brackets[rates.incomeTax.brackets.length - 1];
  return Math.max(0, Math.round(annualTaxBase * bracket.rate - bracket.progressive));
}
