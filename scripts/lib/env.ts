/**
 * Loads environment variables for the command-line scripts.
 *
 * Next.js reads `.env.local` first and `.env` second; the scripts must agree
 * with it, otherwise a developer configures one file and the other half of the
 * toolchain silently sees nothing.
 */
import fs from 'fs';
import path from 'path';

function load(file: string): void {
  const full = path.join(process.cwd(), file);
  if (!fs.existsSync(full)) return;
  // Strip a UTF-8 BOM: it would otherwise become part of the first key name.
  const raw = fs.readFileSync(full, 'utf8').replace(/^﻿/, '');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!key || key in process.env) continue; // earlier files win
    process.env[key] = trimmed.slice(eq + 1).trim();
  }
}

load('.env.local');
load('.env');
