/**
 * P7 검증 — 주민등록번호 암호화·마스킹, 감사로그.
 *
 * 주장을 확인으로 바꾸기 위한 것입니다. 통과 여부를 사람이 읽을 수 있게 찍고,
 * 하나라도 실패하면 종료 코드를 1로 냅니다.
 */
import '../lib/env';
import { eq, desc } from 'drizzle-orm';
import { db, schema } from '../../src/lib/db';
import {
  encryptSensitive, decryptSensitive, maskStored, maskResidentNumber,
  isEncrypted, isValidResidentNumber,
} from '../../src/lib/security/sensitive';

let pass = 0, fail = 0;
function check(name: string, ok: boolean, detail = '') {
  if (ok) { pass++; console.log(`  PASS  ${name}${detail ? ' — ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`); }
}

async function main() {
  console.log('\n== 1. 암호화 왕복 ==');
  const sample = '900101-1234567';
  const enc = encryptSensitive(sample)!;
  check('암호문에 평문이 남지 않음', !enc.includes('1234567') && !enc.includes('900101'));
  check('암호문으로 식별됨', isEncrypted(enc));
  check('복호화 결과가 원본과 같음', decryptSensitive(enc) === sample, decryptSensitive(enc) ?? '');
  const enc2 = encryptSensitive(sample)!;
  check('같은 값도 매번 다른 암호문 (난수 IV)', enc !== enc2);

  console.log('\n== 2. 변조 탐지 ==');
  // 형식은 enc.v1.<iv>.<tag>.<body> 입니다. 길이를 깨뜨리면 다른 이유로도
  // 실패하므로, 같은 길이를 유지한 채 한 글자만 바꿔 봅니다.
  const parts = enc.split('.');
  // 마지막 글자가 아니라 **첫 글자**를 바꿉니다. base64url 의 끝 글자는
  // 패딩 비트를 담고 있어, 그 자리를 바꿔도 디코딩된 바이트가 같을 수
  // 있습니다 — 그러면 복호화가 성공해 테스트가 엉뚱하게 실패합니다.
  const flip = (t: string) => (t[0] === 'A' ? 'B' : 'A') + t.slice(1);
  const swap = (i: number) =>
    parts.map((p, n) => (n === i ? flip(p) : p)).join('.');
  check('본문 한 글자를 바꾸면 복호화 실패', swap(4) !== enc && decryptSensitive(swap(4)) === null);
  check('인증 태그를 바꾸면 복호화 실패', swap(3) !== enc && decryptSensitive(swap(3)) === null);
  check('IV 를 바꾸면 복호화 실패', swap(2) !== enc && decryptSensitive(swap(2)) === null);

  console.log('\n== 3. 마스킹 ==');
  check('마스킹 형식', maskResidentNumber(sample) === '900101-1******', String(maskResidentNumber(sample)));
  check('마스킹에 뒤 6자리 없음', !String(maskResidentNumber(sample)).includes('234567'));
  check('암호문에서 바로 마스킹', maskStored(enc) === '900101-1******');
  check('빈 값은 null', maskStored(null) === null);

  console.log('\n== 4. 형식 검사 ==');
  check('정상 번호 통과', isValidResidentNumber('900101-1234567'));
  check('12자리 거부', !isValidResidentNumber('90010112345'));
  check('13월 거부', !isValidResidentNumber('901301-1234567'));
  check('2월 30일 거부', !isValidResidentNumber('900230-1234567'));

  console.log('\n== 5. 데이터베이스 저장 (실제 행) ==');
  const [target] = await db.select().from(schema.employees).limit(1);
  if (!target) { check('직원 존재', false); return finish(); }
  const original = target.residentNumber;

  await db.update(schema.employees)
    .set({ residentNumber: encryptSensitive(sample) })
    .where(eq(schema.employees.id, target.id));
  const [after] = await db.select().from(schema.employees).where(eq(schema.employees.id, target.id));
  const stored = String(after.residentNumber ?? '');
  check('DB 컬럼에 평문이 없음', !stored.includes('1234567'), stored.slice(0, 24) + '...');
  check('DB 값이 암호문', isEncrypted(stored));
  check('DB 값을 복호화하면 원본', decryptSensitive(stored) === sample);
  // 원상복구 — 검증이 자료를 남기지 않게 합니다.
  await db.update(schema.employees)
    .set({ residentNumber: original })
    .where(eq(schema.employees.id, target.id));
  const [restored] = await db.select().from(schema.employees).where(eq(schema.employees.id, target.id));
  check('검증 후 원상복구', (restored.residentNumber ?? null) === (original ?? null));

  console.log('\n== 6. 평문 잔존 점검 (전 직원) ==');
  const all = await db.select({ id: schema.employees.id, name: schema.employees.name, rn: schema.employees.residentNumber })
    .from(schema.employees);
  const plaintext = all.filter((r) => r.rn && !isEncrypted(r.rn));
  check('평문으로 남은 주민번호 없음', plaintext.length === 0,
    plaintext.length ? plaintext.map((r) => r.name).join(', ') : `${all.length}명 확인`);

  console.log('\n== 7. 감사로그 기록 ==');
  const before = await db.select().from(schema.auditLogs);
  const probe = `verify-probe-${before.length}`;
  await db.insert(schema.auditLogs).values({
    userId: 'verify', userName: 'verify', userRole: 'system',
    actionType: 'reveal', targetType: 'employee.resident_number',
    targetId: null, targetLabel: probe, details: { purpose: '검증' }, sessionId: 'verify',
  });
  const [latest] = await db
    .select().from(schema.auditLogs)
    .orderBy(desc(schema.auditLogs.timestamp)).limit(1);
  check('감사로그가 실제로 기록됨', latest?.targetLabel === probe);
  check('열람 기록에 사유가 남음', JSON.stringify(latest?.details ?? {}).includes('검증'));
  check('감사로그에 주민번호 값이 남지 않음', !JSON.stringify(latest ?? {}).includes('1234567'));
  await db.delete(schema.auditLogs).where(eq(schema.auditLogs.targetLabel, probe));
  const cleaned = await db.select().from(schema.auditLogs);
  check('검증 기록 정리됨', cleaned.length === before.length);

  finish();
}

function finish() {
  console.log(`\n결과: ${pass} 통과 · ${fail} 실패\n`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
