/**
 * 4대보험 요율 (2026년 기준 추정)
 * 설정으로 변경 가능하도록 상수로 관리
 */
export const INSURANCE_RATES = {
  // 국민연금 (사업주 4.5%, 근로자 4.5%)
  nationalPension: {
    employee: 0.045,
    employer: 0.045,
    maxBase: 5900000, // 상한액
    minBase: 370000,  // 하한액
  },
  // 건강보험 (사업주 3.545%, 근로자 3.545%)
  healthInsurance: {
    employee: 0.03545,
    employer: 0.03545,
  },
  // 장기요양보험 (건강보험의 12.95%)
  longTermCare: {
    rate: 0.1295,
  },
  // 고용보험 (근로자 0.9%, 사업주 0.9%~1.65%)
  employmentInsurance: {
    employee: 0.009,
    employer: 0.009,
  },
} as const;

export interface InsuranceResult {
  nationalPension: number;
  healthInsurance: number;
  longTermCare: number;
  employmentInsurance: number;
  totalDeductions: number;
}

/**
 * 4대보험 근로자 부담금 계산
 */
export function calculateInsurance(monthlySalary: number): InsuranceResult {
  // 국민연금
  const pensionBase = Math.min(
    Math.max(monthlySalary, INSURANCE_RATES.nationalPension.minBase),
    INSURANCE_RATES.nationalPension.maxBase
  );
  const nationalPension = Math.round(pensionBase * INSURANCE_RATES.nationalPension.employee);

  // 건강보험
  const healthInsurance = Math.round(monthlySalary * INSURANCE_RATES.healthInsurance.employee);

  // 장기요양보험
  const longTermCare = Math.round(healthInsurance * INSURANCE_RATES.longTermCare.rate);

  // 고용보험
  const employmentInsurance = Math.round(monthlySalary * INSURANCE_RATES.employmentInsurance.employee);

  return {
    nationalPension,
    healthInsurance,
    longTermCare,
    employmentInsurance,
    totalDeductions: nationalPension + healthInsurance + longTermCare + employmentInsurance,
  };
}
