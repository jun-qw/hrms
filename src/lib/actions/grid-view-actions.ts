'use server';

/**
 * Saved grid views — a named column/filter layout for one 대장 screen.
 *
 * A person sees their own views plus anything a colleague published as
 * shared. Only the owner may change or delete a view, so a shared layout
 * cannot be edited out from under the team by whoever opens it next.
 */
import { and, eq, or, isNull } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import type { GridViewState, SavedGridView } from '@/components/grid/types';

async function currentUserId(): Promise<string | null> {
  if (process.env.AUTH_MODE !== 'db') return null;
  const session = await getSession();
  return session?.userId ?? null;
}

function toApp(row: typeof schema.gridViews.$inferSelect): SavedGridView {
  return {
    id: row.id,
    grid_key: row.gridKey,
    name: row.name,
    is_shared: row.isShared,
    is_default: row.isDefault,
    state: (row.state ?? {}) as Partial<GridViewState>,
  };
}

export async function fetchGridViews(gridKey: string): Promise<SavedGridView[]> {
  try {
    const userId = await currentUserId();
    const rows = await db
      .select()
      .from(schema.gridViews)
      .where(
        and(
          eq(schema.gridViews.gridKey, gridKey),
          userId
            ? or(eq(schema.gridViews.ownerUserId, userId), eq(schema.gridViews.isShared, true))
            : // Demo mode has no session; ownerless rows are the shared pool.
              or(isNull(schema.gridViews.ownerUserId), eq(schema.gridViews.isShared, true)),
        ),
      );
    return rows.map(toApp);
  } catch (err) {
    console.error('fetchGridViews failed:', err);
    return [];
  }
}

export async function saveGridView(input: {
  gridKey: string;
  name: string;
  isShared: boolean;
  state: Partial<GridViewState>;
}): Promise<SavedGridView | null> {
  try {
    const name = input.name.trim();
    if (!name) return null;
    const userId = await currentUserId();

    const [row] = await db
      .insert(schema.gridViews)
      .values({
        gridKey: input.gridKey,
        name,
        ownerUserId: userId,
        isShared: input.isShared,
        state: input.state,
      })
      .onConflictDoUpdate({
        target: [schema.gridViews.gridKey, schema.gridViews.ownerUserId, schema.gridViews.name],
        set: { state: input.state, isShared: input.isShared, updatedAt: new Date() },
      })
      .returning();

    return row ? toApp(row) : null;
  } catch (err) {
    console.error('saveGridView failed:', err);
    return null;
  }
}

export async function deleteGridView(id: string): Promise<boolean> {
  try {
    const userId = await currentUserId();
    const [existing] = await db
      .select()
      .from(schema.gridViews)
      .where(eq(schema.gridViews.id, id));
    if (!existing) return false;
    // A shared view stays under its author's control.
    if (userId && existing.ownerUserId && existing.ownerUserId !== userId) return false;

    await db.delete(schema.gridViews).where(eq(schema.gridViews.id, id));
    return true;
  } catch (err) {
    console.error('deleteGridView failed:', err);
    return false;
  }
}
