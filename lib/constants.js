// Single source of truth for the allowed school email domain.
// Enforced client-side here AND server-side in supabase/auth-hook.sql
// (client-side alone can be bypassed, so both layers matter).
export const ALLOWED_EMAIL_DOMAIN = "adaniinternational.edu.in";

export function isAllowedSchoolEmail(email) {
  if (!email || typeof email !== "string") return false;
  const parts = email.trim().toLowerCase().split("@");
  return parts.length === 2 && parts[1] === ALLOWED_EMAIL_DOMAIN;
}

// Grades offered at the school — used at sign-up and for grouping
// students in the admin dashboard.
export const GRADE_OPTIONS = ["9", "10", "11", "12"];

// Verified, free-to-use (Unsplash License, no attribution required)
// photography for the auth screens and the dashboard hero.
export const UNSPLASH_IMAGES = {
  authHero:
    "https://images.unsplash.com/photo-1558168674-2505c71112eb?auto=format&fit=crop&w=1400&q=80",
  dashboardHero:
    "https://images.unsplash.com/photo-1741699427799-3fbb70fce948?auto=format&fit=crop&w=1600&q=80",
};

// Each section gets its own banner: an icon plus a gradient drawn from the
// site palette, so it always renders instantly with nothing to load and
// nothing that can break.
//
// Prefer a real photograph for a section? Paste an Unsplash URL as a
// third entry and it replaces the gradient for that section only, e.g.
//
//   internships: [
//     "💼",
//     "from-[#DCE6F5] to-[#F3E9DD]",
//     "https://images.unsplash.com/photo-XXXXXXXX?auto=format&fit=crop&w=1200&q=70",
//   ],
//
// Pick photos from unsplash.com (free, no attribution required), open the
// image and copy its images.unsplash.com address.
export const SECTION_BANNERS = {
  header: ["👤", "from-[#F2B694] to-[#F6EFE6]"],
  objective: ["🎯", "from-[#E7D8F0] to-[#F6EFE6]"],
  education: ["🎓", "from-[#D9E4F5] to-[#F6EFE6]"],
  external_exams: ["📝", "from-[#CFE6DF] to-[#F6EFE6]"],
  academic_awards: ["🏅", "from-[#F5DFA8] to-[#F6EFE6]"],
  non_academic_awards: ["🏆", "from-[#F2C9A0] to-[#F6EFE6]"],
  projects: ["🛠️", "from-[#D5E3E8] to-[#F6EFE6]"],
  research: ["🔬", "from-[#DCD9F0] to-[#F6EFE6]"],
  leadership: ["🧭", "from-[#F3C9C2] to-[#F6EFE6]"],
  administrative_work: ["🗂️", "from-[#E2DECF] to-[#F6EFE6]"],
  social_service: ["🤝", "from-[#CFE7CB] to-[#F6EFE6]"],
  internships: ["💼", "from-[#DCE6F5] to-[#F6EFE6]"],
  programs_camps: ["🌍", "from-[#CFE3EE] to-[#F6EFE6]"],
  media_coverage: ["📰", "from-[#E6DED2] to-[#F6EFE6]"],
  picture_gallery: ["🖼️", "from-[#F2B694] to-[#F6EFE6]"],
  video_gallery: ["🎬", "from-[#D8CDE8] to-[#F6EFE6]"],
  skills: ["✨", "from-[#F5E0B8] to-[#F6EFE6]"],
};

export function getSectionBanner(key) {
  const [icon, gradient, image] = SECTION_BANNERS[key] || ["📁", "from-[#EDE3D3] to-[#F6EFE6]"];
  return { icon, gradient, image: image || null };
}

// The full 17-section profile structure now lives in lib/sectionSchema.js
// (each section's exact fields, and whether it's a single form, a
// repeatable list, a mixed form+table, or a media gallery).
export { SECTION_SCHEMA, getSectionMeta } from "./sectionSchema";
