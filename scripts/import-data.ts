/**
 * 데이터 들여오기 — export-data 가 만든 JSON을 현재 DB에 넣습니다.
 *
 *   npx tsx scripts/import-data.ts <내보낸파일> [--wipe]
 *
 * 사내 서버 이전용입니다. 마이그레이션이 끝난 DB를 전제로 하고, ID까지
 * 그대로 넣어 참조 관계를 보존합니다.
 *
 * --wipe 는 넣기 전에 그 테이블을 비웁니다. 기본 시드가 만든 행(설정,
 * 코드 목록)과 겹치지 않게 하려면 켜는 것이 맞습니다 — 반쯤 겹친 상태가
 * 제일 위험합니다.
 *
 * 넣는 순서는 외래키 때문에 문제가 됩니다. 순서를 손으로 관리하는 대신,
 * 실패한 테이블을 뒤로 미루고 다시 시도합니다 — 한 바퀴 돌 때마다 하나라도
 * 성공하면 언젠가 끝나고, 아무것도 성공하지 못하면 진짜 오류입니다.
 */
import './lib/env';
import fs from 'fs';
import { getTableName, getTableColumns, sql } from 'drizzle-orm';
import { db, schema } from '../src/lib/db';

interface Dump {
  exportedAt: string;
  tables: Record<string, { table: string; rows: Record<string, unknown>[] }>;
}

/** JSON을 거치며 문자열이 된 timestamp를 Date로 되돌립니다. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function reviveRow(table: any, row: Record<string, unknown>): Record<string, unknown> {
  const columns = getTableColumns(table);
  const out: Record<string, unknown> = {};
  for (const [key, col] of Object.entries(columns)) {
    const value = row[key];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dataType = (col as any).dataType as string;
    // 사진·첨부 서류의 bytea 본문. JSON 을 거치면 Buffer 는
    // { type: 'Buffer', data: [...] } 로, Uint8Array 는 { "0": 255, "1": 216 }
    // 처럼 숫자 키 객체로 바뀝니다. PGlite 는 후자를 돌려줍니다.
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const obj = value as Record<string, unknown>;
      if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
        out[key] = Buffer.from(obj.data as number[]);
        continue;
      }
      const keys = Object.keys(obj);
      if (keys.length > 0 && keys.every((k) => /^\d+$/.test(k))) {
        out[key] = Buffer.from(keys.sort((a, b) => +a - +b).map((k) => obj[k] as number));
        continue;
      }
    }
    out[key] =
      dataType === 'date' && typeof value === 'string' && value.includes('T')
        ? new Date(value)
        : value;
  }
  return out;
}

async function main() {
  const file = process.argv[2];
  const wipe = process.argv.includes('--wipe');
  if (!file || !fs.existsSync(file)) {
    console.error('사용법: npx tsx scripts/import-data.ts <내보낸파일> [--wipe]');
    process.exit(1);
  }
  const dump = JSON.parse(fs.readFileSync(file, 'utf8')) as Dump;
  console.log(`내보낸 시각: ${dump.exportedAt}`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tableByExportName = new Map<string, any>(
    Object.entries(schema).filter(
      ([, v]) => v && typeof v === 'object' && Symbol.for('drizzle:IsDrizzleTable') in (v as object),
    ),
  );

  type Job = { name: string; table: unknown; rows: Record<string, unknown>[] };
  let pending: Job[] = [];
  for (const [name, entry] of Object.entries(dump.tables)) {
    const table = tableByExportName.get(name);
    if (!table) {
      console.warn(`  건너뜀 ${entry.table} — 이 버전에 없는 테이블입니다.`);
      continue;
    }
    pending.push({ name, table, rows: entry.rows });
  }

  if (wipe) {
    // 비우기도 외래키 순서를 탑니다 — 같은 재시도 방식으로 돕니다.
    let toWipe = [...pending];
    for (let round = 0; toWipe.length > 0 && round < 20; round++) {
      const failed: Job[] = [];
      for (const job of toWipe) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await db.execute(sql.raw(`DELETE FROM "${getTableName(job.table as any)}"`));
        } catch {
          failed.push(job);
        }
      }
      if (failed.length === toWipe.length) {
        console.error('비우지 못한 테이블:', failed.map((j) => j.name).join(', '));
        process.exit(1);
      }
      toWipe = failed;
    }
    console.log('기존 자료를 비웠습니다.');
  }

  const CHUNK = 500;
  let inserted = 0;
  for (let round = 0; pending.length > 0 && round < 20; round++) {
    const failed: Job[] = [];
    for (const job of pending) {
      try {
        for (let i = 0; i < job.rows.length; i += CHUNK) {
          const chunk = job.rows.slice(i, i + CHUNK).map((r) => reviveRow(job.table, r));
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if (chunk.length > 0) await db.insert(job.table as any).values(chunk as any);
        }
        inserted += job.rows.length;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        console.log(`  ${getTableName(job.table as any).padEnd(28)} ${String(job.rows.length).padStart(6)}행`);
      } catch (err) {
        // 외래키 순서 문제일 수 있으니 다음 바퀴로 미룹니다.
        failed.push({ ...job, lastError: err } as Job & { lastError: unknown });
      }
    }
    if (failed.length === pending.length) {
      console.error('\n넣지 못한 테이블:');
      for (const j of failed as (Job & { lastError?: unknown })[]) {
        console.error(`  ${j.name}: ${String((j.lastError as Error)?.message ?? '').split('\n')[0].slice(0, 100)}`);
      }
      process.exit(1);
    }
    pending = failed;
  }

  console.log(`\n총 ${inserted.toLocaleString()}행 들여왔습니다.`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
