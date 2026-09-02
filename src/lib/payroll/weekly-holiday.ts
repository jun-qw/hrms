/**
 * 주휴수당.
 *
 * 근로기준법 제55조(유급휴일)와 시행령 제30조(소정근로일 개근)를 따릅니다.
 * 주 소정근로시간이 15시간 미만이면 대상이 아닙니다(제18조 제3항).
 *
 * 지급 **방식**은 회사마다 달라 정책으로 받습니다. 규칙 자체는 여기 한 곳에만
 * 두어, 급여계산 화면과 계산 엔진이 서로 다른 답을 내지 않게 합니다.
 */
import type { PayMethod, PayrollRateSet, WeeklyHolidayPolicy } from './rate-set';

export interface WeekAttendance {
  /** 그 주의 시작일 (표시용) */
  startDate: string;
  /**
   * 그 주의 계약 근로일수 — 주말만 제외하고 공휴일은 그대로 셉니다.
   *
   * 비례계산과 15시간 판정의 기준입니다. 공휴일은 유급휴일이라 그 주의
   * 소정근로를 줄이지 않습니다. 여기에서 공휴일을 빼면 추석이 낀 주만
   * 주휴수당이 깎여, 쉬라고 준 날 때문에 임금이 줄어듭니다.
   */
  contractDays: number;
  /** 실제로 출근해야 했던 날 수 — 주말·공휴일 제외. 개근 판정에만 씁니다. */
  scheduledDays: number;
  /** 실제 근무로 인정된 날 수 */
  workedDays: number;
  /** 결근한 날 수. 개근 요건 판정에 씁니다. */
  absentDays: number;
}

export interface WeeklyHolidayResult {
  amount: number;
  /** 지급 대상이 된 주 수 */
  paidWeeks: number;
  /** 왜 그 금액인지 — 명세서와 툴팁에 그대로 씁니다. */
  formula: string;
  /** 대상에서 빠진 주와 사유 */
  skipped: { startDate: string; reason: string }[];
}

const won = (n: number) => Math.round(n).toLocaleString('ko-KR');

/** 이 급여방식이 주휴수당 별도 산정 대상인가. */
export function appliesTo(payMethod: PayMethod, policy: WeeklyHolidayPolicy): boolean {
  return policy.method !== 'included' && policy.applyTo.includes(payMethod);
}

/**
 * 한 사람의 한 달 주휴수당.
 *
 * `included`는 월급에 이미 들어 있다는 뜻이라 0원을 돌려줍니다 — 여기서 또
 * 더하면 이중지급입니다.
 */
export function computeWeeklyHoliday(
  weeks: WeekAttendance[],
  hourlyWage: number,
  payMethod: PayMethod,
  rates: PayrollRateSet,
): WeeklyHolidayResult {
  const policy = rates.weeklyHoliday;
  const none: WeeklyHolidayResult = { amount: 0, paidWeeks: 0, formula: '', skipped: [] };

  if (policy.method === 'included') {
    return {
      ...none,
      formula: '월 소정근로시간에 주휴시간이 포함되어 있어 별도로 지급하지 않습니다.',
    };
  }
  if (!policy.applyTo.includes(payMethod)) {
    return { ...none, formula: '이 급여방식은 주휴수당 별도 산정 대상이 아닙니다.' };
  }

  if (policy.method === 'fixed') {
    return {
      amount: policy.fixedMonthlyAmount,
      paidWeeks: weeks.length,
      formula: `월 정액 ${won(policy.fixedMonthlyAmount)}원`,
      skipped: [],
    };
  }

  // ── calculated ──────────────────────────────────────────────────────────
  const daily = rates.standardDailyHours;
  const skipped: WeeklyHolidayResult['skipped'] = [];
  /** 주마다 시간이 다를 수 있어(달 경계에 걸린 주, 단시간) 주별로 모읍니다. */
  const paid: { startDate: string; hours: number }[] = [];
  let amount = 0;

  for (const week of weeks) {
    const contractHours = week.contractDays * daily;

    if (contractHours < policy.minWeeklyHours) {
      skipped.push({
        startDate: week.startDate,
        reason: `주 소정근로 ${contractHours}시간 — ${policy.minWeeklyHours}시간 미만`,
      });
      continue;
    }
    if (policy.requireFullAttendance && week.absentDays > 0) {
      skipped.push({ startDate: week.startDate, reason: `결근 ${week.absentDays}일 — 개근 아님` });
      continue;
    }
    if (week.workedDays === 0) {
      // 주 전체가 공휴일이면 출근할 날이 없었던 것이라 개근으로 봅니다.
      if (week.scheduledDays > 0) {
        skipped.push({ startDate: week.startDate, reason: '근무 기록 없음' });
        continue;
      }
    }

    // 통상근로자는 8시간, 단시간 근로자는 주 소정근로시간에 비례합니다.
    const hours = policy.prorateForPartTime
      ? (Math.min(contractHours, 40) / 40) * daily
      : daily;
    amount += hourlyWage * hours;
    paid.push({ startDate: week.startDate, hours });
  }

  amount = Math.round(amount);
  return {
    amount,
    paidWeeks: paid.length,
    formula: describe(paid, hourlyWage, amount),
    skipped,
  };
}

