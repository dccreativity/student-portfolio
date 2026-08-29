// Single source of truth for the allowed school email domain.
// Enforced client-side here AND server-side in supabase/auth-hook.sql
// (client-side alone can be bypassed, so both layers matter).
export const ALLOWED_EMAIL_DOMAIN = "adaniinternational.edu.in";

export function isAllowedSchoolEmail(email) {
  if (!email || typeof email !== "string") return false;
  const parts = email.trim().toLowerCase().split("@");
  return parts.length === 2 && parts[1] === ALLOWED_EMAIL_DOMAIN;
}

// The full 17-section profile structure now lives in lib/sectionSchema.js
// (each section's exact fields, and whether it's a single form, a
// repeatable list, a mixed form+table, or a media gallery).
export { SECTION_SCHEMA, getSectionMeta } from "./sectionSchema";
