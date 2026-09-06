// Turns each portfolio section into the block shapes used by the resume,
// modelled on the reference consulting resume:
//
//   ENTRY      Bold Organisation, Italic Role, Location .... Right-aligned date
//                • bullet describing what was done, wrapping with a
//                  hanging indent under the text, not the bullet
//   BULLET      a standalone bullet, optionally "Italic label: value"
//   LABELLED    Bold label: value, no bullet (the Skills block)
//   PARAGRAPH   free prose (the Objective)
//
// Keeping this in one place means the on-screen preview and the
// downloaded PDF are laid out from exactly the same description.

import { attachmentsOf } from "@/lib/uploads";

const t = (v) => String(v ?? "").trim();

function joinParts(...parts) {
  return parts.map(t).filter(Boolean).join(", ");
}

// Sections drawn in the letterhead rather than as an ordinary block.
export const LETTERHEAD_SECTIONS = ["header"];

export function buildLetterhead(profile, headerContent) {
  const h = headerContent || {};
  const name = t(h.name) || t(profile?.full_name) || "Student Name";
  const email = t(h.email) || t(profile?.email);
  const phone = t(h.phone);

  const lines = [];
  if (email || phone) {
    lines.push({ email, text: [email, phone].filter(Boolean).join("  |  ") });
  }
  if (t(h.address)) lines.push({ label: "Address:", text: t(h.address) });
  if (t(h.linkedin)) lines.push({ label: "LinkedIn / Website:", text: t(h.linkedin) });

  return { name, lines };
}

// One bullet carrying an italic label, the way the reference writes
// "SAT Scores: Math 780 | Writing 760".
function labelBullet(label, text, right, url) {
  if (!t(text) && !t(right)) return null;
  return { type: "bullet", label: t(label), text: t(text), right: t(right), url: url || null };
}

function attachmentBullets(entryOrContent) {
  return attachmentsOf(entryOrContent).map((a) => ({
    type: "attachment",
    text: a.name || "Attached file",
    url: a.url,
  }));
}

// Builds the blocks for one section. `meta` is the editor schema entry,
// so a field added there flows through here without a second edit.
export function buildSectionBlocks({ meta, content, media }) {
  const blocks = [];

  if (meta.type === "media") {
    const items = media || [];
    if (items.length > 0) {
      const captions = items.map((m) => t(m.caption)).filter(Boolean);
      blocks.push({
        type: "bullet",
        text:
          `${items.length} ${meta.mediaType === "image" ? "photograph" : "video"}${
            items.length === 1 ? "" : "s"
          }` + (captions.length ? `: ${captions.join("; ")}` : "") + ". Viewable in the portal.",
      });
    }
    return blocks;
  }

  if (!content) return blocks;

  switch (meta.key) {
    case "objective": {
      if (t(content.statement)) blocks.push({ type: "paragraph", text: t(content.statement) });
      break;
    }

    case "education": {
      const entry = {
        type: "entry",
        title: t(content.school_name),
        right: t(content.city_state),
        bullets: [],
      };
      const grad = labelBullet("Expected graduation", t(content.graduation_date));
      const gpa = labelBullet("GPA", t(content.gpa));
      if (grad) entry.bullets.push(grad);
      if (gpa) entry.bullets.push(gpa);

      (content.grades || []).forEach((g) => {
        const b = labelBullet(
          joinParts(g.year, g.subject) || t(g.subject),
          t(g.grade)
        );
        if (b) entry.bullets.push(b);
      });

      const courses = (content.diploma_courses || [])
        .map((c) => (t(c.course) ? `${t(c.course)}${t(c.level) ? ` (${t(c.level)})` : ""}` : ""))
        .filter(Boolean);
      if (courses.length) {
        entry.bullets.push(labelBullet("Diploma Programme courses", courses.join("; ")));
      }

      (content.grades || []).forEach((g) => entry.bullets.push(...attachmentBullets(g)));
      (content.diploma_courses || []).forEach((c) => entry.bullets.push(...attachmentBullets(c)));
      entry.bullets.push(...attachmentBullets(content));

      if (entry.title || entry.bullets.length) blocks.push(entry);
      break;
    }

    case "external_exams": {
      (content.entries || []).forEach((e) => {
        const b = labelBullet(e.exam, e.score, e.date);
        if (b) blocks.push(b);
        blocks.push(...attachmentBullets(e));
      });
      break;
    }

    case "skills": {
      // Grouped by category, one bold-labelled line each — the reference's
      // "Language: … / Computer Skills: … / Interests: …" block.
      const groups = new Map();
      (content.entries || []).forEach((e) => {
        if (!t(e.skill)) return;
        const key = t(e.category) || "Skills";
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(t(e.skill));
      });
      groups.forEach((skills, category) =>
        blocks.push({ type: "labelled", label: `${category}:`, text: skills.join("; ") })
      );
      (content.entries || []).forEach((e) => blocks.push(...attachmentBullets(e)));
      break;
    }

    default: {
      const map = ENTRY_SHAPES[meta.key];
      if (!map) break;
      (content.entries || []).forEach((e) => {
        const entry = {
          type: "entry",
          title: t(e[map.title]),
          subtitle: t(e[map.subtitle]),
          tail: t(e[map.tail]),
          right: t(e[map.right]),
          bullets: [],
        };
        (map.bullets || []).forEach((key) => {
          if (t(e[key])) entry.bullets.push({ type: "bullet", text: t(e[key]) });
        });
        (map.labelled || []).forEach(([key, label]) => {
          const b = labelBullet(label, e[key]);
          if (b) entry.bullets.push(b);
        });
        if (map.link && t(e[map.link])) {
          entry.bullets.push({
            type: "bullet",
            label: "Link",
            text: t(e[map.link]),
            url: t(e[map.link]),
          });
        }
        entry.bullets.push(...attachmentBullets(e));
        if (entry.title || entry.subtitle || entry.bullets.length) blocks.push(entry);
      });
    }
  }

  if (meta.type !== "media" && meta.key !== "education" && meta.key !== "skills") {
    blocks.push(...attachmentBullets(content));
  }
  return blocks;
}

