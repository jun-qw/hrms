'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { GridColumn, GridDensity, GridViewState } from './types';

/**
 * Column layout and filter state for one grid.
 *
 * The layout a person arrives at after ten minutes of dragging columns around
 * is worth keeping, so it is mirrored into localStorage on every change and
 * restored on the next visit. Named views (shared with the team) live in the
 * database and are applied through `apply()`.
 *
 * A stored layout is always reconciled against the current column set: ids the
 * grid no longer has are dropped, and columns added since the layout was saved
 * appear at the end. That way a saved view never breaks a screen.
 */
export function useGridView<T>(gridKey: string, columns: GridColumn<T>[]) {
  const storageKey = `hrms-grid:${gridKey}`;

  const initial = useMemo<GridViewState>(
    () => ({
      order: columns.map((c) => c.id),
      hidden: columns.filter((c) => c.hidden).map((c) => c.id),
      widths: {},
      pinned: columns.filter((c) => c.pinned).map((c) => c.id),
      sort: [],
      filters: {},
      search: '',
      density: 'compact',
    }),
    [columns],
  );

  const [state, setState] = useState<GridViewState>(initial);
  const [loaded, setLoaded] = useState(false);

  // Restore the last layout once, on mount.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) setState((prev) => reconcile({ ...prev, ...JSON.parse(raw) }, columns));
    } catch {
      // A corrupt or unreadable entry just means "start from the defaults".
    }
    setLoaded(true);
    // Only ever runs for the initial column set; reconcile() handles later changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // Private-mode storage refusal is not worth interrupting the user for.
    }
  }, [state, storageKey, loaded]);

  const patch = useCallback((next: Partial<GridViewState>) => {
    setState((prev) => ({ ...prev, ...next }));
  }, []);

  const apply = useCallback(
    (saved: Partial<GridViewState>) => {
      setState((prev) => reconcile({ ...prev, ...saved }, columns));
    },
    [columns],
  );

  const reset = useCallback(() => setState(initial), [initial]);

  const toggleColumn = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      hidden: prev.hidden.includes(id)
        ? prev.hidden.filter((x) => x !== id)
        : [...prev.hidden, id],
    }));
  }, []);

  const togglePin = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      pinned: prev.pinned.includes(id)
        ? prev.pinned.filter((x) => x !== id)
        : [...prev.pinned, id],
    }));
  }, []);

  /** Click cycles asc → desc → off. Shift-click adds to a multi-column sort. */
  const toggleSort = useCallback((id: string, additive: boolean) => {
    setState((prev) => {
      const existing = prev.sort.find((s) => s.id === id);
      const others = additive ? prev.sort.filter((s) => s.id !== id) : [];
      if (!existing) return { ...prev, sort: [...others, { id, desc: false }] };
      if (!existing.desc) return { ...prev, sort: [...others, { id, desc: true }] };
      return { ...prev, sort: others };
    });
  }, []);

  const setFilter = useCallback((id: string, value: string) => {
    setState((prev) => {
      const filters = { ...prev.filters };
      if (value === '') delete filters[id];
      else filters[id] = value;
      return { ...prev, filters };
    });
  }, []);

  const setWidth = useCallback((id: string, width: number) => {
    setState((prev) => ({ ...prev, widths: { ...prev.widths, [id]: Math.max(60, width) } }));
  }, []);

  const setDensity = useCallback((density: GridDensity) => patch({ density }), [patch]);
  const setSearch = useCallback((search: string) => patch({ search }), [patch]);

  const clearFilters = useCallback(
    () => patch({ filters: {}, search: '' }),
    [patch],
  );

  /** Columns in view order, hidden ones removed, pinned ones first. */
  const visibleColumns = useMemo(() => {
    const byId = new Map(columns.map((c) => [c.id, c]));
    const ordered = state.order
      .map((id) => byId.get(id))
      .filter((c): c is GridColumn<T> => Boolean(c) && !state.hidden.includes(c!.id));
    const pinned = ordered.filter((c) => state.pinned.includes(c.id));
    const rest = ordered.filter((c) => !state.pinned.includes(c.id));
    return [...pinned, ...rest];
  }, [columns, state.order, state.hidden, state.pinned]);

  const filterCount = Object.keys(state.filters).length + (state.search ? 1 : 0);

  return {
    state,
    loaded,
    visibleColumns,
    filterCount,
    apply,
    reset,
    patch,
    toggleColumn,
    togglePin,
    toggleSort,
    setFilter,
    setWidth,
    setDensity,
    setSearch,
    clearFilters,
  };
}

/** Drops ids the grid no longer has and appends columns added since. */
function reconcile<T>(state: GridViewState, columns: GridColumn<T>[]): GridViewState {
  const ids = new Set(columns.map((c) => c.id));
  const order = [
    ...(state.order ?? []).filter((id) => ids.has(id)),
    ...columns.map((c) => c.id).filter((id) => !(state.order ?? []).includes(id)),
  ];
  return {
    ...state,
    order,
    hidden: (state.hidden ?? []).filter((id) => ids.has(id)),
    pinned: (state.pinned ?? []).filter((id) => ids.has(id)),
    sort: (state.sort ?? []).filter((s) => ids.has(s.id)),
    filters: Object.fromEntries(
      Object.entries(state.filters ?? {}).filter(([id]) => ids.has(id)),
    ),
  };
}
