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
// photography for section backgrounds.
export const UNSPLASH_IMAGES = {
  authHero:
    "https://images.unsplash.com/photo-1558168674-2505c71112eb?auto=format&fit=crop&w=1400&q=80",
  dashboardHero:
    "https://images.unsplash.com/photo-1741699427799-3fbb70fce948?auto=format&fit=crop&w=1600&q=80",
};

// The full 17-section profile structure now lives in lib/sectionSchema.js
// (each section's exact fields, and whether it's a single form, a
// repeatable list, a mixed form+table, or a media gallery).
export { SECTION_SCHEMA, getSectionMeta } from "./sectionSchema";
