/**
 * CSV export helpers (RFC 4180 quoting).
 *
 * Cells that start with =, +, - or @ are prefixed with an apostrophe so a
 * spreadsheet program treats them as text instead of running them as
 * formulas ("CSV injection").
 */

export type CsvCell = string | number | null | undefined;

export function escapeCsvCell(value: CsvCell): string {
  if (value === null || value === undefined) return '';
  let text = String(value);
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  if (/[",\r\n]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function toCsv(header: string[], rows: CsvCell[][]): string {
  return [header, ...rows].map((row) => row.map(escapeCsvCell).join(',')).join('\r\n') + '\r\n';
}

/** Starts a browser download of `content` as a file called `fileName`. */
export function downloadTextFile(fileName: string, content: string, mimeType: string): void {
  // A byte-order mark helps Excel detect UTF-8, so names like "Zoë" display correctly.
  const blob = new Blob(['﻿', content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
