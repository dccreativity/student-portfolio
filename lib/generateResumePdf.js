import { jsPDF } from "jspdf";
import {
  LETTERHEAD_SECTIONS,
  buildLetterhead,
  buildSectionBlocks,
  headingRuns,
} from "@/lib/resumeLayout";

// Geometry lifted from the reference consulting resume:
// US Letter, half-inch margins, Times throughout, 10pt body.
const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 36;
const RIGHT = PAGE_W - MARGIN;
const WIDTH = PAGE_W - MARGIN * 2;

const NAME_SIZE = 18;
const HEAD_SIZE = 11;
const BODY_SIZE = 10;
const SMALL_SIZE = 8.5;

const BULLET_X = MARGIN + 18; // the • glyph
const TEXT_X = MARGIN + 37; // bullet text, and where wrapped lines line up

const LINE = 11.5; // wrapped-line advance
const BULLET_GAP = 12; // between bullets
const ENTRY_GAP = 15.5; // between entries in a section
const SECTION_GAP = 16.5; // above a section header
const AFTER_HEAD = 14.5; // header rule to first entry

const INK = [0, 0, 0];
const GREY = [105, 105, 105];
const LINK = [10, 45, 160];

export function generateResumePdf({ profile, sections }) {
  const doc = new jsPDF({ unit: "pt", format: "letter", compress: true });
  let y = 0;

  const font = (style = "normal", size = BODY_SIZE, color = INK) => {
    doc.setFont("times", style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
  };

  function newPage() {
    doc.addPage();
    y = MARGIN + 10;
  }

  function need(space) {
    if (y + space > PAGE_H - MARGIN) newPage();
  }

  // An entry heading stranded at the foot of a page, with its bullets
  // overleaf, reads as a mistake. Reserve the heading plus two body
  // lines — counting bullets isn't enough, since one bullet routinely
  // wraps onto a second line.
  function needEntry(bulletCount) {
    need(BODY_SIZE + 3 + (bulletCount > 0 ? 2 * BULLET_GAP : 0));
  }

  function centered(text, { style = "normal", size = BODY_SIZE, color = INK } = {}) {
    font(style, size, color);
    doc.splitTextToSize(text, WIDTH).forEach((line) => {
      need(size + 3);
      doc.text(line, PAGE_W / 2, y, { align: "center" });
      y += size + 3;
    });
  }

  // Draws a sequence of {text, style} runs on one line, then a
  // right-aligned string on the same baseline.
  function runsWithRight(runs, right, { x = MARGIN, size = BODY_SIZE } = {}) {
    font("normal", size);
    const rightW = right ? doc.getTextWidth(right) : 0;
    const limit = RIGHT - (rightW ? rightW + 10 : 0);

    need(size + 4);
    let cursorX = x;
    runs.forEach((run) => {
      font(run.style, size);
      // Wrap run-by-run so a long organisation name still breaks cleanly.
      const words = run.text.split(/(\s+)/);
      words.forEach((word) => {
        if (!word) return;
        const w = doc.getTextWidth(word);
        if (cursorX + w > limit && cursorX > x) {
          y += LINE;
          need(size + 4);
          cursorX = x;
          if (/^\s+$/.test(word)) return;
        }
        doc.text(word, cursorX, y);
        cursorX += w;
      });
    });

    if (right) {
      font("normal", size);
      doc.text(right, RIGHT, y, { align: "right" });
    }
    y += size + 3;
  }

  // A bullet with a hanging indent: wrapped lines align under the text,
  // not under the • glyph.
  function bullet(b) {
    const size = BODY_SIZE;
    font("normal", size);
    const rightW = b.right ? doc.getTextWidth(b.right) : 0;
    const limit = RIGHT - (rightW ? rightW + 10 : 0);
    const avail = limit - TEXT_X;

    need(size + 5);
    font("normal", size);
    doc.text("•", BULLET_X, y);

    let cursorX = TEXT_X;
    const firstBaseline = y;

    const write = (text, style, color = INK, url = null) => {
      font(style, size, color);
      text.split(/(\s+)/).forEach((word) => {
        if (!word) return;
        const w = doc.getTextWidth(word);
        if (cursorX + w > limit && cursorX > TEXT_X) {
          y += LINE;
          need(size + 4);
          cursorX = TEXT_X;
          if (/^\s+$/.test(word)) return;
        }
        if (url) doc.textWithLink(word, cursorX, y, { url });
        else doc.text(word, cursorX, y);
        cursorX += w;
      });
    };

    if (b.label) write(`${b.label}: `, "italic");
    if (b.text) write(b.text, "normal", b.url ? LINK : INK, b.url || null);

    if (b.right) {
      font("normal", size);
      doc.text(b.right, RIGHT, firstBaseline, { align: "right" });
    }
    y += size + 2;
  }

  function attachmentLine(a) {
    need(SMALL_SIZE + 4);
    font("italic", SMALL_SIZE, GREY);
    const label = `Attached: ${a.text}`;
    if (a.url) doc.textWithLink(label, TEXT_X, y, { url: a.url });
    else doc.text(label, TEXT_X, y);
    y += SMALL_SIZE + 3;
  }

  function sectionHeader(label) {
    // Keep a header with at least its first line of content.
    need(AFTER_HEAD + 26);
    y += SECTION_GAP;
    font("bold", HEAD_SIZE);
    doc.text(label.toUpperCase(), MARGIN, y);
    // The reference's double rule under every section header.
    doc.setDrawColor(...INK);
    doc.setLineWidth(0.7);
    doc.line(MARGIN, y + 3.2, RIGHT, y + 3.2);
    doc.line(MARGIN, y + 5.4, RIGHT, y + 5.4);
    y += AFTER_HEAD;
  }

  // ---------------- Letterhead ----------------
  y = MARGIN + 22;
  const headerSection = sections.find((s) => s.meta.key === "header");
  const letterhead = buildLetterhead(profile, headerSection?.content);

  centered(letterhead.name, { style: "bold", size: NAME_SIZE });
  y += 1;

  letterhead.lines.forEach((line) => {
    if (line.label) {
      // "Address:" in bold, the value in regular, centred as one line.
      font("bold", BODY_SIZE);
      const labelW = doc.getTextWidth(`${line.label} `);
      font("normal", BODY_SIZE);
      const valueW = doc.getTextWidth(line.text);
      const startX = PAGE_W / 2 - (labelW + valueW) / 2;
      need(BODY_SIZE + 3);
      font("bold", BODY_SIZE);
      doc.text(`${line.label} `, startX, y);
      font("normal", BODY_SIZE);
      doc.text(line.text, startX + labelW, y);
      y += BODY_SIZE + 3;
      return;
    }
    if (line.email) {
      // Email rendered as a link, the rest plain — as in the reference.
      font("normal", BODY_SIZE);
      const full = line.text;
      const totalW = doc.getTextWidth(full);
      const startX = PAGE_W / 2 - totalW / 2;
      const emailW = doc.getTextWidth(line.email);
      need(BODY_SIZE + 3);
      font("normal", BODY_SIZE, LINK);
      doc.textWithLink(line.email, startX, y, { url: `mailto:${line.email}` });
      doc.setDrawColor(...LINK);
      doc.setLineWidth(0.5);
      doc.line(startX, y + 1.2, startX + emailW, y + 1.2);
      font("normal", BODY_SIZE, INK);
      doc.text(full.slice(line.email.length), startX + emailW, y);
      y += BODY_SIZE + 3;
      return;
    }
    centered(line.text);
  });

  y += 4;

  // ---------------- Sections ----------------
  sections
    .filter((s) => !LETTERHEAD_SECTIONS.includes(s.meta.key))
    .forEach((section) => {
      sectionHeader(section.meta.label);
      const blocks = buildSectionBlocks(section);

      if (blocks.length === 0) {
        // Every header is always shown; the space beneath fills in as the
        // student adds entries.
        font("italic", SMALL_SIZE, GREY);
        need(SMALL_SIZE + 4);
        doc.text("To be added.", MARGIN, y);
        y += SMALL_SIZE + 4;
        return;
      }

      blocks.forEach((block, i) => {
        if (block.type === "entry") {
          if (i > 0) y += ENTRY_GAP - BULLET_GAP;
          needEntry(block.bullets.length);
          runsWithRight(headingRuns(block), block.right);
          block.bullets.forEach((b) =>
            b.type === "attachment" ? attachmentLine(b) : bullet(b)
          );
        } else if (block.type === "paragraph") {
          font("normal", BODY_SIZE);
          doc.splitTextToSize(block.text, WIDTH).forEach((line) => {
            need(BODY_SIZE + 4);
            doc.text(line, MARGIN, y);
            y += LINE;
          });
        } else if (block.type === "labelled") {
          font("bold", BODY_SIZE);
          const labelW = doc.getTextWidth(`${block.label} `);
          need(BODY_SIZE + 4);
          doc.text(`${block.label} `, MARGIN, y);
          font("normal", BODY_SIZE);
          const lines = doc.splitTextToSize(block.text, WIDTH - labelW);
          doc.text(lines[0] || "", MARGIN + labelW, y);
          y += LINE;
          lines.slice(1).forEach((line) => {
            need(BODY_SIZE + 4);
            doc.text(line, MARGIN, y);
            y += LINE;
          });
        } else if (block.type === "attachment") {
          attachmentLine(block);
        } else {
          bullet(block);
        }
      });
    });

  // ---------------- Page numbers ----------------
  const pages = doc.getNumberOfPages();
  if (pages > 1) {
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      font("normal", SMALL_SIZE, GREY);
      doc.text(`${i} of ${pages}`, PAGE_W / 2, PAGE_H - 22, { align: "center" });
    }
  }

  return doc;
}

export function downloadResumePdf(model) {
  const doc = generateResumePdf(model);
  const headerSection = model.sections.find((s) => s.meta.key === "header");
  const name =
    buildLetterhead(model.profile, headerSection?.content).name || "student";
  doc.save(`${name.replace(/\s+/g, "_").replace(/[^\w-]/g, "") || "student"}_Resume.pdf`);
}
