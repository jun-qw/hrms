/**
 * 검증 스위트를 한 번에 돌립니다.
 *
 * PGlite 는 한 프로세스만 데이터베이스를 열 수 있어, 강제 종료 뒤 남은
 * 잠금 파일을 먼저 치웁니다. 그것 때문에 열리지 않는 것을 손상으로
 * 착각하기 쉽습니다.
 */
import { spawnSync } from 'child_process';
import { existsSync, rmSync } from 'fs';
import path from 'path';

const root = process.cwd();
const lock = path.join(root, '.pglite', 'postmaster.pid');
if (existsSync(lock)) {
  console.log('남아 있던 잠금 파일을 지웁니다 (.pglite/postmaster.pid).');
  console.log('서버가 켜져 있다면 지금 끄세요 — 두 프로세스가 같이 쓰면 깨집니다.\n');
  rmSync(lock);
}

const suites = ['p7-security.ts', 'p7-data.ts', 'p7-perf.ts', 'p8-rates.ts'];
let failed = 0;

for (const suite of suites) {
  console.log(`\n${'='.repeat(60)}\n${suite}\n${'='.repeat(60)}`);
  // 윈도우에서 npx 는 .cmd 라 shell 을 거쳐야 실행됩니다. shell 없이 부르면
  // 조용히 아무 출력도 없이 실패합니다.
  const r = spawnSync(
    'npx',
    ['tsx', path.join('scripts', 'verify', suite)],
    {
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, NODE_PATH: path.join(root, 'scripts', 'verify', 'shim') },
    },
  );
  if (r.status !== 0) failed += 1;
}

console.log(`\n${'='.repeat(60)}`);
console.log(failed === 0 ? '모든 검증 통과' : `${failed}개 스위트 실패`);
process.exit(failed === 0 ? 0 : 1);
