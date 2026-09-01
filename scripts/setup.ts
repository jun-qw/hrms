/**
 * One-command local setup.
 *
 *   npm run setup          기본 데이터만 (신규 도입과 동일한 상태)
 *   npm run setup -- --demo  대한오토텍 인력 명부(55명)까지 함께 적재
 *
 * Writes .env.local if it is missing (generating a session secret), applies
 * migrations and seeds, so that `npm run dev` works on a fresh checkout
 * without installing PostgreSQL.
 */
import { randomBytes } from 'crypto';
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const ENV_PATH = path.join(ROOT, '.env.local');

const DEFAULT_ADMIN_EMAIL = 'admin@example.com';
const DEFAULT_ADMIN_PASSWORD = 'ChangeMe123!';

function writeEnvFile(): void {
  const lines = [
    '# 로컬 개발 설정 — npm run setup 이 생성했습니다.',
    '',
    '# 임베디드 PostgreSQL(PGlite)을 사용하므로 별도 설치가 필요 없습니다.',
    '# 실제 PostgreSQL을 쓰려면 DB_DRIVER=pg 로 바꾸고 DATABASE_URL 을 지정하세요.',
    'DB_DRIVER=pglite',
    'DATABASE_URL=postgresql://hrms:hrms@localhost:5432/hrms',
    '',
    '# 실제 로그인(데이터베이스 계정)을 사용합니다.',
    'AUTH_MODE=db',
    `SESSION_SECRET=${randomBytes(32).toString('hex')}`,
    'SESSION_TTL_HOURS=8',
    '',
    '# 최초 관리자 계정',
    `SEED_ADMIN_EMAIL=${DEFAULT_ADMIN_EMAIL}`,
    `SEED_ADMIN_PASSWORD=${DEFAULT_ADMIN_PASSWORD}`,
    'SEED_ADMIN_NAME=Administrator',
    '',
  ];
  // Plain UTF-8 without a BOM: a BOM would become part of the first key name.
  fs.writeFileSync(ENV_PATH, lines.join('\n'), { encoding: 'utf8' });
}


async function main() {
  const withDemo = process.argv.includes('--demo');

  if (fs.existsSync(ENV_PATH)) {
    console.log('· .env.local 이 이미 있어 그대로 사용합니다.');
  } else {
    writeEnvFile();
    console.log('· .env.local 을 생성했습니다 (세션 키 자동 생성).');
  }
  await import('./lib/env');

  // Imported after the environment is in place: the database module reads
  // DB_DRIVER / DATABASE_URL when the first query runs.
  const { runMigrations } = await import('./lib/run-migrations');
  const { runSeed } = await import('./lib/run-seed');

  console.log('· 데이터베이스 스키마를 적용합니다 ...');
  await runMigrations();

  console.log('· 기본 데이터를 넣습니다 ...');
  await runSeed();

  if (withDemo) {
    console.log('· 인력 명부를 넣습니다 ...');
    const { runSeedDemo } = await import('./lib/run-seed-demo');
    await runSeedDemo({ force: true });
  }

  const email = process.env.SEED_ADMIN_EMAIL ?? DEFAULT_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD ?? DEFAULT_ADMIN_PASSWORD;

  console.log('');
  console.log('준비가 끝났습니다.');
  console.log('');
  console.log('  npm run dev   실행 후  http://localhost:3000');
  console.log('');
  console.log(`  아이디  ${email}`);
  console.log(`  비밀번호 ${password}`);
  if (withDemo) {
    console.log('  추가 계정 hr@daehan-at.co.kr / employee@daehan-at.co.kr (Demo1234!)');
  }
  console.log('');
}

main().catch((err) => {
  console.error('설치에 실패했습니다:', err instanceof Error ? err.message : err);
  process.exit(1);
});
