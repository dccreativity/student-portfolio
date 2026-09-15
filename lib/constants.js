// Single source of truth for the allowed school email domain.
// Enforced client-side here AND server-side in supabase/auth-hook.sql
// (client-side alone can be bypassed, so both layers matter).
export const ALLOWED_EMAIL_DOMAIN = "adaniinternational.edu.in";

export function isAllowedSchoolEmail(email) {
  if (!email || typeof email !== "string") return false;
  const parts = email.trim().toLowerCase().split("@");
  return parts.length === 2 && parts[1] === ALLOWED_EMAIL_DOMAIN;
}

// ---------------------------------------------------------------------
// Super admin
//
// An ordinary admin is strictly view-only. The super admin is the one
// account that may also correct and remove student data. The real
// enforcement is in the database (supabase/migration-superadmin.sql) —
// this list is what seeds it and what the UI reads to decide whether to
// show editing controls at all.
// ---------------------------------------------------------------------
export const SUPER_ADMIN_EMAILS = ["deepak.chaudhary@adaniinternational.edu.in"];

export function isSuperAdminEmail(email) {
  if (!email) return false;
  return SUPER_ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

// ---------------------------------------------------------------------
// Student UID — exactly four digits, no more, no fewer.
// ---------------------------------------------------------------------
export const UID_LENGTH = 4;

export function isValidUid(uid) {
  return typeof uid === "string" && new RegExp(`^\\d{${UID_LENGTH}}$`).test(uid.trim());
}

// Grades offered at the school. Collected at sign-up purely so admins can
// group students — it never limits what a student may enter about their
// own education.
export const GRADE_OPTIONS = ["9", "10", "11", "12"];

// ---------------------------------------------------------------------
// Academic programmes.
//
// Every student sees every year and every programme: a student who
// transferred in, repeated a year or arrived from another board is not a
// special case to be designed around. The school grade on their account
// decides nothing here.
//
// Subject names are free text throughout — no fixed list covers the
// combinations students actually take.
// ---------------------------------------------------------------------
export const YEAR_OPTIONS = ["Grade 9", "Grade 10", "Grade 11", "Grade 12"];

export const PROGRAMME_IGCSE = "IGCSE";
export const PROGRAMME_CAMBRIDGE = "Cambridge AS & A Level";
export const PROGRAMME_IB = "IB DP";
export const PROGRAMME_OTHER = "Other";

// Lower school sits IGCSE; the two-year programmes start in Grade 11.
// "Other" is offered in every year for students who came through ICSE,
// CBSE, the MYP or any other curriculum.
const LOWER_SCHOOL = [PROGRAMME_IGCSE, PROGRAMME_OTHER];
const UPPER_SCHOOL = [PROGRAMME_CAMBRIDGE, PROGRAMME_IB, PROGRAMME_OTHER];

export const PROGRAMMES_BY_YEAR = {
  "Grade 9": LOWER_SCHOOL,
  "Grade 10": LOWER_SCHOOL,
  "Grade 11": UPPER_SCHOOL,
  "Grade 12": UPPER_SCHOOL,
};

// Pre-selected when a year is added. The lower school is IGCSE unless the
// student says otherwise; Grade 11 and 12 are a real choice between two
// tracks, so neither is assumed.
export const DEFAULT_PROGRAMME_BY_YEAR = {
  "Grade 9": PROGRAMME_IGCSE,
  "Grade 10": PROGRAMME_IGCSE,
  "Grade 11": "",
  "Grade 12": "",
};

export function programmesForYear(year) {
  return PROGRAMMES_BY_YEAR[year] || UPPER_SCHOOL;
}

// Records saved before the programmes were reorganised used one name per
// year of a two-year course. They are read back onto the current names so
// existing student data keeps its grade scale.
const LEGACY_PROGRAMME_NAMES = {
  "AS Level": PROGRAMME_CAMBRIDGE,
  "A Level": PROGRAMME_CAMBRIDGE,
  "IBDP 1": PROGRAMME_IB,
  "IBDP 2": PROGRAMME_IB,
};

export function normaliseProgramme(programme) {
  if (!programme) return "";
  return LEGACY_PROGRAMME_NAMES[programme] || programme;
}

export const LETTER_GRADES = ["A*", "A", "B", "C", "D", "E", "F", "G", "U"];
export const IB_GRADES = ["7", "6", "5", "4", "3", "2", "1"];
export const IB_LEVELS = ["SL", "HL"];

export function isIbProgramme(programme) {
  return normaliseProgramme(programme) === PROGRAMME_IB;
}

export function isOtherProgramme(programme) {
  return normaliseProgramme(programme) === PROGRAMME_OTHER;
}

// The IB carries an SL/HL column and is marked 1-7. Cambridge is a
// subject/grade pair marked A*-U. "Other" can be any board's scale, so
// the grade is left as free text with no list and no range.
export function programmeColumns(programme) {
  const p = normaliseProgramme(programme);

  if (p === PROGRAMME_IB) {
    return [
      { key: "subject", label: "Subject", type: "text" },
      { key: "level", label: "SL / HL", type: "select", options: IB_LEVELS },
      { key: "grade", label: "Grade", type: "select", options: IB_GRADES },
    ];
  }

  if (p === PROGRAMME_OTHER) {
    return [
      { key: "subject", label: "Subject", type: "text" },
      { key: "grade", label: "Grade / score", type: "text" },
    ];
  }

  return [
    { key: "subject", label: "Subject", type: "text" },
    { key: "grade", label: "Grade", type: "select", options: LETTER_GRADES },
  ];
}

// How a year's marking is described to the student, above its table.
export function programmeScaleHint(programme) {
  const p = normaliseProgramme(programme);
  if (p === PROGRAMME_IB) return "Marked 1–7, with each subject taken at SL or HL.";
  if (p === PROGRAMME_OTHER) return "Enter grades or scores exactly as your board awards them.";
  return "Marked A* to U.";
}


// ---------------------------------------------------------------------
// Photography (Unsplash License — free to use, no attribution required)
//
// Built from the photo IDs in the share links you sent. Unsplash's own
// /download endpoint redirects to the image file, which is the form that
// can be constructed from a share link alone.
//
// If any photo doesn't appear on the live site, open it on unsplash.com,
// right-click the image, copy its address (it will start with
// https://images.unsplash.com/photo-...) and paste it in below in place
// of the unsplashPhoto(...) call. Nothing else needs to change — every
// photo on the site is picked from this one block.
// ---------------------------------------------------------------------
function unsplashPhoto(id, width = 1400) {
  // Unsplash redirects this to the image file itself. `force=true` is
  // deliberately omitted — it adds an attachment disposition meant for
  // save-to-disk, not for displaying the photo on a page.
  return `https://unsplash.com/photos/${id}/download?w=${width}`;
}

export const PHOTOS = {
  // Graduates tossing caps under a clear sky
  graduation: unsplashPhoto("u22U19QDcRE", 1600),
  // A long row of books in a library
  library: unsplashPhoto("My06S-Wg_zc", 1400),
  // Designer working on a website / app
  making: unsplashPhoto("VbVJy_IQrBE", 1400),
  // People at computers
  workspace: unsplashPhoto("YRMWVcdyhmI", 1400),
  // A group of people sitting on a set of stairs
  together: unsplashPhoto("B2vmYGtilHc", 1600),
};

export const UNSPLASH_IMAGES = {
  authHero: PHOTOS.graduation,
  dashboardHero: PHOTOS.together,
};

// Each section gets a banner: an icon, a gradient, and a photograph laid
// over it. The gradient is what actually paints the area, so a slow or
// blocked image degrades to colour rather than to an empty box. Every
// gradient resolves to the page background, so the banners read as one
// family rather than seventeen unrelated colours.
export const SECTION_BANNERS = {
  header: ["👤", "from-[#C8B1E4] to-[#F4EFFA]", PHOTOS.graduation],
  objective: ["🎯", "from-[#D8C7EC] to-[#F4EFFA]", PHOTOS.graduation],
  education: ["🎓", "from-[#B79AD9] to-[#F4EFFA]", PHOTOS.library],
  external_exams: ["📝", "from-[#CBB8E8] to-[#F4EFFA]", PHOTOS.library],
  academic_awards: ["🏅", "from-[#D3BEEA] to-[#F4EFFA]", PHOTOS.graduation],
  non_academic_awards: ["🏆", "from-[#C0A6E0] to-[#F4EFFA]", PHOTOS.together],
  projects: ["🛠️", "from-[#DCCDEE] to-[#F4EFFA]", PHOTOS.making],
  research: ["🔬", "from-[#B79AD9] to-[#F4EFFA]", PHOTOS.library],
  leadership: ["🧭", "from-[#CFB9E8] to-[#F4EFFA]", PHOTOS.together],
  administrative_work: ["🗂️", "from-[#DED2F0] to-[#F4EFFA]", PHOTOS.workspace],
  social_service: ["🤝", "from-[#C5AEE3] to-[#F4EFFA]", PHOTOS.together],
  internships: ["💼", "from-[#D6C6EC] to-[#F4EFFA]", PHOTOS.workspace],
  programs_camps: ["🌍", "from-[#BDA3DD] to-[#F4EFFA]", PHOTOS.together],
  media_coverage: ["📰", "from-[#E0D4F2] to-[#F4EFFA]", PHOTOS.workspace],
  picture_gallery: ["🖼️", "from-[#C8B1E4] to-[#F4EFFA]", PHOTOS.graduation],
  video_gallery: ["🎬", "from-[#D2BCE9] to-[#F4EFFA]", PHOTOS.making],
  skills: ["✨", "from-[#CBB2E6] to-[#F4EFFA]", PHOTOS.making],
};

export function getSectionBanner(key) {
  const [icon, gradient, image] = SECTION_BANNERS[key] || [
    "📁",
    "from-[#DCCDEE] to-[#F4EFFA]",
    null,
  ];
  return { icon, gradient, image: image || null };
}

// The full 17-section profile structure now lives in lib/sectionSchema.js
// (each section's exact fields, and whether it's a single form, a
// repeatable list, a mixed form+table, or a media gallery).
export { SECTION_SCHEMA, SKILL_OPTIONS, getSectionMeta } from "./sectionSchema";
