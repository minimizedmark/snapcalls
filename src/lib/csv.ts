type CsvValue = string | number | boolean | null | undefined;

type CsvRow = Record<string, CsvValue>;

function escapeCsvValue(value: CsvValue): string {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  if (/[",\n\r]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

export function toCsv(rows: CsvRow[], headers: string[]): string {
  const headerLine = headers.join(',');
  const dataLines = rows.map((row) => headers.map((header) => escapeCsvValue(row[header])).join(','));
  return [headerLine, ...dataLines].join('\n');
}
