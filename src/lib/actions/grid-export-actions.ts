'use server';

/**
 * Server-side workbook generation for the grid's 엑셀 내보내기.
 *
 * The sheet is built on the server rather than in the browser so that a
 * printed 대장 keeps real spreadsheet formatting — frozen header, column
 * widths, number formats, a bold total row — instead of the flat CSV that a
 * client-side export can produce. The caller receives base64 and triggers the
 * download.
 */
import ExcelJS from 'exceljs';
import { getSession } from '@/lib/auth/session';

export interface ExportColumn {
  header: string;
  /** 'money' and 'number' get a thousands format and right alignment. */
  type?: 'text' | 'number' | 'money' | 'date';
  width?: number;
}

export interface ExportSheet {
  /** Sheet name and the workbook's document title. */
  title: string;
  /** Line under the title: period, filters applied, who exported it. */
  subtitle?: string;
  columns: ExportColumn[];
  /** Cell values in column order. `null` renders as an empty cell. */
  rows: (string | number | null)[][];
  /** Rendered bold with a top rule, e.g. a 합계 line. */
  totalRow?: (string | number | null)[];
}

export interface ExportResult {
  ok: boolean;
  fileName?: string;
  /** base64-encoded .xlsx */
  data?: string;
  error?: string;
}

const MAX_ROWS = 50_000;

export async function exportSheetToXlsx(sheet: ExportSheet): Promise<ExportResult> {
  try {
    if (process.env.AUTH_MODE === 'db') {
      const session = await getSession();
      if (!session) return { ok: false, error: '로그인이 필요합니다.' };
    }
    if (sheet.rows.length > MAX_ROWS) {
      return { ok: false, error: `한 번에 내보낼 수 있는 행은 ${MAX_ROWS.toLocaleString('ko-KR')}건까지입니다.` };
    }

    const wb = new ExcelJS.Workbook();
    wb.created = new Date();
    const ws = wb.addWorksheet(safeSheetName(sheet.title));

    const columnCount = sheet.columns.length;

    // --- Title block -------------------------------------------------------
    ws.mergeCells(1, 1, 1, Math.max(1, columnCount));
    const titleCell = ws.getCell(1, 1);
    titleCell.value = sheet.title;
    titleCell.font = { size: 14, bold: true };
    titleCell.alignment = { vertical: 'middle' };
    ws.getRow(1).height = 24;

    ws.mergeCells(2, 1, 2, Math.max(1, columnCount));
    const subtitleCell = ws.getCell(2, 1);
    subtitleCell.value = sheet.subtitle ?? '';
    subtitleCell.font = { size: 9, color: { argb: 'FF6B7A85' } };

    // --- Header ------------------------------------------------------------
    const headerRowIndex = 4;
    const headerRow = ws.getRow(headerRowIndex);
    sheet.columns.forEach((col, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = col.header;
      cell.font = { bold: true, size: 10 };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F4F7' } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCBD5DD' } },
        bottom: { style: 'thin', color: { argb: 'FF9AA9B4' } },
        left: { style: 'thin', color: { argb: 'FFE3E9EE' } },
        right: { style: 'thin', color: { argb: 'FFE3E9EE' } },
      };
      ws.getColumn(i + 1).width = col.width ?? widthFor(col);
    });
    headerRow.height = 20;
    headerRow.commit();

    // --- Body --------------------------------------------------------------
    sheet.rows.forEach((values, r) => {
      const row = ws.getRow(headerRowIndex + 1 + r);
      values.forEach((value, i) => {
        const col = sheet.columns[i];
        const cell = row.getCell(i + 1);
        cell.value = value ?? null;
        cell.font = { size: 10 };
        applyFormat(cell, col);
        cell.border = {
          bottom: { style: 'hair', color: { argb: 'FFE3E9EE' } },
        };
      });
      row.commit();
    });

    // --- Total -------------------------------------------------------------
    if (sheet.totalRow) {
      const row = ws.getRow(headerRowIndex + 1 + sheet.rows.length);
      sheet.totalRow.forEach((value, i) => {
        const col = sheet.columns[i];
        const cell = row.getCell(i + 1);
        cell.value = value ?? null;
        cell.font = { size: 10, bold: true };
        applyFormat(cell, col);
        cell.border = { top: { style: 'thin', color: { argb: 'FF9AA9B4' } } };
      });
      row.commit();
    }

    // Header stays put while scrolling, and the sheet opens filter-ready.
    ws.views = [{ state: 'frozen', ySplit: headerRowIndex }];
    ws.autoFilter = {
      from: { row: headerRowIndex, column: 1 },
      to: { row: headerRowIndex + sheet.rows.length, column: Math.max(1, columnCount) },
    };

    const buffer = await wb.xlsx.writeBuffer();
    return {
      ok: true,
      fileName: `${sheet.title}.xlsx`,
      data: Buffer.from(buffer).toString('base64'),
    };
  } catch (err) {
    console.error('exportSheetToXlsx failed:', err);
    return { ok: false, error: '엑셀 파일을 만들지 못했습니다.' };
  }
}

function applyFormat(cell: ExcelJS.Cell, col: ExportColumn | undefined): void {
  if (!col) return;
  if (col.type === 'money' || col.type === 'number') {
    cell.numFmt = '#,##0';
    cell.alignment = { horizontal: 'right' };
  } else if (col.type === 'date') {
    cell.alignment = { horizontal: 'center' };
  }
}

function widthFor(col: ExportColumn): number {
  if (col.type === 'money' || col.type === 'number') return 14;
  if (col.type === 'date') return 13;
  return Math.max(10, Math.min(32, col.header.length * 2 + 6));
}

/** Excel rejects : \ / ? * [ ] in sheet names and caps them at 31 chars. */
function safeSheetName(name: string): string {
  return name.replace(/[:\\/?*[\]]/g, ' ').slice(0, 31) || 'Sheet1';
}
