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

/**
 * 주휴수당 산정 방식.
 *
 * 근로기준법 제55조는 1주 평균 1회 이상의 **유급**휴일을 정하고, 시행령 제30조는
 * 그 주의 소정근로일을 개근한 사람에게 주도록 합니다. 다만 **실무에서 어떻게
 * 지급하는지는 회사마다 다릅니다** — 월급에 이미 포함해 두는 곳, 시급직에게만
 * 주 단위로 따로 계산해 붙이는 곳, 월 정액으로 주는 곳이 다 있습니다.
 *
 * 그래서 규칙은 하나로 두되 방식은 관리자가 고르게 합니다. 잘못 고르면 이중지급
 * 아니면 미지급이 되므로, 화면에서 각 방식이 무엇을 뜻하는지 함께 설명합니다.
 */
export type WeeklyHolidayMethod = 'included' | 'calculated' | 'fixed';

export interface WeeklyHolidayPolicy {
  method: WeeklyHolidayMethod;
  /**
   * 이 급여방식에만 적용합니다.
   *
   * 월급제는 월 소정근로시간 209시간에 주휴시간이 이미 들어 있어, 여기에 또
   * 붙이면 이중지급입니다. 그래서 기본값은 시급·일급제만입니다.
   */
  applyTo: PayMethod[];
  /** 지급 대상 최소 주 소정근로시간. 근로기준법 제18조 제3항의 15시간. */
  minWeeklyHours: number;
  /** 그 주 소정근로일을 개근해야 지급 (시행령 제30조). 끄면 결근해도 지급합니다. */
  requireFullAttendance: boolean;
  /** 주 40시간 미만인 단시간 근로자에게 비례 계산할지. */
  prorateForPartTime: boolean;
  /** `fixed`일 때 매월 지급할 정액. */
  fixedMonthlyAmount: number;
}

export type PayMethod = 'monthly' | 'annual' | 'hourly' | 'daily';

export interface PayrollRateSet {
  year: number;
  /** 이 값들을 어디서 확인했는지 — 매년 갱신할 때 근거를 남깁니다. */
  note: string;
  /**
   * 고시값과 대조를 끝냈는가.
   *
   * 새해 기준값은 직전 해를 복사해 만들기 때문에, 손대지 않으면 작년 요율로
   * 급여가 나갑니다. 숫자만 봐서는 대조한 값인지 복사만 된 값인지 구분되지
   * 않아 눈에 보이는 표시를 따로 둡니다. 급여계산 화면에서도 경고합니다.
   */
  verified?: boolean;
  /** 대조한 날짜 (YYYY-MM-DD). 누가 언제 확인했는지 남깁니다. */
  verifiedAt?: string | null;
  verifiedBy?: string | null;

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
  /**
   * 최저임금 (시간급). 시급 입력 시 미달 여부를 경고하는 데만 씁니다 —
   * 계산을 막지는 않습니다. 수습기간 감액처럼 예외가 있기 때문입니다.
   */
  minimumHourlyWage: number;
  /**
   * 주휴수당 — 고시값이 아니라 **회사 정책**입니다. 연도별 기준값에 함께 두는
   * 이유는 계산 엔진이 받는 설정을 한 덩어리로 유지하기 위해서이고, 정책이
   * 바뀐 해부터 적용된다는 점도 자연스럽게 표현됩니다.
   */
  weeklyHoliday: WeeklyHolidayPolicy;
}

/**
 * 기본값.
 *
 * **주의** — 아래 숫자는 개편 전 코드에 "2026년 기준 추정"으로 들어 있던 값을
 * 그대로 옮긴 것입니다. 확정된 고시값이 아니므로, 운영 투입 전에 반드시
 * 국민연금공단·건강보험공단·고용노동부·국세청 고시로 대조해 주세요.
 * 대조가 끝나면 `note`를 근거로 바꿔 적어 두면 다음 담당자가 압니다.
 */
/**
 * 연도별 최저임금 고시액 (시간급).
 *
 * 최저임금위원회가 매년 8월에 고시하는 값입니다. 담당자가 직접 넣은 값과
 * 대조해 보여 주기 위한 것이고, 자동으로 덮어쓰지는 않습니다 — 회사가
 * 수습기간 감액 같은 이유로 다른 값을 두었을 수 있고, 여기 적힌 값이 최신
 * 고시와 어긋날 수도 있기 때문입니다. 어긋나면 화면에서 양쪽을 나란히
 * 보여 주고 담당자가 정합니다.
 */
export const STATUTORY_MINIMUM_WAGE: Record<number, number> = {
  2021: 8_720,
  2022: 9_160,
  2023: 9_620,
  2024: 9_860,
  2025: 10_030,
  2026: 10_320,
};

/** 월 환산액. 최저임금 고시와 같은 방식으로 209시간을 씁니다. */
export function monthlyMinimumWage(hourly: number, monthlyHours = 209): number {
  return Math.round(hourly * monthlyHours);
}

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
  // 고시값 대조 전입니다. 설정에서 해당 연도 값으로 반드시 바꾸세요.
  minimumHourlyWage: 10_320,

  weeklyHoliday: {
    // 기본값은 "월급에 포함, 시급직만 별도 산정"입니다. 국내 중소 제조업에서
    // 가장 흔한 형태이지만, 회사 규정을 확인해 반드시 다시 고르세요.
    method: 'calculated',
    applyTo: ['hourly', 'daily'],
    minWeeklyHours: 15,
    requireFullAttendance: true,
    prorateForPartTime: true,
    fixedMonthlyAmount: 0,
  },
};

/** 다음 해 기준값을 만들 때 쓰는 복사본. 숫자는 그대로, 연도와 메모만 바꿉니다. */
export function copyRateSetForYear(source: PayrollRateSet, year: number): PayrollRateSet {
  return {
    ...structuredClone(source),
    year,
    note: `${source.year}년 값을 복사했습니다. ${year}년 고시값으로 대조하세요.`,
    // 복사본은 대조된 값이 아닙니다. 이 표시를 지우지 않으면 작년 요율이
    // 확인된 값처럼 보입니다.
    verified: false,
    verifiedAt: null,
    verifiedBy: null,
  };
}
