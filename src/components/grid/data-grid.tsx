'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ArrowDown, ArrowUp, Pin, PinOff, SquareArrowOutUpRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { alignOf, compareValues, formatValue } from './grid-format';
import { useGridView } from './use-grid-view';
import { GridToolbar } from './grid-toolbar';
import { GridPasteDialog } from './grid-paste-dialog';
import { parseClipboard, validatePaste } from './grid-paste';
import type { GridColumn, GridEditPatch, PasteRow } from './types';

interface DataGridProps<T extends { id: string }> {
  /** Stable key for saved views and the stored layout. Do not change casually. */
  gridKey: string;
  /** Shown in the toolbar and used as the exported sheet's title. */
  title: string;
  columns: GridColumn<T>[];
  rows: T[];
  /** Text under a row, used to name it in the paste review and in messages. */
  rowLabel: (row: T) => string;
  /** Group rows under a subtotal header, e.g. by department. */
  groupBy?: { columnId: string; label: (row: T) => string };
  /** Called with every accepted cell change from inline editing or a paste. */
  onEdit?: (patches: GridEditPatch[]) => Promise<void> | void;
  /**
   * Opens the record behind a row. Reached through the row's ↗ button, not a
   * row click: on an editable grid the first click of a double-click would
   * navigate away before the editor ever opened.
   */
  onOpenRow?: (row: T) => void;
  /** Rendered in the toolbar when at least one row is selected. */
  bulkActions?: (selected: T[], clear: () => void) => ReactNode;
  /** Extra controls on the right of the toolbar. */
  toolbarExtra?: ReactNode;
  /** Line under the sheet title in an export, e.g. the active filters. */
  exportSubtitle?: string;
  emptyMessage?: string;
}

type DisplayRow<T> =
  | { kind: 'data'; row: T; index: number }
  | { kind: 'group'; label: string; count: number; totals: Map<string, number> };

const ROW_HEIGHT = { compact: 32, comfortable: 42 } as const;

/** Checkbox + open button, pinned to the left of every row. */
const LEAD_WIDTH = 64;

