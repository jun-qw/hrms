/**
 * 검증 — 연도별 4대보험 요율 · 최저임금.
 *
 * 확인하려는 것은 "연도별로 저장된다"가 아니라 **"그 해 급여가 그 해 요율로
 * 계산된다"** 입니다. 저장만 연도별이고 계산이 올해 값을 쓰면 소급 재계산이
 * 전부 틀립니다.
 */
import '../lib/env';
import { eq } from 'drizzle-orm';
import { db, schema } from '../../src/lib/db';
import {
  DEFAULT_RATE_SET, STATUTORY_MINIMUM_WAGE, STATUTORY_RATES, monthlyMinimumWage,
  copyRateSetForYear, type PayrollRateSet,
} from '../../src/lib/payroll/rate-set';
import { computePayroll } from '../../src/lib/payroll/engine';

let pass = 0, fail = 0;
const check = (name: string, ok: boolean, detail = '') => {
  if (ok) { pass++; console.log(`  PASS  ${name}${detail ? ' — ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`); }
};

/** 저장된 그 해 값을 그대로 읽어옵니다 (서버 액션은 세션이 필요해 직접 조회). */
async function loadYear(year: number): Promise<PayrollRateSet | null> {
  const [row] = await db.select().from(schema.payrollRateSets)
    .where(eq(schema.payrollRateSets.year, year));
  return row ? (row.rates as PayrollRateSet) : null;
}

/** 같은 급여를 다른 해 요율로 계산했을 때 공제액. */
function deductionsUnder(rates: PayrollRateSet): number {
  return computePayroll({
    employeeId: 'e-test', name: '검증', payMethod: 'monthly',
    baseAmount: 3_000_000, dependents: 1,
    allowances: [], deductions: [],
    attendance: { scheduledDays: 22, workedDays: 22, overtimeHours: 0, nightHours: 0, holidayHours: 0 },
    joinedMidMonth: null, leftMidMonth: null,
  }, rates).totalDeductions;
}

