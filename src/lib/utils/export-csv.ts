/**
 * Generate a CSV string from an array of objects and trigger a download.
 * Handles proper escaping of commas, quotes, and newlines.
 */
export function downloadCSV(
  data: Record<string, string | number | boolean | null | undefined>[],
  filename: string,
  columns?: { key: string; label: string }[]
) {
  if (data.length === 0) return;

  const cols = columns || Object.keys(data[0]).map((key) => ({ key, label: key }));

  const escapeCell = (value: unknown): string => {
    const str = value == null ? '' : String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const header = cols.map((c) => escapeCell(c.label)).join(',');
  const rows = data.map((row) =>
    cols.map((c) => escapeCell(row[c.key])).join(',')
  );
  const csv = [header, ...rows].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
