import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Liveness probe for container orchestration.
 *
 * Always answers 200 while the process is serving, and reports database
 * reachability separately — a briefly unavailable database should not make an
 * orchestrator kill and restart an otherwise healthy app container.
 */
export async function GET() {
  let database: 'ok' | 'unreachable' = 'ok';
  try {
    await db.execute(sql`select 1`);
  } catch {
    database = 'unreachable';
  }
  return NextResponse.json({ status: 'ok', database }, { status: 200 });
}
