/**
 * P7 검증 — 성능 실측.
 *
 * 목표치는 계획서에 적힌 것을 그대로 씁니다.
 *   급여 300명 일괄 계산 30초 이내
 *   그리드 1만 행
 *   대장 엑셀 출력
 *
 * 여기서는 서버에서 도는 부분(계산 엔진, 엑셀 생성, 질의)을 잽니다.
 * 화면 스크롤 성능은 브라우저에서 따로 잽니다.
 */
import '../lib/env';
import { db, schema } from '../../src/lib/db';
import { computePayroll } from '../../src/lib/payroll/engine';
import { DEFAULT_RATE_SET } from '../../src/lib/payroll/rate-set';
import { splitMonthIntoWeeks, computeWeeklyHoliday } from '../../src/lib/payroll/weekly-holiday';

const ms = (n: number) => `${Math.round(n)}ms`;
let fail = 0;
function budget(name: string, took: number, limitMs: number) {
  const ok = took <= limitMs;
  if (!ok) fail++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name} — ${ms(took)} (기준 ${ms(limitMs)})`);
}

async function main() {
  console.log('\n== 1. 급여 계산 엔진 ==');
  const rates = DEFAULT_RATE_SET;
  const weeks = splitMonthIntoWeeks(2026, 9, () => false, () => ({ worked: true, absent: false }));

  for (const n of [115, 300, 1000]) {
    const t0 = performance.now();
    for (let i = 0; i < n; i++) {
      const hourly = i % 3 === 0;
      const wh = computeWeeklyHoliday(weeks, 12_500, hourly ? 'hourly' : 'monthly', rates);
      computePayroll(
        {
          employeeId: `e-${i}`,
          name: `직원${i}`,
          payMethod: hourly ? 'hourly' : 'monthly',
          baseAmount: hourly ? 12_500 : 3_000_000,
          dependents: 1,
          allowances: [
            { code: 'meal', name: '식대', amount: 200_000, taxable: false },
            { code: 'transport', name: '교통비', amount: 200_000, taxable: false },
            ...(wh.amount > 0
              ? [{ code: 'weekly', name: '주휴수당', amount: wh.amount, taxable: true }]
              : []),
          ],
          deductions: [],
          attendance: {
            scheduledDays: 22, workedDays: 22,
            overtimeHours: 8, nightHours: 0, holidayHours: 0,
            workedHours: 176, weeks,
          },
          joinedMidMonth: null,
          leftMidMonth: null,
        },
        rates,
      );
    }
    const took = performance.now() - t0;
    // 300명 30초가 목표지만 순수 계산은 그보다 훨씬 빨라야 정상입니다.
    budget(`${n}명 계산`, took, n === 1000 ? 3000 : 1000);
  }

  console.log('\n== 2. 데이터베이스 질의 ==');
  const q = async (name: string, fn: () => Promise<unknown[]>, limit: number) => {
    const t0 = performance.now();
    const rows = await fn();
    budget(`${name} (${rows.length}행)`, performance.now() - t0, limit);
  };
  await q('직원 전체', () => db.select().from(schema.employees), 500);
  await q('근태 전체', () => db.select().from(schema.attendances), 1500);
  await q('급여 기준액 이력', () => db.select().from(schema.employeeSalaries), 500);
  await q('발령 이력', () => db.select().from(schema.employeeAssignments), 500);

  console.log('\n== 3. 엑셀 생성 ==');
  const ExcelJS = (await import('exceljs')).default;
  for (const rowCount of [1_000, 10_000]) {
    const t0 = performance.now();
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('대장');
    ws.columns = Array.from({ length: 25 }, (_, i) => ({ header: `열${i + 1}`, key: `c${i}`, width: 14 }));
    for (let r = 0; r < rowCount; r++) {
      ws.addRow(Object.fromEntries(Array.from({ length: 25 }, (_, i) => [`c${i}`, i % 3 === 0 ? r * 1000 : `값${r}-${i}`])));
    }
    ws.views = [{ state: 'frozen', ySplit: 1 }];
    const buf = await wb.xlsx.writeBuffer();
    budget(`${rowCount.toLocaleString()}행 × 25열 (${Math.round((buf as ArrayBuffer).byteLength / 1024)}KB)`,
      performance.now() - t0, rowCount === 10_000 ? 15_000 : 3_000);
  }

  console.log(`\n결과: ${fail === 0 ? '기준 내' : `${fail}건 기준 초과`}\n`);
  process.exit(fail === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
