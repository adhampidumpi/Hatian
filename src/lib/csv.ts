/**
 * RFC 4180 CSV. Text that a spreadsheet would treat as a formula (starting
 * with = + - @ or a tab) is prefixed with ' so opening the file can't run it.
 */
export function toCsv(rows: (string | number)[][]): string {
  return rows.map((row) => row.map(cell).join(",")).join("\r\n") + "\r\n";
}

function cell(value: string | number): string {
  if (typeof value === "number") return String(value);
  const safe = /^[=+\-@\t]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}
