import type { GridColumn, PasteCell, PasteRow } from './types';

/**
 * Turns a clipboard payload from Excel into validated row patches.
 *
 * Excel puts a tab between cells and a newline between rows, and wraps any
 * cell containing either in double quotes. Rows are matched to the grid by
 * position, starting at the cell the user had selected — the same thing that
 * happens when you paste inside Excel itself.
 */
export function parseClipboard(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];

    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"' && cell === '') {
      quoted = true;
    } else if (ch === '\t') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      // Swallow the \n of a \r\n pair.
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }

  if (cell !== '' || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  // Excel adds a trailing newline; drop the empty row it produces.
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

/**
 * Validates a parsed clipboard block against the grid, cell by cell.
 *
 * Nothing is written yet: the caller shows the result for review and then
 * saves only the rows that came back clean, which is what makes a 500-row
 * paste with three typos in it a usable operation rather than an all-or-
 * nothing gamble.
 */
export function validatePaste<T extends { id: string }>(
  block: string[][],
  targetRows: T[],
  columns: GridColumn<T>[],
  labelOf: (row: T) => string,
): PasteRow[] {
  const editable = columns.filter((c) => c.edit);

  return block.slice(0, targetRows.length).map((rawRow, rowIndex) => {
    const target = targetRows[rowIndex];
    const cells: PasteCell[] = [];

    rawRow.slice(0, editable.length).forEach((raw, colIndex) => {
      const column = editable[colIndex];
      const edit = column.edit!;
      const trimmed = raw.trim();
      const parsed = edit.parse(trimmed, target);
      cells.push({
        columnId: column.id,
        header: column.header,
        field: edit.field,
        raw: trimmed,
        ...(parsed.ok ? { value: parsed.value } : { error: parsed.error }),
      });
    });

    return {
      rowId: target.id,
      label: labelOf(target),
      cells,
      ok: cells.every((c) => !c.error),
    };
  });
}

/** Cells that are safe to write, flattened for the caller's save loop. */
export function acceptedPatches(rows: PasteRow[]) {
  return rows
    .filter((r) => r.ok)
    .flatMap((r) => r.cells.map((c) => ({ rowId: r.rowId, field: c.field, value: c.value })));
}
