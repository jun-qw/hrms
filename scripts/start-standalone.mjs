/**
 * Runs the production build the container also runs.
 *
 * `next start` does not serve the standalone output, so the static assets are
 * copied next to the standalone server and that server is launched instead.
 * Much lighter and far faster to start than the dev server — this is the mode
 * to use when demonstrating the product on a laptop.
 */
import { cpSync, existsSync, readFileSync } from 'fs';
import { spawn } from 'child_process';
import path from 'path';

const root = process.cwd();
const standalone = path.join(root, '.next', 'standalone');

if (!existsSync(path.join(standalone, 'server.js'))) {
  console.error('빌드 결과가 없습니다. 먼저 `npm run build` 를 실행하세요.');
  process.exit(1);
}

/**
 * The standalone server runs from .next/standalone, so it would look for env
 * files — and a relative PGlite directory — in the wrong place. Both are
 * resolved against the project root here and passed through explicitly.
 */
function loadEnv(file) {
  const full = path.join(root, file);
  if (!existsSync(full)) return {};
  const out = {};
  for (const line of readFileSync(full, 'utf8').replace(/^﻿/, '').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return out;
}

const fileEnv = { ...loadEnv('.env'), ...loadEnv('.env.local') };
const env = { ...fileEnv, ...process.env };

if (env.DB_DRIVER === 'pglite') {
  env.PGLITE_DIR = path.resolve(root, env.PGLITE_DIR ?? '.pglite');
}

cpSync(path.join(root, '.next', 'static'), path.join(standalone, '.next', 'static'), {
  recursive: true,
});
if (existsSync(path.join(root, 'public'))) {
  cpSync(path.join(root, 'public'), path.join(standalone, 'public'), { recursive: true });
}

const port = env.PORT ?? '3000';
console.log(`http://localhost:${port} 에서 실행합니다. (Ctrl+C 로 종료)`);

spawn(process.execPath, ['server.js'], {
  cwd: standalone,
  stdio: 'inherit',
  env: { ...env, PORT: port, HOSTNAME: env.HOSTNAME ?? '0.0.0.0', NODE_ENV: 'production' },
}).on('exit', (code) => process.exit(code ?? 0));