export function DataGrid<T extends { id: string }>({
  gridKey,
  title,
  columns,
  rows,
  rowLabel,
  groupBy,
  onEdit,
  onOpenRow,
  bulkActions,
  toolbarExtra,
  exportSubtitle,
  emptyMessage = '표시할 자료가 없습니다.',
}: DataGridProps<T>) {
  const view = useGridView(gridKey, columns);
  const { state, visibleColumns } = view;

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<{ rowId: string; columnId: string } | null>(null);
  const [cellErrors, setCellErrors] = useState<Map<string, string>>(new Map());
  const [pasteRows, setPasteRows] = useState<PasteRow[] | null>(null);
  const [saving, setSaving] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  // ── filter → sort ────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const search = state.search.trim().toLowerCase();
    const active = Object.entries(state.filters);

    return rows.filter((row) => {
      for (const [columnId, needle] of active) {
        const column = columns.find((c) => c.id === columnId);
        if (!column) continue;
        const raw = column.value(row);
        const text = raw === null || raw === undefined ? '' : String(raw);
        if (column.filter === 'select') {
          // 드롭다운은 코드를 값으로 갖지만(예: 'office') 셀은 라벨을 보여
          // 줍니다(예: '사무직'). 코드끼리만 비교하면 어떤 행도 걸리지 않으므로
          // 고른 항목의 라벨과도 대조합니다.
          const option = column.options?.find((o) => o.value === needle);
          if (text !== needle && text !== option?.label) return false;
        } else if (!text.toLowerCase().includes(needle.toLowerCase())) {
          return false;
        }
      }
      if (!search) return true;
      return visibleColumns.some((column) => {
        const raw = column.value(row);
        return raw !== null && raw !== undefined && String(raw).toLowerCase().includes(search);
      });
    });
  }, [rows, columns, visibleColumns, state.filters, state.search]);

  const sorted = useMemo(() => {
    if (state.sort.length === 0) return filtered;
    const byId = new Map(columns.map((c) => [c.id, c]));
    return [...filtered].sort((a, b) => {
      for (const { id, desc } of state.sort) {
        const column = byId.get(id);
        if (!column) continue;
        const result = compareValues(column.value(a), column.value(b));
        if (result !== 0) return desc ? -result : result;
      }
      return 0;
    });
  }, [filtered, columns, state.sort]);

  // ── group subtotals ──────────────────────────────────────────────────────

  const totalColumns = useMemo(
    () => visibleColumns.filter((c) => c.total),
    [visibleColumns],
  );

  const display = useMemo<DisplayRow<T>[]>(() => {
    if (!groupBy) return sorted.map((row, index) => ({ kind: 'data', row, index }));

    const groups = new Map<string, T[]>();
    for (const row of sorted) {
      const key = groupBy.label(row) || '—';
      const list = groups.get(key);
      if (list) list.push(row);
      else groups.set(key, [row]);
    }

    const out: DisplayRow<T>[] = [];
    let index = 0;
    for (const [label, groupRows] of groups) {
      const totals = new Map<string, number>();
      for (const column of totalColumns) {
        totals.set(
          column.id,
          column.total === 'count'
            ? groupRows.length
            : groupRows.reduce((sum, r) => sum + toNumber(column.value(r)), 0),
        );
      }
      out.push({ kind: 'group', label, count: groupRows.length, totals });
      for (const row of groupRows) out.push({ kind: 'data', row, index: index++ });
    }
    return out;
  }, [sorted, groupBy, totalColumns]);

  const grandTotals = useMemo(() => {
    const totals = new Map<string, number>();
    for (const column of totalColumns) {
      totals.set(
        column.id,
        column.total === 'count'
          ? sorted.length
          : sorted.reduce((sum, r) => sum + toNumber(column.value(r)), 0),
      );
    }
    return totals;
  }, [sorted, totalColumns]);

  // ── virtualization ───────────────────────────────────────────────────────

  const rowHeight = ROW_HEIGHT[state.density];
  const virtualizer = useVirtualizer({
    count: display.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan: 12,
  });

  // ── selection ────────────────────────────────────────────────────────────

  const allSelected = sorted.length > 0 && sorted.every((r) => selected.has(r.id));
  const clearSelection = useCallback(() => setSelected(new Set()), []);

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(sorted.map((r) => r.id)));
  };
  const toggleRow = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedRows = useMemo(
    () => rows.filter((r) => selected.has(r.id)),
    [rows, selected],
  );

  // ── inline editing ───────────────────────────────────────────────────────

  const commitEdit = useCallback(
    async (row: T, column: GridColumn<T>, input: string) => {
      const edit = column.edit;
      if (!edit) return;
      const key = `${row.id}:${column.id}`;
      const parsed = edit.parse(input.trim(), row);

      setCellErrors((prev) => {
        const next = new Map(prev);
        if (parsed.ok) next.delete(key);
        else next.set(key, parsed.error);
        return next;
      });

      setEditing(null);
      if (!parsed.ok || !onEdit) return;
      if (String(column.value(row) ?? '') === input.trim()) return;

      setSaving(true);
      try {
        await onEdit([{ rowId: row.id, field: edit.field, value: parsed.value }]);
      } finally {
        setSaving(false);
      }
    },
    [onEdit],
  );

  // ── clipboard paste ──────────────────────────────────────────────────────

  const editableColumns = useMemo(() => columns.filter((c) => c.edit), [columns]);

  useEffect(() => {
    if (!onEdit || editableColumns.length === 0) return;

    const handler = (event: ClipboardEvent) => {
      // Let a real input field keep its own paste behaviour.
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (!scrollRef.current?.contains(document.activeElement) && document.activeElement !== document.body) {
        return;
      }
      const text = event.clipboardData?.getData('text/plain');
      if (!text || !text.includes('\t')) return;

      event.preventDefault();
      const block = parseClipboard(text);
      if (block.length === 0) return;

      // Paste lands on the selected rows, or from the top when none are picked.
      const targets = selectedRows.length > 0 ? selectedRows : sorted;
      setPasteRows(validatePaste(block, targets, columns, rowLabel));
    };

    document.addEventListener('paste', handler);
    return () => document.removeEventListener('paste', handler);
  }, [onEdit, editableColumns, columns, sorted, selectedRows, rowLabel]);

  const applyPaste = async (patches: GridEditPatch[]) => {
    if (!onEdit) return;
    setSaving(true);
    try {
      await onEdit(patches);
    } finally {
      setSaving(false);
      setPasteRows(null);
    }
  };

  // ── render ───────────────────────────────────────────────────────────────

  const gridTemplate = useMemo(() => {
    const widths = visibleColumns.map((c) => `${state.widths[c.id] ?? c.width ?? 140}px`);
    return [`${LEAD_WIDTH}px`, ...widths].join(' ');
  }, [visibleColumns, state.widths]);

  const pinnedOffsets = useMemo(() => {
    const offsets = new Map<string, number>();
    let x = LEAD_WIDTH;
    for (const column of visibleColumns) {
      if (!state.pinned.includes(column.id)) break;
      offsets.set(column.id, x);
      x += state.widths[column.id] ?? column.width ?? 140;
    }
    return offsets;
  }, [visibleColumns, state.pinned, state.widths]);

  /** Columns the group label may cover: everything before the first subtotal. */
  const groupLabelSpan = useMemo(() => {
    const firstTotal = visibleColumns.findIndex((c) => c.total);
    return firstTotal === -1 ? visibleColumns.length : Math.max(1, firstTotal);
  }, [visibleColumns]);

  const virtualRows = virtualizer.getVirtualItems();

  return (
    <div className="flex flex-col gap-3">
      <GridToolbar
        gridKey={gridKey}
        title={title}
        view={view}
        columns={columns}
        visibleColumns={visibleColumns}
        rowCount={sorted.length}
        totalCount={rows.length}
        selectedCount={selected.size}
        sortedRows={sorted}
        grandTotals={grandTotals}
        exportSubtitle={exportSubtitle}
        saving={saving}
        bulkActions={bulkActions ? bulkActions(selectedRows, clearSelection) : null}
        extra={toolbarExtra}
        pasteEnabled={Boolean(onEdit) && editableColumns.length > 0}
      />

      <div className="rounded-lg border bg-card">
        <div
          ref={scrollRef}
          className="relative max-h-[calc(100vh-22rem)] min-h-[18rem] overflow-auto"
          tabIndex={0}
        >
          {/* Header */}
          <div
            className="sticky top-0 z-20 grid border-b bg-muted text-[11px] font-medium text-muted-foreground"
            style={{ gridTemplateColumns: gridTemplate }}
          >
            <div className="sticky left-0 z-10 flex items-center justify-center border-r bg-muted px-2 py-2">
              <input
                type="checkbox"
                aria-label="전체 선택"
                className="h-3.5 w-3.5 cursor-pointer accent-primary"
                checked={allSelected}
                onChange={toggleAll}
              />
            </div>
            {visibleColumns.map((column) => (
              <HeaderCell
                key={column.id}
                column={column}
                sortIndex={state.sort.findIndex((s) => s.id === column.id)}
                sortDesc={state.sort.find((s) => s.id === column.id)?.desc ?? false}
                filterValue={state.filters[column.id] ?? ''}
                pinned={state.pinned.includes(column.id)}
                pinnedLeft={pinnedOffsets.get(column.id)}
                onSort={(additive) => view.toggleSort(column.id, additive)}
                onFilter={(v) => view.setFilter(column.id, v)}
                onPin={() => view.togglePin(column.id)}
                onWidth={(w) => view.setWidth(column.id, w)}
              />
            ))}
          </div>

          {/* Body */}
          {display.length === 0 ? (
            <p className="px-4 py-16 text-center text-sm text-muted-foreground">{emptyMessage}</p>
          ) : (
            <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
              {virtualRows.map((virtualRow) => {
                const item = display[virtualRow.index];
                const common = {
                  position: 'absolute' as const,
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: virtualRow.size,
                  transform: `translateY(${virtualRow.start}px)`,
                  gridTemplateColumns: gridTemplate,
                };

                if (item.kind === 'group') {
                  // The label spans every column up to the first one carrying a
                  // subtotal, so a department name is never squeezed into the
                  // width of the 사번 column.
                  return (
                    <div
                      key={`g-${virtualRow.index}`}
                      className="grid items-center border-b border-t bg-muted/70 text-[11px] font-semibold"
                      style={common}
                    >
                      <div className="sticky left-0 z-10 h-full border-r bg-muted/70" />
                      <div
                        className="sticky z-10 truncate bg-muted/70 px-3"
                        style={{ left: LEAD_WIDTH, gridColumn: `span ${groupLabelSpan}` }}
                      >
                        {item.label} · {item.count}명
                      </div>
                      {visibleColumns.slice(groupLabelSpan).map((column) => (
                        <div
                          key={column.id}
                          className={cn(
                            'truncate px-3',
                            alignOf(column) === 'right' && 'text-right tabular-nums',
                          )}
                        >
                          {item.totals.has(column.id)
                            ? formatValue(column, item.totals.get(column.id))
                            : ''}
                        </div>
                      ))}
                    </div>
                  );
                }

                const { row } = item;
                const isSelected = selected.has(row.id);
                return (
                  <div
                    key={row.id}
                    className={cn(
                      'group/row grid items-center border-b text-[13px] transition-colors',
                      isSelected ? 'bg-accent-blue-subtle' : 'bg-card hover:bg-muted/40',
                    )}
                    style={common}
                  >
                    <div
                      className={cn(
                        'sticky left-0 z-10 flex h-full items-center justify-center gap-0.5 border-r',
                        isSelected ? 'bg-accent-blue-subtle' : 'bg-card',
                      )}
                    >
                      <input
                        type="checkbox"
                        aria-label={`${rowLabel(row)} 선택`}
                        className="h-3.5 w-3.5 cursor-pointer accent-primary"
                        checked={isSelected}
                        onChange={() => toggleRow(row.id)}
                      />
                      {onOpenRow && (
                        <button
                          type="button"
                          aria-label={`${rowLabel(row)} 상세 열기`}
                          title="상세 열기"
                          className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-primary focus-visible:opacity-100 group-hover/row:opacity-100"
                          onClick={() => onOpenRow(row)}
                        >
                          <SquareArrowOutUpRight className="h-3 w-3" />
                        </button>
                      )}
                    </div>

                    {visibleColumns.map((column) => {
                      const key = `${row.id}:${column.id}`;
                      const error = cellErrors.get(key);
                      const isEditing =
                        editing?.rowId === row.id && editing.columnId === column.id;
                      const pinned = state.pinned.includes(column.id);

                      return (
                        <div
                          key={column.id}
                          className={cn(
                            'h-full min-w-0 px-3',
                            'flex items-center',
                            alignOf(column) === 'right' && 'justify-end tabular-nums',
                            alignOf(column) === 'center' && 'justify-center',
                            pinned && 'sticky z-10 border-r',
                            pinned && (isSelected ? 'bg-accent-blue-subtle' : 'bg-card'),
                            error && 'bg-red-50 ring-1 ring-inset ring-red-400',
                            column.edit && 'cursor-text',
                          )}
                          style={pinned ? { left: pinnedOffsets.get(column.id) } : undefined}
                          title={error}
                          onDoubleClick={() => {
                            if (column.edit) setEditing({ rowId: row.id, columnId: column.id });
                          }}
                        >
                          {isEditing && column.edit ? (
                            <EditorCell
                              column={column}
                              initial={String(column.value(row) ?? '')}
                              onCommit={(v) => void commitEdit(row, column, v)}
                              onCancel={() => setEditing(null)}
                            />
                          ) : (
                            <span className="truncate">
                              {column.cell ? column.cell(row) : formatValue(column, column.value(row))}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Grand total */}
        {totalColumns.length > 0 && display.length > 0 && (
          <div
            className="grid border-t-2 border-t-border bg-muted py-2 text-[11px] font-bold"
            style={{ gridTemplateColumns: gridTemplate }}
          >
            <div className="border-r" />
            <div className="truncate px-3" style={{ gridColumn: `span ${groupLabelSpan}` }}>
              합계 · {sorted.length.toLocaleString('ko-KR')}명
            </div>
            {visibleColumns.slice(groupLabelSpan).map((column) => (
              <div
                key={column.id}
                className={cn(
                  'truncate px-3',
                  alignOf(column) === 'right' && 'text-right tabular-nums',
                )}
              >
                {grandTotals.has(column.id) ? formatValue(column, grandTotals.get(column.id)) : ''}
              </div>
            ))}
          </div>
        )}
      </div>

      {cellErrors.size > 0 && (
        <p className="flex items-center gap-1.5 text-xs text-destructive">
          <X className="h-3.5 w-3.5" />
          {cellErrors.size}개 셀이 저장되지 않았습니다. 붉게 표시된 칸에 마우스를 올리면 이유가 보입니다.
        </p>
      )}

      {pasteRows && (
        <GridPasteDialog
          rows={pasteRows}
          onCancel={() => setPasteRows(null)}
          onApply={applyPaste}
          saving={saving}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function HeaderCell<T>({
  column,
  sortIndex,
  sortDesc,
  filterValue,
  pinned,
  pinnedLeft,
  onSort,
  onFilter,
  onPin,
  onWidth,
}: {
  column: GridColumn<T>;
  sortIndex: number;
  sortDesc: boolean;
  filterValue: string;
  pinned: boolean;
  pinnedLeft?: number;
  onSort: (additive: boolean) => void;
  onFilter: (value: string) => void;
  onPin: () => void;
  onWidth: (width: number) => void;
}) {
  const cellRef = useRef<HTMLDivElement>(null);

  const startResize = (event: React.PointerEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const startWidth = cellRef.current?.offsetWidth ?? 140;
    const move = (e: PointerEvent) => onWidth(startWidth + (e.clientX - startX));
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <div
      ref={cellRef}
      className={cn(
        'group relative flex flex-col justify-center gap-1 border-r px-2 py-1.5',
        pinned && 'sticky z-10 bg-muted',
      )}
      style={pinned ? { left: pinnedLeft } : undefined}
    >
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-1 text-left hover:text-primary"
          onClick={(e) => onSort(e.shiftKey)}
          title="클릭: 정렬 · Shift+클릭: 정렬 추가"
        >
          <span className="truncate">{column.header}</span>
          {sortIndex >= 0 &&
            (sortDesc ? <ArrowDown className="h-3 w-3 shrink-0" /> : <ArrowUp className="h-3 w-3 shrink-0" />)}
          {sortIndex > 0 && <span className="text-[9px] text-muted-foreground">{sortIndex + 1}</span>}
        </button>
        <button
          type="button"
          className={cn(
            'shrink-0 opacity-0 transition-opacity group-hover:opacity-100',
            pinned && 'opacity-100 text-primary',
          )}
          onClick={onPin}
          title={pinned ? '고정 해제' : '왼쪽 고정'}
        >
          {pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
        </button>
      </div>

      {column.filter === 'select' ? (
        <select
          className="h-6 w-full rounded border bg-background px-1 text-[11px] font-normal"
          value={filterValue}
          onChange={(e) => onFilter(e.target.value)}
        >
          <option value="">전체</option>
          {(column.options ?? []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : column.filter ? (
        <input
          className="h-6 w-full rounded border bg-background px-1.5 text-[11px] font-normal"
          placeholder="검색"
          value={filterValue}
          onChange={(e) => onFilter(e.target.value)}
        />
      ) : (
        <div className="h-6" />
      )}

      <div
        role="separator"
        aria-label={`${column.header} 열 너비 조절`}
        className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/40"
        onPointerDown={startResize}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------

function EditorCell<T>({
  column,
  initial,
  onCommit,
  onCancel,
}: {
  column: GridColumn<T>;
  initial: string;
  onCommit: (value: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  const control = column.edit?.control ?? 'text';

  const shared = {
    autoFocus: true,
    className: 'h-6 w-full rounded border border-primary bg-background px-1.5 text-[13px]',
    value,
    onBlur: () => onCommit(value),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        onCommit(value);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    },
    onClick: (e: React.MouseEvent) => e.stopPropagation(),
  };

  if (control === 'select') {
    return (
      <select
        {...shared}
        onChange={(e) => {
          setValue(e.target.value);
          onCommit(e.target.value);
        }}
      >
        <option value="">—</option>
        {(column.options ?? []).map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      {...shared}
      type={control === 'number' ? 'number' : control === 'date' ? 'date' : 'text'}
      onChange={(e) => setValue(e.target.value)}
    />
  );
}

function toNumber(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}
