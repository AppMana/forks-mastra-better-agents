import * as XLSX from 'xlsx';

const SHEET_ROW_CAP = 500;

export interface SpreadsheetGrid {
  sheetName: string;
  rows: unknown[][];
  truncated: boolean;
  rowCap: number;
}

/** Parse the first worksheet into a row grid, capped for rendering. */
export function parseSpreadsheet(buffer: ArrayBuffer): SpreadsheetGrid {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0] ?? '';
  const sheet = workbook.Sheets[sheetName];
  const rows = sheet ? (XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][]) : [];
  return {
    sheetName,
    rows: rows.slice(0, SHEET_ROW_CAP),
    truncated: rows.length > SHEET_ROW_CAP,
    rowCap: SHEET_ROW_CAP,
  };
}
