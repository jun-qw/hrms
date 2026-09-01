import { differenceInMonths, differenceInYears, eachDayOfInterval, isWeekend, format } from 'date-fns';

/**
 * 연차 자동계산 (근로기준법 제60조)
 * - 1년 미만: 월 1일 (최대 11일)
 * - 1년 이상: 15일
 * - 3년 이상: 매 2년마다 1일 추가 (최대 25일)
 */
export function calculateAnnualLeave(hireDate: Date, referenceDate: Date = new Date()): number {
  const totalMonths = differenceInMonths(referenceDate, hireDate);
  const totalYears = differenceInYears(referenceDate, hireDate);

  // 1년 미만
  if (totalYears < 1) {
    return Math.min(totalMonths, 11);
  }

  // 1년 이상
  let baseDays = 15;

  // 3년 이상: 매 2년마다 1일 추가
  if (totalYears >= 3) {
    const additionalDays = Math.floor((totalYears - 1) / 2);
    baseDays += additionalDays;
  }

  // 최대 25일
  return Math.min(baseDays, 25);
}

/**
 * 영업일 계산 (주말 + 공휴일 제외)
 */
export function calculateBusinessDays(start: Date, end: Date, holidays: string[]): number {
  if (start > end) return 0;
  const holidaySet = new Set(holidays);
  const days = eachDayOfInterval({ start, end });
  return days.filter((d) => !isWeekend(d) && !holidaySet.has(format(d, 'yyyy-MM-dd'))).length;
}
