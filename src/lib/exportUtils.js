// CSV export utility — generates and downloads a CSV file from an array of objects.

function escapeCsv(value) {
  if (value == null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function downloadCSV(filename, rows, headers) {
  // rows: array of objects; headers: optional { key: label } — defaults to object keys
  if (!rows || rows.length === 0) return;

  const keys = headers ? Object.keys(headers) : Object.keys(rows[0]);
  const labels = headers ? Object.values(headers) : keys;

  const csvLines = [
    labels.map(escapeCsv).join(","),
    ...rows.map((row) =>
      keys.map((k) => escapeCsv(row[k])).join(",")
    ),
  ];

  const csv = "\uFEFF" + csvLines.join("\n"); // BOM for Excel UTF-8
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