/**
 * Minimal client-side CSV export — builds a CSV string from headers + rows and
 * triggers a browser download via a throwaway object URL. No server round-trip
 * needed since this is a frontend-only app with all data already in memory.
 */
export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const escapeCell = (value: string | number) => {
    const str = String(value);
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };

  const lines = [headers, ...rows].map((row) => row.map(escapeCell).join(","));
  // Leading BOM so Excel opens UTF-8 (e.g. Urdu names) correctly instead of mangling it.
  const csv = "﻿" + lines.join("\r\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
