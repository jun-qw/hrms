/**
 * 근태대장 셀에 적는 값.
 *
 * 종이 근태대장이 오래 써 온 방식을 그대로 씁니다 — 한 칸에 한 글자를 적고,
 * 글자가 곧 그날의 근태입니다. 담당자가 이미 아는 표기라 배울 것이 없고,
 * 숫자를 적으면 그 자체가 실근로시간이 됩니다.
 *
 * 코드 체계는 구 ERP의 `HU033 근태코드`에서 자주 쓰이는 것만 추렸습니다.
 */

export interface AttendanceCode {
  /** 셀에 적는 글자 */
  key: string;
  label: string;
  /** 이 코드가 뜻하는 근로시간. null이면 숫자를 직접 적어야 합니다. */
  hours: number | null;
  /** 근무일수에 포함되는가 */
  countsAsWorkday: boolean;
  /** 연차 잔액에서 차감되는가 */
  deductsLeave: number;
  /** 화면 표시 색 */
  tone: 'normal' | 'leave' | 'absent' | 'trip' | 'off';
}

export const ATTENDANCE_CODES: readonly AttendanceCode[] = [
  { key: '○', label: '정상근무', hours: 8, countsAsWorkday: true, deductsLeave: 0, tone: 'normal' },
  { key: '지', label: '지각', hours: 8, countsAsWorkday: true, deductsLeave: 0, tone: 'normal' },
  { key: '조', label: '조퇴', hours: 4, countsAsWorkday: true, deductsLeave: 0, tone: 'normal' },
  { key: '외', label: '외출', hours: 6, countsAsWorkday: true, deductsLeave: 0, tone: 'normal' },
  { key: '출', label: '출장', hours: 8, countsAsWorkday: true, deductsLeave: 0, tone: 'trip' },
  { key: '교', label: '교육', hours: 8, countsAsWorkday: true, deductsLeave: 0, tone: 'trip' },
  { key: '연', label: '연차', hours: 0, countsAsWorkday: false, deductsLeave: 1, tone: 'leave' },
  { key: '반', label: '반차', hours: 4, countsAsWorkday: true, deductsLeave: 0.5, tone: 'leave' },
  { key: '병', label: '병가', hours: 0, countsAsWorkday: false, deductsLeave: 0, tone: 'leave' },
  { key: '경', label: '경조', hours: 0, countsAsWorkday: false, deductsLeave: 0, tone: 'leave' },
  { key: '공', label: '공가', hours: 0, countsAsWorkday: false, deductsLeave: 0, tone: 'leave' },
  { key: '결', label: '결근', hours: 0, countsAsWorkday: false, deductsLeave: 0, tone: 'absent' },
  { key: '휴', label: '휴일', hours: 0, countsAsWorkday: false, deductsLeave: 0, tone: 'off' },
];

const BY_KEY = new Map(ATTENDANCE_CODES.map((c) => [c.key, c]));

/** 라벨 첫 글자나 전체 이름으로도 찾습니다 — 붙여넣기 대응. */
const ALIASES = new Map<string, string>([
  ['정상', '○'],
  ['정상근무', '○'],
  ['O', '○'],
  ['o', '○'],
  ['0', '○'],
  ...ATTENDANCE_CODES.map((c) => [c.label, c.key] as [string, string]),
]);

export interface CellValue {
  /** 코드로 적었을 때 */
  code?: AttendanceCode;
  /** 숫자로 적었을 때의 실근로시간 */
  hours?: number;
}

/**
 * 셀에 적힌 글자를 해석합니다.
 *
 * 빈 칸은 "아직 입력하지 않음"이지 "0시간"이 아닙니다. 둘을 같게 보면 입력이
 * 덜 된 달이 정상 마감되어 급여가 0으로 나갑니다.
 */
export function parseCell(input: string): { ok: true; value: CellValue | null } | { ok: false; error: string } {
  const v = input.trim();
  if (v === '') return { ok: true, value: null };

  const code = BY_KEY.get(v) ?? BY_KEY.get(ALIASES.get(v) ?? '');
  if (code) return { ok: true, value: { code } };

  if (/^\d+(\.\d+)?$/.test(v)) {
    const hours = Number(v);
    if (hours > 24) return { ok: false, error: '하루 근로시간이 24시간을 넘을 수 없습니다.' };
    return { ok: true, value: { hours } };
  }

  return {
    ok: false,
    error: `'${v}'은(는) 근태코드가 아닙니다. ${ATTENDANCE_CODES.map((c) => `${c.key}=${c.label}`).join(' · ')} 또는 시간(숫자)을 적으세요.`,
  };
}

/** 셀 값에서 그날의 실근로시간. */
export function hoursOf(value: CellValue | null): number {
  if (!value) return 0;
  if (value.hours !== undefined) return value.hours;
  return value.code?.hours ?? 0;
}

export function displayOf(value: CellValue | null): string {
  if (!value) return '';
  if (value.hours !== undefined) return String(value.hours);
  return value.code?.key ?? '';
}

export function codeByKey(key: string): AttendanceCode | undefined {
  return BY_KEY.get(key);
}
