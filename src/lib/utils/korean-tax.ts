/**
 * 간이세액표 기반 근사 소득세 계산
 * 실제 운영 시에는 국세청 간이세액표 데이터를 사용해야 합니다.
 */

interface TaxBracket {
  min: number;
  max: number;
  rate: number;
  deduction: number;
}

const TAX_BRACKETS: TaxBracket[] = [
  { min: 0, max: 14000000, rate: 0.06, deduction: 0 },
  { min: 14000000, max: 50000000, rate: 0.15, deduction: 1260000 },
  { min: 50000000, max: 88000000, rate: 0.24, deduction: 5760000 },
  { min: 88000000, max: 150000000, rate: 0.35, deduction: 15440000 },
  { min: 150000000, max: 300000000, rate: 0.38, deduction: 19940000 },
  { min: 300000000, max: 500000000, rate: 0.40, deduction: 25940000 },
  { min: 500000000, max: 1000000000, rate: 0.42, deduction: 35940000 },
  { min: 1000000000, max: Infinity, rate: 0.45, deduction: 65940000 },
];

/**
 * 연간 과세표준 기반 소득세 계산 (근사)
 */
export function calculateIncomeTax(annualTaxableIncome: number): number {
  const bracket = TAX_BRACKETS.find(
    (b) => annualTaxableIncome > b.min && annualTaxableIncome <= b.max
  ) || TAX_BRACKETS[TAX_BRACKETS.length - 1];

  return Math.round(annualTaxableIncome * bracket.rate - bracket.deduction);
}

/**
 * 월 소득세 (간이) 계산
 * @param monthlyTaxableIncome 월 과세 소득
 * @param dependents 부양가족 수 (본인 포함)
 */
export function calculateMonthlyIncomeTax(
  monthlyTaxableIncome: number,
  dependents: number = 1
): { incomeTax: number; localTax: number } {
  // 연 환산
  const annualIncome = monthlyTaxableIncome * 12;

  // 근로소득공제 (간략화)
  let deduction = 0;
  if (annualIncome <= 5000000) {
    deduction = annualIncome * 0.7;
  } else if (annualIncome <= 15000000) {
    deduction = 3500000 + (annualIncome - 5000000) * 0.4;
  } else if (annualIncome <= 45000000) {
    deduction = 7500000 + (annualIncome - 15000000) * 0.15;
  } else if (annualIncome <= 100000000) {
    deduction = 12000000 + (annualIncome - 45000000) * 0.05;
  } else {
    deduction = 14750000 + (annualIncome - 100000000) * 0.02;
  }

  // 인적공제 (1인당 150만원)
  const personalDeduction = dependents * 1500000;

  const taxableIncome = Math.max(annualIncome - deduction - personalDeduction, 0);
  const annualTax = calculateIncomeTax(taxableIncome);
  const monthlyTax = Math.round(annualTax / 12);

  // 지방소득세 = 소득세의 10%
  const localTax = Math.round(monthlyTax * 0.1);

  return {
    incomeTax: monthlyTax,
    localTax,
  };
}