// Which field plays which role on an entry's heading line. Bold title,
// italic subtitle, plain tail, right-aligned date — then the remaining
// prose fields become bullets underneath.
const ENTRY_SHAPES = {
  academic_awards: {
    title: "name",
    right: "year",
    bullets: ["description"],
  },
  non_academic_awards: {
    title: "name",
    subtitle: "level",
    right: "year",
    bullets: ["description"],
  },
  projects: {
    title: "title",
    subtitle: "role",
    bullets: ["description"],
    labelled: [
      ["outcomes", "Outcomes"],
      ["tools", "Tools / skills"],
    ],
  },
  research: {
    title: "topic",
    right: "date",
    bullets: ["summary"],
  },
  leadership: {
    title: "organization",
    subtitle: "position",
    right: "duration",
    bullets: ["responsibilities"],
  },
  administrative_work: {
    title: "organization",
    subtitle: "role",
    right: "duration",
    bullets: ["responsibilities"],
  },
  social_service: {
    title: "activity",
    subtitle: "role",
    right: "duration",
    bullets: ["impact"],
  },
  internships: {
    title: "organization",
    subtitle: "position",
    right: "duration",
    bullets: ["duties"],
  },
  programs_camps: {
    title: "program",
    subtitle: "institution",
    tail: "location",
    right: "duration",
    bullets: ["takeaways"],
  },
  media_coverage: {
    title: "title",
    subtitle: "platform",
    right: "date",
    link: "link",
  },
};

// The heading line, assembled the reference's way:
// "Bold Organisation, Italic Role, Plain Location".
export function headingRuns(entry) {
  const runs = [];
  if (entry.title) runs.push({ text: entry.title, style: "bold" });
  if (entry.subtitle) {
    if (runs.length) runs.push({ text: ", ", style: "bold" });
    runs.push({ text: entry.subtitle, style: "italic" });
  }
  if (entry.tail) {
    if (runs.length) runs.push({ text: ", ", style: "normal" });
    runs.push({ text: entry.tail, style: "normal" });
  }
  return runs;
}
