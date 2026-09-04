import { jsPDF } from "jspdf";
import { sectionHasContent } from "@/lib/resumeData";

const MARGIN = 48;
const PAGE_WIDTH = 595.28; // A4 in points
const PAGE_HEIGHT = 841.89;
const CLAY = [224, 122, 69];
const INK = [28, 27, 26];
const GREY = [110, 110, 110];

export function generateResumePdf({ profile, sections }) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  let y = MARGIN;

  function ensureSpace(needed) {
    if (y + needed > PAGE_HEIGHT - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
  }

  function heading(text, size = 20, color = INK) {
    ensureSpace(size + 10);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(size);
    doc.setTextColor(...color);
    doc.text(text, MARGIN, y);
    y += size + 8;
  }

  function sectionHeader(text) {
    ensureSpace(28);
    y += 6;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...CLAY);
    doc.text(text.toUpperCase(), MARGIN, y);
    y += 4;
    doc.setDrawColor(...CLAY);
    doc.setLineWidth(1);
    doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
    y += 16;
  }

  function bodyText(text, { bold = false, size = 10, color = INK, indent = 0 } = {}) {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const maxWidth = PAGE_WIDTH - MARGIN * 2 - indent;
    const lines = doc.splitTextToSize(text || "", maxWidth);
    lines.forEach((line) => {
      ensureSpace(size + 4);
      doc.text(line, MARGIN + indent, y);
      y += size + 4;
    });
  }

  function keyValueLine(label, value) {
    if (!String(value || "").trim()) return;
    ensureSpace(14);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    doc.text(`${label}: `, MARGIN, y);
    const labelWidth = doc.getTextWidth(`${label}: `);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GREY);
    doc.text(String(value), MARGIN + labelWidth, y);
    y += 15;
  }

  // ---- Header ----
  heading(profile?.full_name || "Student Name", 22);
  const contact = [profile?.email, profile?.grade ? `Grade ${profile.grade}` : null]
    .filter(Boolean)
    .join("  |  ");
  bodyText(contact, { size: 10, color: GREY });
  y += 6;

  // ---- Each of the 17 sections, in order, header always shown ----
  sections.forEach(({ meta, content, media }) => {
    if (meta.type === "media") {
      sectionHeader(meta.label);
      if (media && media.length > 0) {
        bodyText(
          `${media.length} item${media.length === 1 ? "" : "s"} — captions: ${media
            .map((m) => m.caption)
            .filter(Boolean)
            .join(", ") || "—"}. Full media viewable on the live portfolio.`,
          { size: 9, color: GREY }
        );
      } else {
        bodyText("—", { size: 9, color: GREY });
      }
      y += 8;
      return;
    }

    sectionHeader(meta.label);
    const has = sectionHasContent({ meta, content, media });

    if (!has) {
      bodyText("—", { size: 9, color: GREY });
      y += 8;
      return;
    }

    if (meta.type === "single") {
      meta.fields.forEach((f) => keyValueLine(f.label, content[f.key]));
    }

    if (meta.type === "repeatable") {
      (content.entries || []).forEach((entry, i) => {
        if (i > 0) y += 4;
        const parts = meta.fields.map((f) => entry[f.key]).filter((v) => String(v || "").trim());
        bodyText(`• ${parts.join(" — ")}`, { size: 10 });
        if (entry.attachment_name) {
          bodyText(`Attachment: ${entry.attachment_name}`, { size: 8, color: GREY, indent: 12 });
        }
      });
    }

    if (meta.type === "mixed") {
      meta.fields.forEach((f) => keyValueLine(f.label, content[f.key]));
      meta.repeatableGroups.forEach((group) => {
        const entries = content[group.key] || [];
        if (entries.length === 0) return;
        y += 4;
        bodyText(group.label, { bold: true, size: 10 });
        entries.forEach((entry) => {
          const parts = group.fields.map((f) => entry[f.key]).filter((v) => String(v || "").trim());
          bodyText(`• ${parts.join(" — ")}`, { size: 10, indent: 8 });
        });
      });
    }

    y += 8;
  });

  return doc;
}

export function downloadResumePdf({ profile, sections }) {
  const doc = generateResumePdf({ profile, sections });
  const name = (profile?.full_name || "student").replace(/\s+/g, "_");
  doc.save(`${name}_Resume.pdf`);
}
