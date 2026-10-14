// src/utils/csv.ts
// Parser/serializador CSV genérico, sin dependencias. Soporta comillas, saltos de línea
// dentro de celdas, BOM UTF-8 y delimitador coma o punto y coma (Excel en español).

const BOM = '\uFEFF';
const SUPPORTED_DELIMITERS = [',', ';'] as const;

export type CsvDelimiter = (typeof SUPPORTED_DELIMITERS)[number];

export const DEFAULT_EXPORT_DELIMITER: CsvDelimiter = ';';

const detectDelimiter = (text: string): CsvDelimiter => {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  const counts = SUPPORTED_DELIMITERS.map((delimiter) => firstLine.split(delimiter).length);
  return counts[1] > counts[0] ? ';' : ',';
};

export const parseCsv = (rawText: string): string[][] => {
  const text = rawText.startsWith(BOM) ? rawText.slice(BOM.length) : rawText;
  const delimiter = detectDelimiter(text);
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let insideQuotes = false;

  const finishCell = () => {
    currentRow.push(currentCell);
    currentCell = '';
  };
  const finishRow = () => {
    finishCell();
    rows.push(currentRow);
    currentRow = [];
  };

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (insideQuotes) {
      if (char === '"' && text[index + 1] === '"') {
        currentCell += '"';
        index += 1;
      } else if (char === '"') {
        insideQuotes = false;
      } else {
        currentCell += char;
      }
      continue;
    }

    if (char === '"') insideQuotes = true;
    else if (char === delimiter) finishCell();
    else if (char === '\n') finishRow();
    else if (char !== '\r') currentCell += char;
  }

  if (currentCell !== '' || currentRow.length > 0) finishRow();

  return rows.filter((row) => row.some((cell) => cell.trim() !== ''));
};

const escapeCell = (value: string, delimiter: CsvDelimiter): string => {
  const needsQuotes = value.includes('"') || value.includes('\n') || value.includes('\r') || value.includes(delimiter);
  return needsQuotes ? `"${value.replace(/"/g, '""')}"` : value;
};

export const serializeCsv = (rows: string[][], delimiter: CsvDelimiter = DEFAULT_EXPORT_DELIMITER): string =>
  BOM + rows.map((row) => row.map((cell) => escapeCell(cell, delimiter)).join(delimiter)).join('\r\n');

export const downloadCsvFile = (fileName: string, content: string): void => {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
};
