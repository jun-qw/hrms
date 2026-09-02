/**
 * 검증 — 휴대폰 번호 정규화와 형식 판정.
 *
 * 이 스위트를 만든 이유가 있습니다. 사원 등록 화면의 정규식이 편집 사고로
 * `\d` → `d`, `\D` → `D` 로 깨져 있었습니다. 그 상태에서는 **어떤 번호를
 * 넣어도 "형식이 아닙니다" 가 떴고**, 서버의 중복 검사도 하이픈 표기가 다르면
 * 같은 번호를 다른 번호로 봤습니다.
 *
 * 타입 검사로는 잡히지 않습니다 — `/d{7,8}/` 도 문법상 멀쩡한 정규식이라
 * 컴파일이 통과합니다. 그래서 값으로 확인합니다.
 */
import { isMobileNumber, normalizePhone } from '../../src/lib/attendance/import-parse';

let pass = 0, fail = 0;
const check = (name: string, ok: boolean, detail = '') => {
  if (ok) { pass++; console.log(`  PASS  ${name}${detail ? ' — ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`); }
};

function main() {
  console.log('\n== 1. 정규화 ==');
  const same = [
    '010-8474-9001',
    '01084749001',
    '010 8474 9001',
    '+82-10-8474-9001',
    '+82 10 8474 9001',
    '(010) 8474-9001',
  ];
  const target = '01084749001';
  for (const raw of same) {
    check(`"${raw}" → ${target}`, normalizePhone(raw) === target, normalizePhone(raw));
  }
  check('빈 값은 빈 문자열', normalizePhone(null) === '' && normalizePhone('') === '');

  console.log('\n== 2. 형식 판정 — 통과해야 하는 것 ==');
  // 실제로 담당자가 넣는 표기들입니다. 하나라도 막히면 등록을 못 합니다.
  for (const ok of [
    '010-8474-9001', '01084749001', '010 8474 9001', '+82-10-8474-9001',
    '011-234-5678', '016-1234-5678', '017-123-4567', '018-1234-5678', '019-123-4567',
  ]) {
    check(`"${ok}" 통과`, isMobileNumber(ok));
  }

  console.log('\n== 3. 형식 판정 — 막아야 하는 것 ==');
  for (const bad of [
    ['빈 값', ''],
    ['null', null],
    ['자릿수 부족', '010-123-456'],
    ['자릿수 초과', '010-1234-56789'],
    ['유선번호', '02-123-4567'],
    ['없는 국번', '012-1234-5678'],
    ['숫자 없음', '전화없음'],
    ['마스킹 문자', '010-****-9001'],
  ] as [string, string | null][]) {
    check(`${bad[0]} 거부`, !isMobileNumber(bad[1]), String(bad[1]));
  }

  console.log('\n== 4. 중복 판정 ==');
  // 서버의 중복 검사가 쓰는 것과 같은 함수여야 합니다. 표기만 다른 같은
  // 번호가 중복으로 걸리지 않으면, 두 사람의 근태가 뒤섞입니다.
  check('표기가 달라도 같은 번호로 봄',
    normalizePhone('010-8474-9001') === normalizePhone('+82 10 8474 9001'));
  check('다른 번호는 다르게 봄',
    normalizePhone('010-8474-9001') !== normalizePhone('010-8474-9002'));

  console.log(`\n결과: ${pass} 통과 · ${fail} 실패\n`);
  process.exit(fail === 0 ? 0 : 1);
}

main();
