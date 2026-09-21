// CSV + PDF export utilities.
import { jsPDF } from "jspdf";

function escapeCsv(value) {
  if (value == null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function downloadCSV(filename, rows, headers) {
  // rows: array of objects; headers: optional { key: label } - defaults to object keys
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

// --- PDF export -------------------------------------------------------
// Builds the PDF natively from the report's structured data (summary,
// comparison, markdown content) rather than rasterizing the on-screen
// component: the text stays selectable/searchable and paginates cleanly,
// which a DOM screenshot (html2canvas) cannot do for a report that runs
// past one page.

const TYPE_META = {
  quotidien: { label: "Quotidien", color: [37, 99, 235] },
  hebdomadaire: { label: "Hebdomadaire", color: [124, 58, 237] },
  mensuel: { label: "Mensuel", color: [5, 150, 105] },
};

const INK = [23, 23, 23];
const MUTED = [107, 114, 128];
const RULE = [225, 225, 220];

function pdfEscapeInlineBold(text) {
  // Very small markdown-inline handler: splits on **bold** so the PDF can
  // switch font weight mid-line instead of printing literal asterisks.
  const parts = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0;
  let m;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push({ text: text.slice(last, m.index), bold: false });
    parts.push({ text: m[1], bold: true });
    last = re.lastIndex;
  }
  if (last < text.length) parts.push({ text: text.slice(last), bold: false });
  return parts.length ? parts : [{ text, bold: false }];
}

export function downloadReportPDF(report) {
  if (!report) return;
  const meta = TYPE_META[report.type] || TYPE_META.quotidien;

  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentW = pageW - margin * 2;
  const lineH = 5.2;
  let y = margin;
  let page = 1;

  const addFooter = () => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text("GESCOP — généré automatiquement", margin, pageH - 10);
    doc.text(String(page), pageW - margin, pageH - 10, { align: "right" });
  };

  const newPage = () => {
    addFooter();
    doc.addPage();
    page += 1;
    y = margin;
  };

  const ensureSpace = (needed) => {
    if (y + needed > pageH - margin - 6) newPage();
  };

  const writeWrapped = (text, { size = 10, bold = false, color = INK, indent = 0, gapAfter = 3.2 } = {}) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, contentW - indent);
    lines.forEach((line) => {
      ensureSpace(lineH);
      doc.text(line, margin + indent, y);
      y += lineH;
    });
    y += gapAfter;
  };

  // Writes one markdown-content line with inline **bold** segments,
  // wrapping word-by-word so bold/normal runs can share a line.
  const writeInlineWrapped = (text, { size = 10, color = INK, indent = 0 } = {}) => {
    doc.setFontSize(size);
    const segments = pdfEscapeInlineBold(text);
    let cursorX = margin + indent;
    const maxX = margin + contentW;
    ensureSpace(lineH);
    segments.forEach((seg) => {
      doc.setFont("helvetica", seg.bold ? "bold" : "normal");
      doc.setTextColor(...color);
      const words = seg.text.split(/(\s+)/);
      words.forEach((word) => {
        if (!word) return;
        const w = doc.getTextWidth(word);
        if (cursorX + w > maxX && word.trim()) {
          y += lineH;
          ensureSpace(lineH);
          cursorX = margin + indent;
          if (/^\s+$/.test(word)) return;
        }
        doc.text(word, cursorX, y);
        cursorX += w;
      });
    });
    y += lineH + 2;
  };

  // --- Header ---
  doc.setFillColor(...meta.color);
  doc.rect(0, 0, pageW, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...INK);
  doc.text("GESCOP", margin, y + 4);
  doc.setFontSize(10);
  doc.setTextColor(...meta.color);
  doc.text(`Rapport ${meta.label}`, pageW - margin, y + 4, { align: "right" });
  y += 10;
  doc.setDrawColor(...RULE);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...INK);
  doc.text(report.period || "", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  const generated = report.created_date ? new Date(report.created_date).toLocaleString("fr-CA") : "";
  doc.text(`Généré le ${generated}`, margin, y);
  y += 9;

  // --- Executive summary ---
  if (report.summary) {
    const boxLines = doc.splitTextToSize(report.summary, contentW - 8);
    const boxH = boxLines.length * lineH + 10;
    ensureSpace(boxH);
    doc.setFillColor(246, 250, 248);
    doc.setDrawColor(...meta.color);
    doc.roundedRect(margin, y, contentW, boxH, 2, 2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...meta.color);
    doc.text("RÉSUMÉ EXÉCUTIF", margin + 4, y + 6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    let by = y + 12;
    boxLines.forEach((line) => { doc.text(line, margin + 4, by); by += lineH; });
    y += boxH + 8;
  }

  // --- Comparison table ---
  if (report.comparison?.metrics?.length) {
    ensureSpace(10);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...INK);
    doc.text(`Comparaison : ${report.comparison.currentLabel} vs ${report.comparison.previousLabel}`, margin, y);
    y += 7;

    const cols = [
      { label: "Indicateur", w: contentW * 0.34 },
      { label: report.comparison.currentLabel, w: contentW * 0.22 },
      { label: report.comparison.previousLabel, w: contentW * 0.22 },
      { label: "Variation", w: contentW * 0.22 },
    ];
    ensureSpace(8);
    let x = margin;
    doc.setFillColor(245, 245, 243);
    doc.rect(margin, y - 4.5, contentW, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    cols.forEach((c) => { doc.text(c.label, x + 2, y, { maxWidth: c.w - 3 }); x += c.w; });
    y += 5;
    doc.setDrawColor(...RULE);
    doc.line(margin, y, margin + contentW, y);
    y += 3.5;

    report.comparison.metrics.forEach((m) => {
      ensureSpace(6.5);
      x = margin;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...INK);
      doc.text(m.label, x + 2, y, { maxWidth: cols[0].w - 3 });
      x += cols[0].w;
      doc.text(m.current != null ? `${m.current}${m.unit}` : "-", x + 2, y, { maxWidth: cols[1].w - 3 });
      x += cols[1].w;
      doc.text(m.previous != null ? `${m.previous}${m.unit}` : "-", x + 2, y, { maxWidth: cols[2].w - 3 });
      x += cols[2].w;
      if (m.trend === "non-mesurable") {
        doc.setTextColor(...MUTED);
        doc.text("non mesurable", x + 2, y, { maxWidth: cols[3].w - 3 });
      } else {
        const good = m.trend === "up";
        doc.setTextColor(...(good ? [5, 150, 105] : m.trend === "down" ? [185, 28, 28] : MUTED));
        // "helvetica" (WinAnsi) n'a pas les flèches Unicode ↑/↓ — elles se
        // rendaient en caractères cassés dans le PDF. Le signe +/- porte déjà
        // la même information, donc on la retire plutôt que de la remplacer
        // par un glyphe tout aussi risqué.
        const sign = m.delta > 0 ? "+" : "";
        doc.text(`${sign}${m.delta}${m.unit} (${m.deltaPct}%)`, x + 2, y, { maxWidth: cols[3].w - 3 });
      }
      y += 6.5;
    });
    y += 3;
    doc.setDrawColor(...RULE);
    doc.line(margin, y, margin + contentW, y);
    y += 8;

    if (report.comparison.evolutionSummary) {
      writeWrapped(report.comparison.evolutionSummary, { size: 9.5, color: MUTED, gapAfter: 4 });
    }
    if (report.comparison.keyInsights?.length) {
      report.comparison.keyInsights.forEach((insight) => {
        writeInlineWrapped(`•  ${insight}`, { size: 9.5, indent: 1 });
      });
      y += 3;
    }
  }

  // --- Body content (markdown) ---
  const lines = String(report.content || "").split("\n");
  lines.forEach((raw) => {
    const line = raw.trimEnd();
    if (!line.trim()) { y += 2.5; return; }
    if (/^######\s+/.test(line)) return writeInlineWrapped(line.replace(/^######\s+/, ""), { size: 9.5 });
    if (/^#####\s+/.test(line)) return writeInlineWrapped(line.replace(/^#####\s+/, ""), { size: 10 });
    if (/^####\s+/.test(line)) { ensureSpace(9); return writeWrapped(line.replace(/^####\s+/, ""), { size: 11, bold: true, gapAfter: 2 }); }
    if (/^###\s+/.test(line)) { ensureSpace(9); return writeWrapped(line.replace(/^###\s+/, ""), { size: 12, bold: true, gapAfter: 2.5 }); }
    if (/^##\s+/.test(line)) { ensureSpace(10); y += 2; return writeWrapped(line.replace(/^##\s+/, ""), { size: 13, bold: true, color: meta.color, gapAfter: 3 }); }
    if (/^#\s+/.test(line)) { ensureSpace(11); y += 2; return writeWrapped(line.replace(/^#\s+/, ""), { size: 15, bold: true, color: meta.color, gapAfter: 3.5 }); }
    if (/^(---|\*\*\*|___)\s*$/.test(line)) {
      ensureSpace(6);
      doc.setDrawColor(...RULE);
      doc.line(margin, y, margin + contentW, y);
      y += 5;
      return;
    }
    const bulletMatch = line.match(/^(\s*)[-*]\s+(.*)$/);
    if (bulletMatch) {
      const depth = Math.min(2, Math.floor(bulletMatch[1].length / 2));
      return writeInlineWrapped(`•  ${bulletMatch[2]}`, { size: 10, indent: 4 + depth * 4 });
    }
    const numberedMatch = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
    if (numberedMatch) {
      return writeInlineWrapped(`${numberedMatch[2]}.  ${numberedMatch[3]}`, { size: 10, indent: 4 });
    }
    const quoteMatch = line.match(/^>\s?(.*)$/);
    if (quoteMatch) {
      return writeInlineWrapped(quoteMatch[1], { size: 9.5, color: MUTED, indent: 4 });
    }
    writeInlineWrapped(line, { size: 10 });
  });

  addFooter();

  const safePeriod = (report.period || "rapport").replace(/[^a-zA-Z0-9]/g, "_");
  doc.save(`GESCOP_Rapport_${safePeriod}.pdf`);
}