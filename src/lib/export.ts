export function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function formatCell(value: unknown) {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

export function downloadCsv(filename: string, rows: Array<Record<string, unknown>>) {
  if (!rows.length) {
    downloadTextFile(filename, '', 'text/csv;charset=utf-8');
    return;
  }
  const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  const csv = [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => formatCell(row[header])).join(',')),
  ].join('\n');
  downloadTextFile(filename, csv, 'text/csv;charset=utf-8');
}

export function downloadWordDocument(filename: string, title: string, bodyHtml: string) {
  const documentHtml = `
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
          h1, h2, h3 { margin-bottom: 8px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; font-size: 12px; }
          .muted { color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>${bodyHtml}</body>
    </html>
  `;
  downloadTextFile(filename, documentHtml, 'application/msword');
}

export function openPrintWindow(title: string, bodyHtml: string) {
  const printWindow = window.open('', '_blank', 'width=960,height=720');
  if (!printWindow) return;
  printWindow.document.write(`
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
          h1, h2, h3 { margin-bottom: 8px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; font-size: 12px; }
          .muted { color: #6b7280; font-size: 12px; }
          @media print { button { display: none; } }
        </style>
      </head>
      <body>${bodyHtml}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}
