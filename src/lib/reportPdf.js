import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { BRAND } from "../config/brand.js";

/**
 * Generate a PDF of daily reports.
 * @param {Array} reports - mapped report objects {date, work, blockers, userId, at}
 * @param {Array} users - mapped profiles
 * @param {Object} opts - { mode: 'all'|'person', personName, fromDate, toDate }
 */
export function downloadReportsPdf(reports, users, opts = {}) {
  const { mode = "all", personName = "", fromDate = "", toDate = "" } = opts;
  const doc = new jsPDF();

  const title = `${BRAND.name} — Daily Reports`;
  const rangeLabel = fromDate || toDate
    ? `${fromDate || "…"} to ${toDate || "…"}`
    : "All dates";
  const scopeLabel = mode === "person" ? personName : "All members";
  const generatedAt = new Date().toLocaleString();

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(title, 14, 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`${BRAND.legalName}`, 14, 25);
  doc.text(`Scope: ${scopeLabel}   |   Period: ${rangeLabel}`, 14, 31);
  doc.text(`Generated: ${generatedAt}   |   ${reports.length} report(s)`, 14, 37);
  doc.setTextColor(0);

  if (reports.length === 0) {
    doc.setFontSize(12);
    doc.text("No reports found for the selected filters.", 14, 50);
  } else if (mode === "person") {
    // Single table for one person
    autoTable(doc, {
      startY: 43,
      head: [["Date", "Work done", "Blockers"]],
      body: reports.map((r) => [r.date, r.work, r.blockers || "—"]),
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [30, 41, 59] },
      columnStyles: {
        0: { cellWidth: 28 },
        1: { cellWidth: 95 },
        2: { cellWidth: 57 },
      },
    });
  } else {
    // Grouped by person
    const byUser = {};
    reports.forEach((r) => {
      const u = users.find((x) => x.id === r.userId);
      const key = u ? u.name : "Former member";
      (byUser[key] = byUser[key] || []).push(r);
    });
    let first = true;
    Object.keys(byUser).sort().forEach((name) => {
      const rows = byUser[name].sort((a, b) => (a.date < b.date ? 1 : -1));
      if (!first) {
        // section spacing is handled by startY below
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      const y = first ? 43 : doc.lastAutoTable.finalY + 12;
      // page-break guard for section headers
      const safeY = y > 270 ? 20 : y;
      if (safeY === 20) doc.addPage();
      doc.text(name, 14, safeY);
      autoTable(doc, {
        startY: safeY + 4,
        head: [["Date", "Work done", "Blockers"]],
        body: rows.map((r) => [r.date, r.work, r.blockers || "—"]),
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [30, 41, 59] },
        columnStyles: {
          0: { cellWidth: 28 },
          1: { cellWidth: 95 },
          2: { cellWidth: 57 },
        },
      });
      first = false;
    });
  }

  // Footer: page numbers
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(140);
    doc.text(`Page ${i} of ${pages}`, 196, 290, { align: "right" });
  }

  const stamp = new Date().toISOString().slice(0, 10);
  const who = mode === "person" ? personName.toLowerCase().replace(/\s+/g, "-") : "all";
  doc.save(`peace-staff-reports-${who}-${stamp}.pdf`);
}
