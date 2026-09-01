/**
 * 4대보험 근로자 부담금.
 *
 * 계산 자체는 `@/lib/payroll/engine`이 하고, 여기서는 연도별 기준값을 받아
 * 넘기는 얇은 껍데기만 둡니다. 구현이 두 벌이면 화면마다 다른 금액이 나오고,
 * 개편 전 실제로 그런 상태였습니다 — 설정 화면의 요율과 계산에 쓰이는 요율이
 * 서로 다른 곳에 있었습니다.
 */
import { DEFAULT_RATE_SET, type PayrollRateSet } from '@/lib/payroll/rate-set';

export interface InsuranceResult {
  nationalPension: number;
  healthInsurance: number;
  longTermCare: number;
  employmentInsurance: number;
  totalDeductions: number;
}

/**
 * @param taxableIncome 과세 대상 소득 (비과세 제외)
 * @param rates 해당 연도 기준값. 생략하면 코드 기본값을 쓰지만, 화면에서는
 *              반드시 `resolveRateSet(year)`로 받은 값을 넘겨야 설정이 반영됩니다.
 */
export function calculateInsurance(
  taxableIncome: number,
  rates: PayrollRateSet = DEFAULT_RATE_SET,
): InsuranceResult {
  // 과세소득 0이면 보험료도 0 — 하한액을 그대로 적용하면 무급 달에도 보험료가 찍힙니다.
  const pensionBase =
    taxableIncome <= 0
      ? 0
      : Math.min(
          Math.max(taxableIncome, rates.nationalPension.minBase),
          rates.nationalPension.maxBase,
        );
  const nationalPension = Math.round(pensionBase * rates.nationalPension.rate);
  const healthInsurance = Math.round(taxableIncome * rates.healthInsurance.rate);
  const longTermCare = Math.round(healthInsurance * rates.longTermCare.rate);
  const employmentInsurance = Math.round(taxableIncome * rates.employmentInsurance.rate);

  return {
    nationalPension,
    healthInsurance,
    longTermCare,
    employmentInsurance,
    totalDeductions: nationalPension + healthInsurance + longTermCare + employmentInsurance,
  };
}
