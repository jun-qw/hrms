/**
 * 근태 자료 붙여넣기 해석.
 *
 * 근태기록에는 사원번호가 없고 **휴대폰 번호가 필수 항목**입니다. 그래서 직원을
 * 찾는 열쇠는 휴대폰 번호 하나뿐입니다. 번호 표기는 자료를 뽑는 기계마다
 * 제각각이라(010-1234-5678 / 01012345678 / +82 10 1234 5678) 숫자만 남긴
 * 형태로 맞춰 놓고 대조합니다.
 *
 * 열 순서도 기계마다 다릅니다. 순서를 정해 놓고 그대로 넣으라고 하면 담당자가
 * 엑셀에서 열을 옮기다 틀립니다. 머리글 이름을 보고 열을 찾습니다.
 */

export type ImportField =
  | 'phone'
  | 'name'
  | 'date'
  | 'clockIn'
  | 'clockOut'
  | 'workHours'
  | 'overtimeHours'
  | 'status'
  | 'note';

/** 머리글에 이 말이 들어 있으면 그 열로 봅니다. 긴 것부터 맞춰 봅니다. */
const HEADER_HINTS: [ImportField, string[]][] = [
  ['overtimeHours', ['연장근로', '초과근무', '연장시간', '연장', '초과', 'overtime', 'ot']],
  ['workHours', ['실근로시간', '근무시간', '근로시간', '실근로', '총시간', 'workhours', 'hours']],
  ['clockIn', ['출근시각', '출근시간', '출근', '시업', '시작', 'clockin', 'checkin', 'in']],
  ['clockOut', ['퇴근시각', '퇴근시간', '퇴근', '종업', '종료', 'clockout', 'checkout', 'out']],
  ['phone', ['휴대폰', '핸드폰', '휴대전화', '전화번호', '연락처', '전화', 'phone', 'mobile', 'tel']],
  ['date', ['근무일자', '근무일', '일자', '날짜', 'date', 'day']],
  ['status', ['근태구분', '근태', '구분', '상태', 'status', 'type']],
  ['name', ['성명', '이름', '사원명', 'name']],
  ['note', ['비고', '메모', '적요', 'note', 'memo', 'remark']],
];

/** 한글 근태 표기를 시스템 상태값으로. */
const STATUS_WORDS: [string, string][] = [
  ['정상', 'normal'], ['출근', 'normal'], ['근무', 'normal'],
  ['지각', 'late'],
  ['조퇴', 'early_leave'],
  ['결근', 'absent'], ['무단', 'absent'],
  ['반차', 'half_day'], ['반휴', 'half_day'],
  ['반반차', 'quarter_day'],
  ['연차', 'leave'], ['휴가', 'leave'], ['병가', 'leave'], ['경조', 'leave'], ['공가', 'leave'],
  ['휴일', 'holiday'], ['특근', 'holiday'], ['휴무', 'holiday'],
];

/** 숫자만 남긴 휴대폰 번호. 국가번호 82는 0으로 되돌립니다. */
export function normalizePhone(raw: string | null | undefined): string {
  let d = String(raw ?? '').replace(/\D/g, '');
  if (d.startsWith('82')) d = `0${d.slice(2)}`;
  return d;
}

export interface ParsedSheet {
  headers: string[];
  /** 머리글에서 찾아낸 열 위치. 못 찾으면 없습니다. */
  mapping: Partial<Record<ImportField, number>>;
  rows: string[][];
  /** 머리글 줄이 있었는가 */
  hasHeader: boolean;
}

/** 붙여넣은 표를 셀 배열로. 따옴표로 감싼 셀과 줄바꿈을 처리합니다. */
export function splitSheet(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; } else quoted = false;
      } else cell += c;
      continue;
    }
    if (c === '"' && cell === '') { quoted = true; continue; }
    if (c === '\t') { row.push(cell); cell = ''; continue; }
    if (c === '\r') continue;
    if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; continue; }
    cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

