'use client';

import { useEffect, useState, type ReactNode } from 'react';
import {
  Bookmark,
  Columns3,
  Download,
  FilterX,
  Loader2,
  Rows3,
  Search,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { exportSheetToXlsx } from '@/lib/actions/grid-export-actions';
import {
  deleteGridView,
  fetchGridViews,
  saveGridView,
} from '@/lib/actions/grid-view-actions';
import { formatValue } from './grid-format';
import type { GridColumn, SavedGridView } from './types';
import type { useGridView } from './use-grid-view';

interface GridToolbarProps<T> {
  gridKey: string;
  title: string;
  view: ReturnType<typeof useGridView<T>>;
  columns: GridColumn<T>[];
  visibleColumns: GridColumn<T>[];
  rowCount: number;
  totalCount: number;
  selectedCount: number;
  sortedRows: T[];
  grandTotals: Map<string, number>;
  exportSubtitle?: string;
  saving: boolean;
  bulkActions: ReactNode;
  extra: ReactNode;
  pasteEnabled: boolean;
}

export function GridToolbar<T>({
  gridKey,
  title,
  view,
  columns,
  visibleColumns,
  rowCount,
  totalCount,
  selectedCount,
  sortedRows,
  grandTotals,
  exportSubtitle,
  saving,
  bulkActions,
  extra,
  pasteEnabled,
}: GridToolbarProps<T>) {
  const { state } = view;
  const [views, setViews] = useState<SavedGridView[]>([]);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchGridViews(gridKey).then((rows) => {
      if (alive) setViews(rows);
    });
    return () => {
      alive = false;
    };
  }, [gridKey]);

  const handleSaveView = async () => {
    const name = window.prompt('이 화면 구성을 어떤 이름으로 저장할까요?');
    if (!name?.trim()) return;
    const saved = await saveGridView({
      gridKey,
      name: name.trim(),
      isShared: false,
      state,
    });
    if (!saved) {
      toast.error('화면 구성을 저장하지 못했습니다.');
      return;
    }
    setViews((prev) => [...prev.filter((v) => v.id !== saved.id), saved]);
    toast.success(`'${saved.name}' 구성을 저장했습니다.`);
  };

  const handleDeleteView = async (id: string, name: string) => {
    if (!(await deleteGridView(id))) {
      toast.error('삭제하지 못했습니다. 다른 사람이 만든 구성일 수 있습니다.');
      return;
    }
    setViews((prev) => prev.filter((v) => v.id !== id));
    toast.success(`'${name}' 구성을 삭제했습니다.`);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const result = await exportSheetToXlsx({
        title,
        subtitle:
          exportSubtitle ??
          `${new Date().toLocaleDateString('ko-KR')} 기준 · ${rowCount.toLocaleString('ko-KR')}건`,
        columns: visibleColumns.map((c) => ({
          header: c.header,
          type: c.type,
          width: state.widths[c.id] ? Math.round(state.widths[c.id] / 8) : undefined,
        })),
        rows: sortedRows.map((row) =>
          visibleColumns.map((c) => {
            const raw = c.value(row);
            if (raw === null || raw === undefined) return null;
            return c.type === 'money' || c.type === 'number' ? Number(raw) : String(raw);
          }),
        ),
        totalRow:
          grandTotals.size > 0
            ? visibleColumns.map((c, i) =>
                i === 0 ? `합계 (${rowCount}건)` : (grandTotals.get(c.id) ?? null),
              )
            : undefined,
      });

      if (!result.ok || !result.data) {
        toast.error(result.error ?? '엑셀 파일을 만들지 못했습니다.');
        return;
      }
      downloadBase64(result.data, result.fileName ?? `${title}.xlsx`);
      toast.success('엑셀 파일을 내려받았습니다.');
    } finally {
      setExporting(false);
    }
  };

  const handleCsv = () => {
    const header = visibleColumns.map((c) => csvCell(c.header)).join(',');
    const body = sortedRows.map((row) =>
      visibleColumns.map((c) => csvCell(formatValue(c, c.value(row)))).join(','),
    );
    const blob = new Blob(['﻿' + [header, ...body].join('\r\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-8 w-56 pl-8 text-sm"
          placeholder="전체 검색"
          value={state.search}
          onChange={(e) => view.setSearch(e.target.value)}
        />
      </div>

      <span className="text-xs text-muted-foreground tabular-nums">
        {rowCount.toLocaleString('ko-KR')}
        {rowCount !== totalCount && ` / ${totalCount.toLocaleString('ko-KR')}`}건
        {selectedCount > 0 && ` · ${selectedCount}건 선택`}
      </span>

      {view.filterCount > 0 && (
        <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={view.clearFilters}>
          <FilterX className="h-3.5 w-3.5" />
          필터 해제
        </Button>
      )}

      {saving && (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          저장 중
        </span>
      )}

      {bulkActions}

      <div className="ml-auto flex items-center gap-2">
        {extra}

        {pasteEnabled && (
          <span className="hidden text-[11px] text-muted-foreground lg:inline">
            엑셀에서 복사 후 Ctrl+V로 붙여넣기
          </span>
        )}

        {/* Column picker */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1 text-xs">
              <Columns3 className="h-3.5 w-3.5" />열
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-96 w-56 overflow-y-auto">
            <DropdownMenuLabel className="text-xs">표시할 열</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {columns.map((column) => (
              <DropdownMenuCheckboxItem
                key={column.id}
                className="text-xs"
                checked={!state.hidden.includes(column.id)}
                onCheckedChange={() => view.toggleColumn(column.id)}
                onSelect={(e) => e.preventDefault()}
              >
                {column.header}
              </DropdownMenuCheckboxItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-xs" onSelect={() => view.reset()}>
              기본 구성으로 되돌리기
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Density */}
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1 text-xs"
          onClick={() => view.setDensity(state.density === 'compact' ? 'comfortable' : 'compact')}
          title="행 높이 전환"
        >
          <Rows3 className="h-3.5 w-3.5" />
          {state.density === 'compact' ? '좁게' : '넓게'}
        </Button>

        {/* Saved views */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1 text-xs">
              <Bookmark className="h-3.5 w-3.5" />
              구성
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel className="text-xs">저장된 화면 구성</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {views.length === 0 ? (
              <p className="px-2 py-3 text-xs text-muted-foreground">
                아직 저장한 구성이 없습니다.
              </p>
            ) : (
              views.map((v) => (
                <div key={v.id} className="flex items-center gap-1 px-1">
                  <button
                    type="button"
                    className="flex-1 truncate rounded px-1.5 py-1.5 text-left text-xs hover:bg-muted"
                    onClick={() => {
                      view.apply(v.state);
                      toast.success(`'${v.name}' 구성을 적용했습니다.`);
                    }}
                  >
                    {v.name}
                    {v.is_shared && <span className="ml-1 text-muted-foreground">· 공유</span>}
                  </button>
                  <button
                    type="button"
                    aria-label={`${v.name} 삭제`}
                    className="rounded p-1 text-muted-foreground hover:text-destructive"
                    onClick={() => void handleDeleteView(v.id, v.name)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-xs" onSelect={() => void handleSaveView()}>
              현재 구성 저장
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Export */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="h-8 gap-1 text-xs" disabled={exporting}>
              {exporting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              내보내기
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem className="text-xs" onSelect={() => void handleExport()}>
              엑셀 (.xlsx) — 서식 포함
            </DropdownMenuItem>
            <DropdownMenuItem className="text-xs" onSelect={handleCsv}>
              CSV
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function csvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function downloadBase64(base64: string, fileName: string): void {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const blob = new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
