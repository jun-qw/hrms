/**
 * Applies ./drizzle SQL migrations to the configured database.
 * Works with both drivers (DB_DRIVER=pg | pglite).
 *
 * Exported so both the CLI wrapper and `npm run setup` can run it.
 */
import { migrate as migratePg } from 'drizzle-orm/node-postgres/migrator';
import { migrate as migratePglite } from 'drizzle-orm/pglite/migrator';
import type { PgliteDatabase } from 'drizzle-orm/pglite';
import { createDb, isPgliteDriver, pgliteDataDir } from '../../src/lib/db/client';
import * as schema from '../../src/lib/db/schema';

export async function runMigrations() {
  const { db, close } = createDb();
  const config = { migrationsFolder: './drizzle' };

  if (isPgliteDriver()) {
    console.log(`Migrating embedded PGlite database at ${pgliteDataDir()} ...`);
    await migratePglite(db as unknown as PgliteDatabase<typeof schema>, config);
  } else {
    console.log('Migrating PostgreSQL database ...');
    await migratePg(db, config);
  }

  await close();
  console.log('Migrations applied.');
}

