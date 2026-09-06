import { SECTION_SCHEMA } from "@/lib/sectionSchema";

// Loads everything the resume needs in one round trip. Every section is
// included, even empty ones, so the resume always shows the full set of
// headers with the space beneath them filling in as the student adds
// entries — lib/resumeLayout.js decides how each one is laid out.
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
