/**
 * 연도별 급여 기준값.
 *
 * 4대보험 요율, 비과세 한도, 소득세 구간은 **매년 바뀝니다.** 이 값들이 코드에
 * 상수로 박혀 있으면 해마다 개발자가 배포를 해야 하고, 그 사이 담당자가 설정
 * 화면에서 요율을 고쳐도 계산은 옛 숫자로 돌아갑니다. 실제로 개편 전 이
 * 시스템이 그 상태였습니다 — 설정 화면의 요율은 표시용이고 계산은 하드코딩된
 * 값을 썼습니다.
 *
 * 그래서 "해마다 바뀌는 숫자"를 전부 한 덩어리로 묶어 연도로 조회하게 했습니다.
 * 새해가 오면 관리자가 전년도 값을 복사해 숫자만 고치면 됩니다.
 */

export interface EarnedIncomeDeductionBand {
  /** 이 금액 이하 구간 (원, 연 환산). 마지막 구간은 null. */
  upTo: number | null;
  /** 구간 시작점까지의 누적 공제액 */
  base: number;
  /** 구간 초과분에 적용할 공제율 */
  rate: number;
}

export interface TaxBracket {
  /** 이 과세표준 이하. 마지막 구간은 null. */
  upTo: number | null;
  rate: number;
  /** 누진공제액 */
  progressive: number;
}

export interface PayrollRateSet {
  year: number;
  /** 이 값들을 어디서 확인했는지 — 매년 갱신할 때 근거를 남깁니다. */
  note: string;

  /** 근로자 부담분만 다룹니다. 사업주 부담분은 급여 계산에 들어가지 않습니다. */
  nationalPension: { rate: number; maxBase: number; minBase: number };
  healthInsurance: { rate: number };
  /** 건강보험료에 곱합니다 (과세소득이 아니라). */
  longTermCare: { rate: number };
  employmentInsurance: { rate: number };

  /** 월 한도. 이 금액까지만 비과세로 빠집니다. */
  nonTaxableLimits: {
    meal: number;
    transport: number;
    childcare: number;
    research: number;
  };

  incomeTax: {
    earnedIncomeDeduction: EarnedIncomeDeductionBand[];
    /** 부양가족 1인당 연 공제액 */
    personalDeductionPerDependent: number;
    brackets: TaxBracket[];
    /** 지방소득세 = 소득세 × 이 비율 */
    localTaxRate: number;
  };

  /**
   * 통상시급 산정 기준 월 소정근로시간 (통상 209).
   *
   * 209는 주 40시간에 **주휴시간이 더해진** 값이므로, 이 값을 근무일수로 나눠
   * 1일 근로시간을 구하면 안 됩니다(약 9.6시간이 나와 20% 과다 계산됩니다).
   * 1일 근로시간은 아래 `standardDailyHours`를 씁니다.
   */
  monthlyWorkHours: number;
  /** 1일 소정근로시간. 시급·일급제의 시간 환산 기준입니다. */
  standardDailyHours: number;
  /** 가산율 — 근로기준법상 최저치이며 사규로 올릴 수 있습니다. */
  premiums: { overtime: number; night: number; holiday: number };
}

/**
 * 기본값.
 *
 * **주의** — 아래 숫자는 개편 전 코드에 "2026년 기준 추정"으로 들어 있던 값을
 * 그대로 옮긴 것입니다. 확정된 고시값이 아니므로, 운영 투입 전에 반드시
 * 국민연금공단·건강보험공단·고용노동부·국세청 고시로 대조해 주세요.
 * 대조가 끝나면 `note`를 근거로 바꿔 적어 두면 다음 담당자가 압니다.
 */
export const DEFAULT_RATE_SET: PayrollRateSet = {
  year: 2026,
  note: '개편 전 코드의 추정값을 이관했습니다. 고시값 대조 전입니다.',

  nationalPension: { rate: 0.045, maxBase: 5_900_000, minBase: 370_000 },
  healthInsurance: { rate: 0.03545 },
  longTermCare: { rate: 0.1295 },
  employmentInsurance: { rate: 0.009 },

  nonTaxableLimits: {
    meal: 200_000,
    transport: 200_000,
    childcare: 200_000,
    research: 200_000,
  },

  incomeTax: {
    earnedIncomeDeduction: [
      { upTo: 5_000_000, base: 0, rate: 0.7 },
      { upTo: 15_000_000, base: 3_500_000, rate: 0.4 },
      { upTo: 45_000_000, base: 7_500_000, rate: 0.15 },
      { upTo: 100_000_000, base: 12_000_000, rate: 0.05 },
      { upTo: null, base: 14_750_000, rate: 0.02 },
    ],
    personalDeductionPerDependent: 1_500_000,
    brackets: [
      { upTo: 14_000_000, rate: 0.06, progressive: 0 },
      { upTo: 50_000_000, rate: 0.15, progressive: 1_260_000 },
      { upTo: 88_000_000, rate: 0.24, progressive: 5_760_000 },
      { upTo: 150_000_000, rate: 0.35, progressive: 15_440_000 },
      { upTo: 300_000_000, rate: 0.38, progressive: 19_940_000 },
      { upTo: 500_000_000, rate: 0.4, progressive: 25_940_000 },
      { upTo: 1_000_000_000, rate: 0.42, progressive: 35_940_000 },
      { upTo: null, rate: 0.45, progressive: 65_940_000 },
    ],
    localTaxRate: 0.1,
  },

  monthlyWorkHours: 209,
  standardDailyHours: 8,
  premiums: { overtime: 1.5, night: 0.5, holiday: 1.5 },
};

/** 다음 해 기준값을 만들 때 쓰는 복사본. 숫자는 그대로, 연도와 메모만 바꿉니다. */
export function copyRateSetForYear(source: PayrollRateSet, year: number): PayrollRateSet {
  return {
    ...structuredClone(source),
    year,
    note: `${source.year}년 값을 복사했습니다. ${year}년 고시값으로 대조하세요.`,
  };
}
