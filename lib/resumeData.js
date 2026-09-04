import { SECTION_SCHEMA } from "@/lib/sectionSchema";

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

  return { profile, sections };
}

// True if a section actually has something to show — used to render
// blank space (header only) versus filled content, not to hide sections.
export function sectionHasContent({ meta, content, media }) {
  if (meta.type === "media") return (media || []).length > 0;
  if (!content) return false;
  if (meta.type === "single") return Object.values(content).some((v) => String(v || "").trim());
  if (meta.type === "repeatable") return (content.entries || []).length > 0;
  if (meta.type === "mixed") {
    const hasBasic = meta.fields.some((f) => String(content[f.key] || "").trim());
    const hasGroup = meta.repeatableGroups.some((g) => (content[g.key] || []).length > 0);
    return hasBasic || hasGroup;
  }
  return false;
}
