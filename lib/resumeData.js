import { SECTION_SCHEMA } from "@/lib/sectionSchema";
import { attachmentsOf } from "@/lib/uploads";

// Always includes every section (even empty ones) so the resume shows
// blank space under each header until a student fills it in, per the
// school's requirement.
export async function buildResumeModel(supabase, userId) {
  const [{ data: profile }, { data: dataRows }, { data: mediaRows }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).single(),
    supabase.from("portfolio_data").select("section, content").eq("user_id", userId),
    supabase.from("portfolio_media").select("section, caption, file_url").eq("user_id", userId),
  ]);

  const dataMap = {};
  (dataRows || []).forEach((r) => (dataMap[r.section] = r.content));

  const mediaMap = { picture_gallery: [], video_gallery: [] };
  (mediaRows || []).forEach((m) => {
    if (mediaMap[m.section]) mediaMap[m.section].push(m);
  });

  const sections = SECTION_SCHEMA.map((meta) => ({
    meta,
    content: dataMap[meta.key] ?? null,
    media: meta.type === "media" ? mediaMap[meta.key] : null,
  }));

  return { profile, sections, header: buildHeader(profile, dataMap.header) };
}

// The resume's letterhead. The Header/Contact section is the student's
// own answer, so it wins; the account profile fills any gap so a resume
// is never nameless.
export function buildHeader(profile, headerContent = {}) {
  const h = headerContent || {};
  const name = trim(h.name) || trim(profile?.full_name) || "Student Name";
  const contactLines = [
    trim(h.address),
    [trim(h.email) || trim(profile?.email), trim(h.phone)].filter(Boolean).join("  ·  "),
    trim(h.linkedin),
  ].filter(Boolean);

  return {
    name,
    contactLines,
    grade: profile?.grade ? `Grade ${profile.grade}` : "",
  };
}

function trim(v) {
  return String(v ?? "").trim();
}

// Sections rendered specially in the resume letterhead/intro rather than
// as an ordinary "SECTION HEADER + list" block.
export const RESUME_SPECIAL_SECTIONS = ["header", "objective"];

// True if a section actually has something to show — used to render
// blank space (header only) versus filled content, not to hide sections.
export function sectionHasContent({ meta, content, media }) {
  if (meta.type === "media") return (media || []).length > 0;
  if (!content) return false;
  if (meta.type === "single") return meta.fields.some((f) => trim(content[f.key]));
  if (meta.type === "repeatable") return (content.entries || []).length > 0;
  if (meta.type === "mixed") {
    const hasBasic = meta.fields.some((f) => trim(content[f.key]));
    const hasGroup = meta.repeatableGroups.some((g) => (content[g.key] || []).length > 0);
    return hasBasic || hasGroup;
  }
  return false;
}

// A single repeatable entry rendered as a resume line: the first field is
// the title, the rest are supporting detail. Keeps both the preview and
// the PDF formatting identical.
export function entryLines(fields, entry) {
  const [first, ...rest] = fields;
  const title = trim(entry[first?.key]);
  const detail = rest
    .map((f) => trim(entry[f.key]))
    .filter(Boolean)
    .join("  ·  ");
  return {
    title: title || detail,
    detail: title ? detail : "",
    attachments: attachmentsOf(entry),
  };
}

export function countAttachments(sections) {
  let n = 0;
  sections.forEach(({ meta, content }) => {
    if (!content) return;
    if (Array.isArray(content.attachments)) n += content.attachments.length;
    if (meta.type === "repeatable") {
      (content.entries || []).forEach((e) => (n += attachmentsOf(e).length));
    }
    if (meta.type === "mixed") {
      meta.repeatableGroups.forEach((g) =>
        (content[g.key] || []).forEach((e) => (n += attachmentsOf(e).length))
      );
    }
  });
  return n;
}
