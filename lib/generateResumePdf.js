import { jsPDF } from "jspdf";
import { RESUME_SPECIAL_SECTIONS, entryLines, sectionHasContent } from "@/lib/resumeData";
import { attachmentsOf } from "@/lib/uploads";

const MARGIN = 54;
const PAGE_WIDTH = 595.28; // A4 in points
const PAGE_HEIGHT = 841.89;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const INK = [28, 27, 26];
const GREY = [110, 110, 110];
const FAINT = [170, 170, 170];

export function generateResumePdf({ profile, sections, header }) {
  const doc = new jsPDF({ unit: "pt", format: "a4", compress: true });
  let y = MARGIN;

  function ensureSpace(needed) {
    if (y + needed > PAGE_HEIGHT - MARGIN) {
      doc.addPage();
      y = MARGIN;
      return true;
    }
    return false;
  }

  function text(value, { bold = false, size = 10, color = INK, indent = 0, align } = {}) {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(String(value ?? ""), CONTENT_WIDTH - indent);
    lines.forEach((line) => {
      ensureSpace(size + 4);
      if (align === "center") {
        doc.text(line, PAGE_WIDTH / 2, y, { align: "center" });
      } else {
        doc.text(line, MARGIN + indent, y);
      }
      y += size + 3;
    });
  }

  function sectionHeader(label) {
    // Keep a header with at least one line of its content.
    ensureSpace(46);
    y += 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    doc.text(label.toUpperCase(), MARGIN, y);
    y += 5;
    doc.setDrawColor(...INK);
    doc.setLineWidth(0.8);
    doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
    y += 13;
  }

  function keyValueLine(label, value) {
    const v = String(value ?? "").trim();
    if (!v) return;
    ensureSpace(14);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...INK);
    const prefix = `${label}: `;
    doc.text(prefix, MARGIN, y);
    const labelWidth = doc.getTextWidth(prefix);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GREY);
    const lines = doc.splitTextToSize(v, CONTENT_WIDTH - labelWidth);
    doc.text(lines[0], MARGIN + labelWidth, y);
    y += 13;
    lines.slice(1).forEach((line) => {
      ensureSpace(13);
      doc.text(line, MARGIN + labelWidth, y);
      y += 13;
    });
  }

  function bulletEntry(fields, entry, indent = 0) {
    const line = entryLines(fields, entry);
    if (!line.title && !line.detail) return;
    ensureSpace(16);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...INK);
    const bullet = "•  ";
    doc.text(bullet, MARGIN + indent, y);
    const bulletWidth = doc.getTextWidth(bullet);
    const textLeft = MARGIN + indent + bulletWidth;
    const width = PAGE_WIDTH - MARGIN - textLeft;

    const titleLines = doc.splitTextToSize(line.title, width);
    titleLines.forEach((l, i) => {
      if (i > 0) ensureSpace(13);
      doc.text(l, textLeft, y);
      y += 12;
    });

    if (line.detail) {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...GREY);
      doc.splitTextToSize(line.detail, width).forEach((l) => {
        ensureSpace(12);
        doc.text(l, textLeft, y);
        y += 11;
      });
    }

    line.attachments.forEach((a) => {
      ensureSpace(11);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...FAINT);
      const label = `Attached: ${a.name || "file"}`;
      if (a.url) {
        doc.textWithLink(label, textLeft, y, { url: a.url });
      } else {
        doc.text(label, textLeft, y);
      }
      y += 10;
      doc.setFontSize(9.5);
    });

    y += 3;
  }

  function attachmentList(items) {
    (items || []).forEach((a) => {
      ensureSpace(11);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...FAINT);
      const label = `Attached: ${a.name || "file"}`;
      if (a.url) {
        doc.textWithLink(label, MARGIN, y, { url: a.url });
      } else {
        doc.text(label, MARGIN, y);
      }
      y += 11;
    });
  }

  // ---- Letterhead ----
  text(header?.name || profile?.full_name || "Student Name", {
    bold: true,
    size: 20,
    align: "center",
  });
  y += 2;
  (header?.contactLines || []).forEach((line) =>
    text(line, { size: 9.5, color: GREY, align: "center" })
  );
  if (header?.grade) text(header.grade, { size: 8.5, color: FAINT, align: "center" });
  attachmentList(attachmentsOf(sections.find((s) => s.meta.key === "header")?.content));
  y += 4;
  doc.setDrawColor(...INK);
  doc.setLineWidth(1.2);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  y += 6;

  // ---- Objective ----
  const objective = sections.find((s) => s.meta.key === "objective");
  const objectiveText = String(objective?.content?.statement || "").trim();
  sectionHeader("Objective");
  text(objectiveText || "—", {
    size: 9.5,
    color: objectiveText ? INK : FAINT,
  });
  attachmentList(attachmentsOf(objective?.content));

  // ---- Every remaining section, header always shown ----
  sections
    .filter((s) => !RESUME_SPECIAL_SECTIONS.includes(s.meta.key))
    .forEach(({ meta, content, media }) => {
      sectionHeader(meta.label);

      if (meta.type === "media") {
        if (media && media.length > 0) {
          const captions = media.map((m) => m.caption).filter(Boolean);
          text(
            `${media.length} item${media.length === 1 ? "" : "s"}${
              captions.length ? `: ${captions.join(", ")}` : ""
            }. Viewable in the portal.`,
            { size: 9, color: GREY }
          );
        } else {
          text("—", { size: 9, color: FAINT });
        }
        return;
      }

      if (!sectionHasContent({ meta, content, media })) {
        text("—", { size: 9, color: FAINT });
        attachmentList(attachmentsOf(content));
        return;
      }

      if (meta.type === "single") {
        meta.fields.forEach((f) => keyValueLine(f.label, content[f.key]));
      }

      if (meta.type === "repeatable") {
        (content.entries || []).forEach((entry) => bulletEntry(meta.fields, entry));
      }

      if (meta.type === "mixed") {
        meta.fields.forEach((f) => keyValueLine(f.label, content[f.key]));
        meta.repeatableGroups.forEach((group) => {
          const entries = content[group.key] || [];
          if (entries.length === 0) return;
          y += 3;
          text(group.label, { bold: true, size: 9 });
          entries.forEach((entry) => bulletEntry(group.fields, entry, 8));
        });
      }

      attachmentList(attachmentsOf(content));
    });

  // ---- Page numbers ----
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...FAINT);
    doc.text(`${i} / ${pages}`, PAGE_WIDTH / 2, PAGE_HEIGHT - 28, { align: "center" });
  }

  return doc;
}

export function downloadResumePdf(model) {
  const doc = generateResumePdf(model);
  const name = (model.header?.name || model.profile?.full_name || "student")
    .replace(/\s+/g, "_")
    .replace(/[^\w-]/g, "");
  doc.save(`${name || "student"}_Resume.pdf`);
}
