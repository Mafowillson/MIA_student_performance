import ExcelJS from 'exceljs';

// Reads the first worksheet of an uploaded .xlsx file and returns the same
// "array of string-cell rows" shape parseCsv() produces, so callers can
// treat a parsed .xlsx and a parsed .csv identically. Blank rows (every
// cell empty) are dropped, matching parseCsv's behavior.
export async function parseXlsx(arrayBuffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const rows = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const cells = [];
    row.eachCell({ includeEmpty: true }, (cell) => {
      const value = cell.value;
      cells[cell.col - 1] = value == null ? '' : String(value.text ?? value.result ?? value);
    });
    rows.push(cells.map((c) => c ?? ''));
  });

  return rows.filter((r) => r.some((cell) => String(cell).trim() !== ''));
}
