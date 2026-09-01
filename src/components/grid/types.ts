import type { ReactNode } from 'react';

/**
 * Column definition for <DataGrid>.
 *
 * One definition drives everything the grid does with a column — render,
 * sort, filter, edit, paste, subtotal and export — so a screen never has to
 * describe the same column twice.
 */
export interface GridColumn<T> {
  /** Stable key. Used in saved views, so do not rename it casually. */
  id: string;
  /** Column header, and the header written into an exported sheet. */
  header: string;
  /**
   * Raw value behind the cell. Sorting, filtering, pasting and export all
   * work on this, never on the rendered node.
   */
  value: (row: T) => string | number | null | undefined;
  /** Optional rich cell. Falls back to the formatted raw value. */
  cell?: (row: T) => ReactNode;
  /** Display width in px. The user can drag it and the view remembers. */
  width?: number;
  align?: 'left' | 'center' | 'right';
  /** Numeric columns right-align, use tabular figures and can be totalled. */
  type?: 'text' | 'number' | 'money' | 'date';
  /** Pin to the left edge so it stays visible while scrolling sideways. */
  pinned?: boolean;
  /** Column filter control. Omit for no filter. */
  filter?: GridFilterKind;
  /** Options for a 'select' filter and for the inline editor's dropdown. */
  options?: readonly GridOption[];
  /** Hidden until the user turns it on in the column picker. */
  hidden?: boolean;
  /** Show a column total in the footer. */
  total?: 'sum' | 'count';
  /** Makes the cell editable in place and pasteable. */
  edit?: GridEdit<T>;
}

export type GridFilterKind = 'text' | 'select' | 'number' | 'date';

export interface GridOption {
  value: string;
  label: string;
}

export interface GridEdit<T> {
  /**
   * Parse and validate what the user typed (or pasted). Return the value to
   * store, or an error message the grid shows on the cell.
   */
  parse: (input: string, row: T) => { ok: true; value: unknown } | { ok: false; error: string };
  /**
   * Identifier the grid hands back with the parsed value.
   *
   * Usually a field name on the row, but not always: the attendance register
   * builds one column per day of the month (`d1` … `d31`), and those are not
   * properties of the row type. The grid never interprets this — it only
   * passes it through to `onEdit`.
   */
  field: string;
  /** Editor control. 'select' uses `options`. */
  control?: 'text' | 'number' | 'date' | 'select';
}

/** Serialised into `grid_views.state`. Unknown column ids are ignored. */
export interface GridViewState {
  order: string[];
  hidden: string[];
  widths: Record<string, number>;
  pinned: string[];
  sort: { id: string; desc: boolean }[];
  filters: Record<string, string>;
  search: string;
  density: GridDensity;
}

export type GridDensity = 'compact' | 'comfortable';

export interface SavedGridView {
  id: string;
  grid_key: string;
  name: string;
  is_shared: boolean;
  is_default: boolean;
  state: Partial<GridViewState>;
}

/** A single cell change produced by inline editing or a paste. */
export interface GridEditPatch {
  rowId: string;
  field: string;
  value: unknown;
}

/** One row of a pending paste, after validation. */
export interface PasteRow {
  rowId: string;
  label: string;
  cells: PasteCell[];
  /** True when every cell in the row parsed. Only these get saved. */
  ok: boolean;
}

export interface PasteCell {
  columnId: string;
  header: string;
  field: string;
  raw: string;
  value?: unknown;
  error?: string;
}