function matchHeader(cell: string): ImportField | null {
  const t = cell.toLowerCase().replace(/[\s_()[\]/-]/g, '');
  if (!t) return null;
  for (const [field, words] of HEADER_HINTS) {
    if (words.some((w) => t.includes(w))) return field;
  }
  return null;
}

/**
 * 표를 읽어 열 위치를 찾습니다.
 *
 * 머리글이 없는 자료도 들어옵니다. 그때는 첫 줄 내용을 보고 짐작합니다 —
 * 휴대폰처럼 생긴 열과 날짜처럼 생긴 열만 찾으면 나머지는 화면에서 지정합니다.
 */
export function parseSheet(text: string): ParsedSheet {
  const all = splitSheet(text);
  if (all.length === 0) return { headers: [], mapping: {}, rows: [], hasHeader: false };

  const first = all[0];
  const byHeader: Partial<Record<ImportField, number>> = {};
  let found = 0;
  first.forEach((cell, i) => {
    const f = matchHeader(cell);
    if (f && byHeader[f] === undefined) { byHeader[f] = i; found++; }
  });

  // 머리글로 인정하려면 휴대폰과 날짜는 있어야 합니다. 그 둘이 없으면
  // 첫 줄도 자료로 보고 내용에서 찾습니다.
  const hasHeader = found >= 2 && byHeader.phone !== undefined && byHeader.date !== undefined;
  if (hasHeader) {
    return { headers: first, mapping: byHeader, rows: all.slice(1), hasHeader: true };
  }

  const guess: Partial<Record<ImportField, number>> = {};
  first.forEach((cell, i) => {
    const t = cell.trim();
    if (guess.phone === undefined && /^\+?[\d\s().-]{9,}$/.test(t) && normalizePhone(t).length >= 10) {
      guess.phone = i;
    } else if (guess.date === undefined && parseDate(t)) {
      guess.date = i;
    }
  });
  return { headers: first.map((_, i) => `${i + 1}열`), mapping: guess, rows: all, hasHeader: false };
}

/** 2026-09-01 / 2026.9.1 / 20260901 / 9/1 모두 받습니다. */
export function parseDate(raw: string, fallbackYear?: number): string | null {
  const t = String(raw ?? '').trim();
  if (!t) return null;

  let y: number | undefined, m: number | undefined, d: number | undefined;
  let mt = t.match(/^(\d{4})\D(\d{1,2})\D(\d{1,2})/);
  if (mt) { y = +mt[1]; m = +mt[2]; d = +mt[3]; }
  if (!mt && (mt = t.match(/^(\d{4})(\d{2})(\d{2})$/))) { y = +mt[1]; m = +mt[2]; d = +mt[3]; }
  if (!mt && (mt = t.match(/^(\d{1,2})\D(\d{1,2})$/)) && fallbackYear) {
    y = fallbackYear; m = +mt[1]; d = +mt[2];
  }
  if (!y || !m || !d) return null;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  // 2월 30일 같은 값을 걸러냅니다.
  const probe = new Date(y, m - 1, d);
  if (probe.getMonth() !== m - 1 || probe.getDate() !== d) return null;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${y}-${p(m)}-${p(d)}`;
}

/** 08:30 / 0830 / 8.5 를 분 단위로. */
export function parseClock(raw: string): number | null {
  const t = String(raw ?? '').trim();
  if (!t) return null;
  let mt = t.match(/^(\d{1,2})\s*[:시]\s*(\d{1,2})/);
  if (mt) return +mt[1] * 60 + +mt[2];
  if ((mt = t.match(/^(\d{2})(\d{2})$/))) return +mt[1] * 60 + +mt[2];
  if ((mt = t.match(/^(\d{1,2})$/))) return +mt[1] * 60;
  return null;
}

export function parseHours(raw: string): number | null {
  const t = String(raw ?? '').trim().replace(/시간?$/, '');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 && n <= 24 ? n : null;
}

export function parseStatus(raw: string): string | null {
  const t = String(raw ?? '').trim();
  if (!t) return null;
  for (const [word, status] of STATUS_WORDS) if (t.includes(word)) return status;
  return null;
}
