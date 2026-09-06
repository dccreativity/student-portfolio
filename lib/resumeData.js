import { SECTION_SCHEMA } from "@/lib/sectionSchema";
import {
  SIGNED_URL_TTL_LONG,
  attachmentsOf,
  signPaths,
  storagePathOf,
} from "@/lib/uploads";

// Loads everything the resume needs in one round trip. Every section is
// included, even empty ones, so the resume always shows the full set of
// headers with the space beneath them filling in as the student adds
// entries — lib/resumeLayout.js decides how each one is laid out.
export async function buildResumeModel(supabase, userId) {
  const [{ data: profile }, { data: dataRows }, { data: mediaRows }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).single(),
    supabase.from("portfolio_data").select("section, content").eq("user_id", userId),
    supabase
      .from("portfolio_media")
      .select("section, caption, file_url, storage_path")
      .eq("user_id", userId),
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

  // The storage bucket is private, so every file referenced by the resume
  // needs a signed link. Doing it once here means the on-screen preview
  // and the downloaded PDF share exactly the same set of working links.
  // The longer expiry is for the PDF's sake — a downloaded document whose
  // links died an hour later would be useless to send anywhere.
  return { profile, sections: await signSectionFiles(supabase, sections) };
}

async function signSectionFiles(supabase, sections) {
  const paths = [];
  const collect = (holder) => attachmentsOf(holder).forEach((a) => paths.push(storagePathOf(a)));

  sections.forEach(({ meta, content, media }) => {
    (media || []).forEach((m) => paths.push(storagePathOf(m)));
    if (!content) return;
    collect(content);
    (content.entries || []).forEach(collect);
    (meta.repeatableGroups || []).forEach((g) => (content[g.key] || []).forEach(collect));
  });

  const map = await signPaths(supabase, paths, SIGNED_URL_TTL_LONG);
  if (map.size === 0) return sections;

  const sign = (a) => {
    const url = map.get(storagePathOf(a));
    return url ? { ...a, url } : a;
  };
  const signHolder = (holder) => {
    if (!holder) return holder;
    const list = attachmentsOf(holder);
    if (list.length === 0) return holder;
    const next = { ...holder, attachments: list.map(sign) };
    delete next.attachment_url;
    delete next.attachment_name;
    return next;
  };

  return sections.map(({ meta, content, media }) => ({
    meta,
    media: (media || []).map((m) => {
      const url = map.get(storagePathOf(m));
      return url ? { ...m, file_url: url } : m;
    }),
    content: content
      ? {
          ...signHolder(content),
          ...(content.entries ? { entries: content.entries.map(signHolder) } : {}),
          ...Object.fromEntries(
            (meta.repeatableGroups || []).map((g) => [
              g.key,
              (content[g.key] || []).map(signHolder),
            ])
          ),
        }
      : null,
  }));
}
