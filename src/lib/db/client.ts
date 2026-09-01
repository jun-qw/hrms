// Driver-agnostic database factory, usable from both the Next.js app and
// standalone scripts (migrate/seed). Two drivers:
//   DB_DRIVER=pglite  -> embedded PostgreSQL (dev/demo, zero install; data in .pglite/)
//   DB_DRIVER=pg      -> real PostgreSQL via DATABASE_URL (production, default)
import { drizzle as drizzlePg, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { Pool } from 'pg';
import { PGlite } from '@electric-sql/pglite';
import * as schema from './schema';

export type Db = NodePgDatabase<typeof schema>;

export function isPgliteDriver(): boolean {
  return process.env.DB_DRIVER === 'pglite';
}

export function pgliteDataDir(): string {
  return process.env.PGLITE_DIR ?? '.pglite';
}

export interface DbHandle {
  db: Db;
  close: () => Promise<void>;
}

export function createDb(): DbHandle {
  if (isPgliteDriver()) {
    const client = new PGlite(pgliteDataDir());
    // PGlite's drizzle instance has the same query API as node-postgres's;
    // unify on one type so application code is driver-agnostic.
    const db = drizzlePglite(client, { schema }) as unknown as Db;
    return { db, close: () => client.close() };
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is not set. Configure it in .env.local, or set DB_DRIVER=pglite for the embedded database.',
    );
  }
  const pool = new Pool({ connectionString, max: 10 });
  return { db: drizzlePg(pool, { schema }), close: () => pool.end() };
}
