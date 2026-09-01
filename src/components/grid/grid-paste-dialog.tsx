'use client';

import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { acceptedPatches } from './grid-paste';
import type { GridEditPatch, PasteRow } from './types';

/**
 * Review step between a paste and the database.
 *
 * A 500-row paste from a spreadsheet almost always has a few bad cells in it.
 * Rejecting the whole block would send the user back to Excel; accepting it
 * silently would write garbage. So the clean rows go in, the bad rows stay
 * out and are listed with the reason, and the user fixes just those.
 */
export function GridPasteDialog({
  rows,
  onCancel,
  onApply,
  saving,
}: {
  rows: PasteRow[];
  onCancel: () => void;
  onApply: (patches: GridEditPatch[]) => Promise<void> | void;
  saving: boolean;
}) {
  const okRows = rows.filter((r) => r.ok);
  const badRows = rows.filter((r) => !r.ok);
  const patches = acceptedPatches(rows);

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>붙여넣기 검토</DialogTitle>
          <DialogDescription>
            {rows.length}행을 읽었습니다. 저장하기 전에 확인하세요.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-4 text-sm">
          <span className="flex items-center gap-1.5 text-green-700">
            <CheckCircle2 className="h-4 w-4" />
            저장 가능 {okRows.length}행
          </span>
          {badRows.length > 0 && (
            <span className="flex items-center gap-1.5 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              오류 {badRows.length}행 — 저장하지 않습니다
            </span>
          )}
        </div>

        <div className="max-h-80 overflow-auto rounded border">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-muted">
              <tr>
                <th className="px-2 py-1.5 text-left font-semibold">대상</th>
                <th className="px-2 py-1.5 text-left font-semibold">항목</th>
                <th className="px-2 py-1.5 text-left font-semibold">입력값</th>
                <th className="px-2 py-1.5 text-left font-semibold">결과</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) =>
                row.cells.map((cell, i) => (
                  <tr
                    key={`${row.rowId}-${cell.columnId}`}
                    className={cn('border-t', cell.error && 'bg-red-50')}
                  >
                    {i === 0 ? (
                      <td className="px-2 py-1 align-top font-medium" rowSpan={row.cells.length}>
                        {row.label}
                      </td>
                    ) : null}
                    <td className="px-2 py-1 text-muted-foreground">{cell.header}</td>
                    <td className="px-2 py-1 font-mono">{cell.raw || '—'}</td>
                    <td
                      className={cn('px-2 py-1', cell.error ? 'text-destructive' : 'text-green-700')}
                    >
                      {cell.error ?? '확인'}
                    </td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            취소
          </Button>
          <Button onClick={() => void onApply(patches)} disabled={saving || okRows.length === 0}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {okRows.length}행 저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
