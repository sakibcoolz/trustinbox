// CSV export utility — sanitizes fields to prevent CSV injection

export function sanitizeCsvField(value: string): string {
  if (typeof value !== 'string') return String(value ?? '');
  // Prevent CSV injection by prefixing dangerous chars
  if (/^[=+\-@\t\r]/.test(value)) {
    return `'${value}`;
  }
  // Wrap in quotes if contains comma, newline, or quote
  if (/[,"\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildCsvString(headers: string[], rows: string[][]): string {
  const headerLine = headers.map(sanitizeCsvField).join(',');
  const dataLines = rows.map((row) => row.map(sanitizeCsvField).join(','));
  return [headerLine, ...dataLines].join('\n');
}

export function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
