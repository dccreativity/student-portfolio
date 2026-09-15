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

const GALLERY_COLS = 3;
const GALLERY_GAP = 10;
const GALLERY_IMG_H = 66;
const GALLERY_CAP_H = 22;

const INK = [0, 0, 0];
const GREY = [105, 105, 105];
const LINK = [10, 45, 160];

export function generateResumePdf({ profile, sections, images = new Map() }) {
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
  function entryReserve(bulletCount) {
    return BODY_SIZE + 3 + (bulletCount > 0 ? 2 * BULLET_GAP : 0);
  }

  function needEntry(bulletCount) {
    need(entryReserve(bulletCount));
  }

  // How much of a block has to fit on the page for its section header to
  // be allowed to start here. Deliberately an under-estimate of the whole
  // block: the point is that a header is never the last thing on a page,
  // not that a block never splits.
  function blockReserve(block) {
    if (!block) return SMALL_SIZE + 4; // "To be added."
    if (block.type === "entry") return entryReserve(block.bullets.length);
    if (block.type === "gallery") return GALLERY_IMG_H + GALLERY_CAP_H + 6;
    if (block.type === "attachment") return SMALL_SIZE + 4;
    return LINE * 2;
  }

  // Splits a word that is wider than the space it has into pieces that
  // fit. Without this a single long token — an unbroken address, a URL —
  // is drawn past the right margin instead of wrapping.
  function fit(word, width) {
    if (width <= 0 || doc.getTextWidth(word) <= width) return [word];
    return doc.splitTextToSize(word, width);
  }

  function centered(text, { style = "normal", size = BODY_SIZE, color = INK } = {}) {
    font(style, size, color);
    doc.splitTextToSize(text, WIDTH).forEach((line) => {
      need(size + 3);
      doc.text(line, PAGE_W / 2, y, { align: "center" });
      y += size + 3;
    });
  }

  // Flows {text, style, color, url, underline} runs into lines no wider
  // than the text column, then centres each line.
  //
  // The letterhead previously centred a mixed-style line by measuring the
  // whole thing and starting it at (pageCentre - totalWidth / 2). For an
  // address longer than the page that start point is negative, so the
  // line was drawn off the left edge and ran past the right one. Wrapping
  // first and centring each resulting line is what fixes that.
  function centeredRuns(runs, size = BODY_SIZE) {
    const tokens = [];
    runs.forEach((run) => {
      font(run.style || "normal", size);
      run.text.split(/(\s+)/).forEach((word) => {
        if (!word) return;
        fit(word, WIDTH).forEach((piece) => tokens.push({ ...run, text: piece }));
      });
    });

    const lines = [[]];
    let lineW = 0;
    tokens.forEach((token) => {
      font(token.style || "normal", size);
      const w = doc.getTextWidth(token.text);
      if (lineW + w > WIDTH && lineW > 0) {
        if (/^\s+$/.test(token.text)) return; // no line starts with a space
        lines.push([]);
        lineW = 0;
      }
      lines[lines.length - 1].push({ ...token, w });
      lineW += w;
    });

    lines.forEach((line) => {
      if (line.length === 0) return;
      const total = line.reduce((sum, token) => sum + token.w, 0);
      let x = PAGE_W / 2 - total / 2;
      need(size + 3);
      line.forEach((token) => {
        font(token.style || "normal", size, token.color || INK);
        if (token.url) doc.textWithLink(token.text, x, y, { url: token.url });
        else doc.text(token.text, x, y);
        if (token.underline && token.text.trim()) {
          doc.setDrawColor(...(token.color || INK));
          doc.setLineWidth(0.5);
          doc.line(x, y + 1.2, x + token.w, y + 1.2);
        }
        x += token.w;
      });
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
        fit(word, limit - x).forEach((piece) => {
          const w = doc.getTextWidth(piece);
          if (cursorX + w > limit && cursorX > x) {
            y += LINE;
            need(size + 4);
            cursorX = x;
            if (/^\s+$/.test(piece)) return;
          }
          doc.text(piece, cursorX, y);
          cursorX += w;
        });
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
        fit(word, avail).forEach((piece) => {
          const w = doc.getTextWidth(piece);
          if (cursorX + w > limit && cursorX > TEXT_X) {
            y += LINE;
            need(size + 4);
            cursorX = TEXT_X;
            if (/^\s+$/.test(piece)) return;
          }
          if (url) doc.textWithLink(piece, cursorX, y, { url });
          else doc.text(piece, cursorX, y);
          cursorX += w;
        });
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

  // The picture gallery as a grid of at most three columns, each image
  // with its caption beneath it. `images` holds the pre-loaded bitmaps —
  // jsPDF cannot fetch anything itself, so they are resolved before this
  // function runs (see downloadResumePdf).
  function gallery(items) {
    const COLS = GALLERY_COLS;
    const GAP = GALLERY_GAP;
    const cellW = (WIDTH - GAP * (COLS - 1)) / COLS;
    const imgH = GALLERY_IMG_H;
    const capH = GALLERY_CAP_H;

    for (let i = 0; i < items.length; i += COLS) {
      const row = items.slice(i, i + COLS);
      need(imgH + capH + 6);
      const top = y;

      row.forEach((item, c) => {
        const x = MARGIN + c * (cellW + GAP);
        const loaded = images.get(item.url);

        if (loaded) {
          // Fit the photograph inside the cell without distorting it, and
          // align it left so it sits flush with its own caption.
          const scale = Math.min(cellW / loaded.width, imgH / loaded.height);
          const w = loaded.width * scale;
          const h = loaded.height * scale;
          try {
            doc.addImage(loaded.dataUrl, loaded.format, x, top, w, h);
          } catch {
            // A bitmap jsPDF cannot decode should not lose the caption.
          }
        } else {
          doc.setDrawColor(200);
          doc.setLineWidth(0.5);
          doc.rect(x, top, cellW, imgH);
        }

        font("normal", 7.5, GREY);
        const caption = doc.splitTextToSize(item.caption || "", cellW).slice(0, 2);
        caption.forEach((line, li) => {
          doc.text(line, x, top + imgH + 8 + li * 8);
        });
      });

      y = top + imgH + capH;
    }
    y += 2;
  }

  function attachmentLine(a) {
    font("italic", SMALL_SIZE, GREY);
    doc.splitTextToSize(`Attached: ${a.text}`, RIGHT - TEXT_X).forEach((line) => {
      need(SMALL_SIZE + 4);
      if (a.url) doc.textWithLink(line, TEXT_X, y, { url: a.url });
      else doc.text(line, TEXT_X, y);
      y += SMALL_SIZE + 3;
    });
  }

  // `reserve` is how much of the section's first block must also fit.
  // The old check ran before the SECTION_GAP was added and reserved a
  // flat 26pt, which was not enough to hold an entry heading and its
  // bullets — so a header could be printed as the last thing on a page
  // with its content overleaf.
  function sectionHeader(label, reserve = 0) {
    if (y + SECTION_GAP + HEAD_SIZE + AFTER_HEAD + reserve > PAGE_H - MARGIN) {
      newPage();
    }
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
      // "Address:" in bold, the value in regular. Wrapped and centred
      // line by line, so an address longer than the page stays inside
      // the margins instead of running off both edges.
      centeredRuns([
        { text: `${line.label} `, style: "bold" },
        { text: line.text, style: "normal" },
      ]);
      return;
    }
    if (line.email) {
      // Email rendered as an underlined link, the rest plain — as in the
      // reference.
      centeredRuns([
        {
          text: line.email,
          style: "normal",
          color: LINK,
          url: `mailto:${line.email}`,
          underline: true,
        },
        { text: line.text.slice(line.email.length), style: "normal" },
      ]);
      return;
    }
    centered(line.text);
  });

  y += 4;

  // ---------------- Sections ----------------
  sections
    .filter((s) => !LETTERHEAD_SECTIONS.includes(s.meta.key))
    .forEach((section) => {
      const blocks = buildSectionBlocks(section);
      sectionHeader(section.meta.label, blockReserve(blocks[0]));

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
        } else if (block.type === "gallery") {
          gallery(block.items);
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

// Loads every gallery image the resume will draw, as a data URL plus its
// natural size. jsPDF has no way to fetch anything itself, and the files
// live behind signed URLs, so this has to happen before generation — which
// is why downloading is asynchronous.
async function loadGalleryImages(sections) {
  const urls = [];
  sections.forEach(({ meta, media }) => {
    if (meta.type === "media" && meta.mediaType === "image") {
      (media || []).forEach((m) => m.file_url && urls.push(m.file_url));
    }
  });

  const images = new Map();
  await Promise.all(
    [...new Set(urls)].map(async (url) => {
      try {
        const response = await fetch(url);
        if (!response.ok) return;
        const blob = await response.blob();
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        const size = await new Promise((resolve) => {
          const img = new Image();
          img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
          img.onerror = () => resolve(null);
          img.src = dataUrl;
        });
        if (!size) return;
        const format = /^data:image\/png/i.test(dataUrl) ? "PNG" : "JPEG";
        images.set(url, { dataUrl, format, ...size });
      } catch {
        // A photograph that cannot be fetched is drawn as an empty frame
        // with its caption, rather than failing the whole download.
      }
    })
  );
  return images;
}

export async function downloadResumePdf(model) {
  const images = await loadGalleryImages(model.sections);
  const doc = generateResumePdf({ ...model, images });
  const headerSection = model.sections.find((s) => s.meta.key === "header");
  const name =
    buildLetterhead(model.profile, headerSection?.content).name || "student";
  doc.save(`${name.replace(/\s+/g, "_").replace(/[^\w-]/g, "") || "student"}_Resume.pdf`);
}