async function main() {
  console.log('\n== 1. 연도별 저장 ==');
  const stored = await db.select().from(schema.payrollRateSets);
  const years = stored.map((r) => r.year).sort();
  check('여러 연도가 등록됨', years.length >= 2, years.join(', '));
  check('연도가 고유함', new Set(years).size === years.length);

  console.log('\n== 2. 최저임금 고시액 ==');
  for (const year of years) {
    const set = await loadYear(year);
    const statutory = STATUTORY_MINIMUM_WAGE[year];
    if (statutory === undefined) { console.log(`  건너뜀 ${year} — 고시액 미등록`); continue; }
    check(`${year}년 최저임금이 고시액과 일치`,
      Number(set?.minimumHourlyWage) === statutory,
      `저장 ${set?.minimumHourlyWage} / 고시 ${statutory}`);
  }
  check('연도마다 최저임금이 다름',
    new Set(years.map((y) => STATUTORY_MINIMUM_WAGE[y]).filter(Boolean)).size > 1);
  check('월 환산 = 시급 × 209',
    monthlyMinimumWage(10_320) === 10_320 * 209,
    monthlyMinimumWage(10_320).toLocaleString() + '원');

  console.log('\n== 3. 연도를 바꾸면 계산이 바뀐다 ==');
  // 두 해의 건강보험 요율을 일부러 다르게 두고, 같은 급여의 공제액이
  // 달라지는지 봅니다. 저장만 연도별이고 계산이 한 해 값을 쓰면 여기서 걸립니다.
  const probeA: PayrollRateSet = { ...DEFAULT_RATE_SET, year: 2400,
    healthInsurance: { rate: 0.03 } };
  const probeB: PayrollRateSet = { ...DEFAULT_RATE_SET, year: 2401,
    healthInsurance: { rate: 0.05 } };
  const dA = deductionsUnder(probeA), dB = deductionsUnder(probeB);
  check('요율이 다르면 공제액이 다름', dA !== dB,
    `3.0% → ${dA.toLocaleString()}원 / 5.0% → ${dB.toLocaleString()}원`);
  check('높은 요율이 더 많이 공제됨', dB > dA);

  console.log('\n== 4. 실제 저장값으로 연도 비교 ==');
  if (years.length >= 2) {
    const [oldest, newest] = [years[0], years[years.length - 1]];
    const a = await loadYear(oldest), b = await loadYear(newest);
    if (a && b) {
      const da = deductionsUnder(a), dbb = deductionsUnder(b);
      console.log(`  ${oldest}년 공제 ${da.toLocaleString()}원 / ${newest}년 공제 ${dbb.toLocaleString()}원`);
      check('두 해 모두 계산이 성립', da > 0 && dbb > 0);
      check(`${oldest}년 최저임금 < ${newest}년 최저임금`,
        Number(a.minimumHourlyWage) < Number(b.minimumHourlyWage),
        `${a.minimumHourlyWage} → ${b.minimumHourlyWage}`);
    }
  }

  console.log('\n== 5. 새해 복사 ==');
  const source = (await loadYear(years[years.length - 1]))!;
  const copied = copyRateSetForYear({ ...source, verified: true, verifiedAt: '2026-01-01' }, 2099);
  check('연도가 새 해로 바뀜', copied.year === 2099);
  check('요율은 그대로 복사됨',
    copied.healthInsurance.rate === source.healthInsurance.rate);
  check('복사본은 대조 표시가 지워짐',
    copied.verified === false && !copied.verifiedAt,
    '복사본이 확인된 값처럼 보이면 작년 요율로 급여가 나갑니다');

  console.log('\n== 6. 미등록 연도 처리 ==');
  const missing = await loadYear(2099);
  check('등록하지 않은 해는 비어 있음', missing === null);


  console.log('\n== 7. 고시값 전면 대조 ==');
  for (const year of years) {
    const set = await loadYear(year);
    const official = STATUTORY_RATES[year];
    if (!set || !official) { console.log(`  건너뜀 ${year} — 고시값 미등록`); continue; }
    const rows: [string, number, number][] = [
      ['국민연금', set.nationalPension.rate, official.nationalPension],
      ['건강보험', set.healthInsurance.rate, official.healthInsurance],
      ['장기요양', set.longTermCare.rate, official.longTermCare],
      ['고용보험', set.employmentInsurance.rate, official.employmentInsurance],
      ['최저임금', set.minimumHourlyWage, official.minimumHourlyWage],
      ['기준소득 상한', set.nationalPension.maxBase, official.pensionMaxBase],
      ['기준소득 하한', set.nationalPension.minBase, official.pensionMinBase],
    ];
    for (const [label, mine, want] of rows) {
      check(`${year} ${label}`, Number(mine) === Number(want),
        Number(mine) === Number(want) ? String(want) : `저장 ${mine} / 고시 ${want}`);
    }
  }

  console.log('\n== 8. 고시값 자체의 앞뒤 ==');
  // 표에 오타가 들어가면 전 직원의 공제액이 틀어집니다. 상식적인 범위와
  // 연도별 방향만이라도 확인합니다.
  const ys = Object.keys(STATUTORY_RATES).map(Number).sort();
  for (const y of ys) {
    const r = STATUTORY_RATES[y];
    check(`${y} 요율이 상식적인 범위`,
      r.nationalPension > 0.03 && r.nationalPension < 0.08 &&
      r.healthInsurance > 0.02 && r.healthInsurance < 0.06 &&
      r.longTermCare > 0.1 && r.longTermCare < 0.2 &&
      r.employmentInsurance > 0.005 && r.employmentInsurance < 0.02);
  }
  for (let i = 1; i < ys.length; i++) {
    const prev = STATUTORY_RATES[ys[i - 1]], cur = STATUTORY_RATES[ys[i]];
    check(`${ys[i]} 최저임금이 전년 이상`, cur.minimumHourlyWage >= prev.minimumHourlyWage);
    check(`${ys[i]} 기준소득 상한이 전년 이상`, cur.pensionMaxBase >= prev.pensionMaxBase);
  }


  console.log(`
== 9. 기본값과 고시표가 어긋나지 않는가 ==`);
  // 두 곳에 같은 숫자를 적어 두면 한쪽만 고치는 일이 반드시 생깁니다.
  const d = DEFAULT_RATE_SET, o = STATUTORY_RATES[d.year];
  if (o) {
    check('기본값 국민연금 = 고시값', d.nationalPension.rate === o.nationalPension);
    check('기본값 건강보험 = 고시값', d.healthInsurance.rate === o.healthInsurance);
    check('기본값 장기요양 = 고시값', d.longTermCare.rate === o.longTermCare);
    check('기본값 고용보험 = 고시값', d.employmentInsurance.rate === o.employmentInsurance);
    check('기본값 최저임금 = 고시값', d.minimumHourlyWage === o.minimumHourlyWage);
    check('기본값 기준소득 상한 = 고시값', d.nationalPension.maxBase === o.pensionMaxBase);
    check('기본값 기준소득 하한 = 고시값', d.nationalPension.minBase === o.pensionMinBase);
  }

  console.log(`\n결과: ${pass} 통과 · ${fail} 실패\n`);
  process.exit(fail === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