/**
 * 계산식 문구.
 *
 * 주마다 시간이 같으면 한 줄로, 다르면 주별로 풀어 씁니다. 달 경계에 걸린 주나
 * 단시간 근로자는 주별 시간이 달라지는데, 그때 한 주의 시간을 전체에 곱한 것처럼
 * 적으면 금액과 설명이 어긋나 담당자가 직원에게 설명할 수 없습니다.
 */
function describe(
  paid: { startDate: string; hours: number }[],
  hourlyWage: number,
  amount: number,
): string {
  if (paid.length === 0) return '지급 대상 주가 없습니다.';

  const uniform = paid.every((p) => p.hours === paid[0].hours);
  if (uniform) {
    return `${won(hourlyWage)}(통상시급) × ${round1(paid[0].hours)}시간 × ${paid.length}주 = ${won(amount)}원`;
  }
  const parts = paid
    .map((p) => `${p.startDate.slice(5)} ${round1(p.hours)}h`)
    .join(' + ');
  const totalHours = paid.reduce((s, p) => s + p.hours, 0);
  return `${won(hourlyWage)}(통상시급) × (${parts} = ${round1(totalHours)}시간) = ${won(amount)}원`;
}

/**
 * 한 달을 주 단위로 쪼갭니다.
 *
 * 주의 시작은 월요일입니다. 달 경계에 걸친 주는 그 달에 포함된 날만 셉니다 —
 * 월별로 급여를 마감하므로 다음 달 날짜를 이번 달 주휴 판정에 넣을 수 없습니다.
 */
export function splitMonthIntoWeeks(
  year: number,
  month: number,
  isHoliday: (day: number) => boolean,
  dayStatus: (day: number) => { worked: boolean; absent: boolean },
): WeekAttendance[] {
  const daysInMonth = new Date(year, month, 0).getDate();
  const weeks: WeekAttendance[] = [];
  let current: WeekAttendance | null = null;

  for (let day = 1; day <= daysInMonth; day++) {
    const dow = new Date(year, month - 1, day).getDay();
    // 월요일이거나 달의 첫날이면 새 주를 엽니다.
    if (dow === 1 || current === null) {
      current = {
        startDate: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        contractDays: 0,
        scheduledDays: 0,
        workedDays: 0,
        absentDays: 0,
      };
      weeks.push(current);
    }
    if (dow === 0 || dow === 6) continue;

    current.contractDays += 1;
    if (isHoliday(day)) continue;

    current.scheduledDays += 1;
    const status = dayStatus(day);
    if (status.worked) current.workedDays += 1;
    if (status.absent) current.absentDays += 1;
  }

  return weeks;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
