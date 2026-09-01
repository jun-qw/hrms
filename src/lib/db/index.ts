import { createDb, type Db, type DbHandle } from './client';
import * as schema from './schema';

// Reuse a single connection handle across dev hot-reloads to avoid
// exhausting pg connections / reopening the PGlite file store.
const globalForDb = globalThis as unknown as {
  hrmsDbHandle?: DbHandle;
};

function getHandle(): DbHandle {
  if (!globalForDb.hrmsDbHandle) {
    globalForDb.hrmsDbHandle = createDb();
  }
  return globalForDb.hrmsDbHandle;
}

/**
 * The connection opens on first query, not on import.
 *
 * `next build` imports every server module to collect route metadata; opening
 * a database there would make the build require a live database, which breaks
 * building the image once and pointing it at a customer database at run time.
 */
export const db: Db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    const real = getHandle().db as unknown as Record<string | symbol, unknown>;
    const value = Reflect.get(real, prop, receiver);
    return typeof value === 'function' ? value.bind(real) : value;
  },
});

export { schema };
export type { Db };
