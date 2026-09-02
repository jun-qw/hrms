/**
 * P7 검증 — 자료 무결성 대사.
 *
 * 납품에서 실패는 대부분 기능이 아니라 이행에서 납니다. 건수와 합계를 맞춰
 * 보고, 있어야 할 것이 없는 경우를 찾습니다.
 *
 * 실제로 이 대사가 없어서 `employee_assignments` 가 통째로 비어 있는 것을
 * 한참 뒤에야 발견했습니다 — 시드가 표를 지우기만 하고 다시 만들지 않았는데,
 * 화면에서는 부서가 `employees` 사본에서 나와 멀쩡해 보였습니다.
 */
import '../lib/env';
import { db, schema } from '../../src/lib/db';
import { isEncrypted } from '../../src/lib/security/sensitive';

let pass = 0, fail = 0, warn = 0;
const check = (name: string, ok: boolean, detail = '') => {
  if (ok) { pass++; console.log(`  PASS  ${name}${detail ? ' — ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`); }
};
const note = (name: string, detail: string) => { warn++; console.log(`  주의  ${name} — ${detail}`); };

const digits = (v: unknown) => String(v ?? '').replace(/\D/g, '');

async function main() {
  const [emps, assigns, salaries, atts, balances] = await Promise.all([
    db.select().from(schema.employees),
    db.select().from(schema.employeeAssignments),
    db.select().from(schema.employeeSalaries),
    db.select().from(schema.attendances),
    db.select().from(schema.leaveBalances),
  ]);
  const active = emps.filter((e) => e.status !== 'resigned');

  console.log(`\n== 건수 대사 (재직 ${active.length}명 / 전체 ${emps.length}명) ==`);

  // ── 소속 이력 ────────────────────────────────────────────────────────
  const assignByEmp = new Map<string, typeof assigns>();
  for (const a of assigns) assignByEmp.set(a.employeeId, [...(assignByEmp.get(a.employeeId) ?? []), a]);
  check('모든 직원에게 소속 이력이 있음',
    emps.every((e) => (assignByEmp.get(e.id)?.length ?? 0) > 0),
    `${assignByEmp.size}/${emps.length}명`);
  check('직원마다 열린 소속 구간이 정확히 하나',
    emps.every((e) => (assignByEmp.get(e.id) ?? []).filter((a) => a.effectiveTo === null).length === 1));

  // ── 급여 이력 ────────────────────────────────────────────────────────
  const salByEmp = new Map<string, typeof salaries>();
  for (const s of salaries) salByEmp.set(s.employeeId, [...(salByEmp.get(s.employeeId) ?? []), s]);
  check('모든 재직자에게 급여 이력이 있음',
    active.every((e) => (salByEmp.get(e.id)?.length ?? 0) > 0));
  check('직원마다 열린 급여 구간이 정확히 하나',
    active.every((e) => (salByEmp.get(e.id) ?? []).filter((s) => s.effectiveTo === null).length === 1));

  const overlaps: string[] = [];
  for (const [empId, list] of salByEmp) {
    const sorted = [...list].sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
    for (let i = 0; i < sorted.length - 1; i++) {
      if (!sorted[i].effectiveTo || sorted[i].effectiveTo! >= sorted[i + 1].effectiveFrom) {
        overlaps.push(emps.find((e) => e.id === empId)?.name ?? empId);
      }
    }
  }
  check('급여 구간이 겹치지 않음', overlaps.length === 0, overlaps.join(', '));

  console.log('\n== 필수값 ==');
  const noSalary = active.filter((e) => !Number(e.baseSalary) && !Number(e.hourlyWage));
  check('급여 기준액 0원인 재직자 없음', noSalary.length === 0, noSalary.map((e) => e.name).join(', '));

  const noPhone = active.filter((e) => !digits(e.phone));
  if (noPhone.length) note('휴대폰 미등록', `${noPhone.length}명 — ${noPhone.map((e) => e.name).join(', ')} (근태가 붙지 않습니다)`);
  else check('전원 휴대폰 등록됨', true);

  const phoneMap = new Map<string, string[]>();
  for (const e of active) {
    const k = digits(e.phone);
    if (k) phoneMap.set(k, [...(phoneMap.get(k) ?? []), e.name]);
  }
  const dupPhone = [...phoneMap].filter(([, v]) => v.length > 1);
  check('휴대폰 번호 중복 없음', dupPhone.length === 0,
    dupPhone.map(([k, v]) => `${k}=${v.join('/')}`).join(' '));

  const noNumber = active.filter((e) => !e.employeeNumber || e.employeeNumber.startsWith('미채번'));
  if (noNumber.length) note('사번 미채번', noNumber.map((e) => e.name).join(', '));

  console.log('\n== 개인정보 ==');
  const plain = emps.filter((e) => e.residentNumber && !isEncrypted(e.residentNumber));
  check('평문 주민등록번호 없음', plain.length === 0, plain.map((e) => e.name).join(', '));

  console.log('\n== 근태 ==');
  const attByEmp = new Set(atts.map((a) => a.employeeId));
  const noAtt = active.filter((e) => !attByEmp.has(e.id));
  const hourly = active.filter((e) => e.payMethod === 'hourly' || e.payMethod === 'daily');
  const hourlyNoAtt = hourly.filter((e) => !attByEmp.has(e.id));
  check('시급·일급직 전원 근태 있음', hourlyNoAtt.length === 0,
    hourlyNoAtt.length ? hourlyNoAtt.map((e) => e.name).join(', ') : `${hourly.length}명 확인`);
  if (noAtt.length) note('근태 기록 없는 재직자', `${noAtt.length}명 — ${noAtt.map((e) => e.name).join(', ')}`);

  const badHours = atts.filter((a) => Number(a.workHours ?? 0) < 0 || Number(a.workHours ?? 0) > 24);
  check('근로시간이 0~24 범위', badHours.length === 0, `${atts.length}건 확인`);

  const dateKey = new Set<string>();
  const dupAtt = atts.filter((a) => {
    const k = `${a.employeeId}|${a.date}`;
    if (dateKey.has(k)) return true;
    dateKey.add(k); return false;
  });
  check('같은 사람 같은 날 근태 중복 없음', dupAtt.length === 0, String(dupAtt.length));

  console.log('\n== 연차 ==');
  check('모든 재직자에게 연차 잔액이 있음',
    active.every((e) => balances.some((b) => b.employeeId === e.id)));
  const negative = balances.filter((b) => Number(b.remainingDays) < 0);
  if (negative.length) note('잔여 연차 음수', `${negative.length}건 (초과 사용)`);

  console.log('\n== 금액 합계 ==');
  const monthlyTotal = active.reduce(
    (s, e) => s + (Number(e.baseSalary) || Number(e.hourlyWage) * 209), 0);
  console.log(`  월 기본급 합계(시급직 209h 환산): ${Math.round(monthlyTotal).toLocaleString()}원`);
  console.log(`  근태 기록: ${atts.length.toLocaleString()}건`);
  console.log(`  실근로시간 합계: ${atts.reduce((s, a) => s + Number(a.workHours ?? 0), 0).toLocaleString()}시간`);

  console.log(`\n결과: ${pass} 통과 · ${fail} 실패 · ${warn} 주의\n`);
  process.exit(fail === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
