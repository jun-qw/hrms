/**
 * 데이터 내보내기 — 개발 DB(PGlite)의 전체 자료를 JSON 한 파일로.
 *
 *   npx tsx scripts/export-data.ts [출력파일]
 *
 * 사내 서버로 이전할 때 씁니다. 서버 쪽에서는 짝이 되는 import-data 가 이
 * 파일을 읽어 그대로 넣습니다. ID까지 보존하므로 참조 관계가 깨지지 않습니다.
 *
 * 서버를 먼저 끄세요 — PGlite 는 한 프로세스만 데이터베이스를 열 수 있습니다.
 */
import './lib/env';
import fs from 'fs';
import { getTableName } from 'drizzle-orm';
import { db, schema } from '../src/lib/db';

async function main() {
  const outPath = process.argv[2] ?? 'hrms-export.json';

  // schema 모듈에서 pgTable 만 골라냅니다. 테이블을 하나 추가해도 이
  // 스크립트는 고칠 필요가 없습니다.
  const tables = Object.entries(schema).filter(
    ([, v]) => v && typeof v === 'object' && Symbol.for('drizzle:IsDrizzleTable') in (v as object),
  ) as [string, Parameters<typeof getTableName>[0]][];

  const dump: Record<string, { table: string; rows: unknown[] }> = {};
  let total = 0;

  for (const [exportName, table] of tables) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await db.select().from(table as any);
    dump[exportName] = { table: getTableName(table), rows };
    total += rows.length;
    if (rows.length > 0) {
      console.log(`  ${getTableName(table).padEnd(28)} ${String(rows.length).padStart(6)}행`);
    }
  }

  fs.writeFileSync(
    outPath,
    JSON.stringify({ exportedAt: new Date().toISOString(), tables: dump }, null, 0),
  );
  const mb = (fs.statSync(outPath).size / 1024 / 1024).toFixed(1);
  console.log(`\n${tables.length}개 테이블 · ${total.toLocaleString()}행 → ${outPath} (${mb}MB)`);
  console.log('이 파일에는 전 직원의 개인정보가 들어 있습니다. 이전이 끝나면 지우세요.');
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
