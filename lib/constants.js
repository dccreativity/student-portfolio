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

// ---------------------------------------------------------------------
// Academic programmes, and the grade scale each one is marked on.
//
// Subject names are deliberately free text everywhere — students take
// combinations no fixed list would cover.
// ---------------------------------------------------------------------
export const PROGRAMMES = ["IGCSE", "AS Level", "A Level", "IBDP 1", "IBDP 2"];

export const LETTER_GRADES = ["A*", "A", "B", "C", "D", "E", "F", "G", "U"];
export const IB_GRADES = ["7", "6", "5", "4", "3", "2", "1"];
export const IB_LEVELS = ["SL", "HL"];

export function isIbProgramme(programme) {
  return programme === "IBDP 1" || programme === "IBDP 2";
}

// IB records carry an SL/HL column and are marked 1-7; the Cambridge
// programmes are a plain subject/grade pair marked A*-U.
export function programmeColumns(programme) {
  return isIbProgramme(programme)
    ? [
        { key: "subject", label: "Subject", type: "text" },
        { key: "level", label: "SL / HL", type: "select", options: IB_LEVELS },
        { key: "grade", label: "Grade achieved", type: "select", options: IB_GRADES },
      ]
    : [
        { key: "subject", label: "Subject", type: "text" },
        { key: "grade", label: "Grade", type: "select", options: LETTER_GRADES },
      ];
}

// What a student in a given school grade is currently sitting, and what
// they must already have behind them. Grade 11 is either the first year
// of A Levels (AS) or of the IB; Grade 12 is the second year of either.
// Everyone arrives via IGCSE in Grade 10.
export const PROGRAMME_BY_GRADE = {
  9: [],
  10: ["IGCSE"],
  11: ["AS Level", "IBDP 1"],
  12: ["A Level", "IBDP 2"],
};

// Programmes a student must already have completed before the one given,
// with the school grade each was taken in.
export const PRIOR_PROGRAMMES = {
  IGCSE: [],
  "AS Level": [{ programme: "IGCSE", year: "Grade 10" }],
  "A Level": [
    { programme: "AS Level", year: "Grade 11" },
    { programme: "IGCSE", year: "Grade 10" },
  ],
  "IBDP 1": [{ programme: "IGCSE", year: "Grade 10" }],
  "IBDP 2": [
    { programme: "IBDP 1", year: "Grade 11" },
    { programme: "IGCSE", year: "Grade 10" },
  ],
};

// The records a student of this grade would be expected to hold: what
// they are sitting now, plus everything it implies. Offered as one-click
// additions in the Education editor, never forced.
export function expectedRecords(grade) {
  const current = PROGRAMME_BY_GRADE[String(grade)] || [];
  const rows = current.map((programme) => ({ programme, year: `Grade ${grade}` }));
  current.forEach((programme) =>
    (PRIOR_PROGRAMMES[programme] || []).forEach((prior) => {
      if (!rows.some((r) => r.programme === prior.programme)) rows.push(prior);
    })
  );
  return rows;
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

// Each section gets a banner: an icon, a gradient from the site palette,
// and a photograph laid over it. The gradient is what actually paints the
// area, so a slow or blocked image degrades to colour rather than to an
// empty box.
export const SECTION_BANNERS = {
  header: ["\ud83d\udc64", "from-[#F2B694] to-[#F6EFE6]", PHOTOS.graduation],
  objective: ["\ud83c\udfaf", "from-[#E7D8F0] to-[#F6EFE6]", PHOTOS.graduation],
  education: ["\ud83c\udf93", "from-[#D9E4F5] to-[#F6EFE6]", PHOTOS.library],
  external_exams: ["\ud83d\udcdd", "from-[#CFE6DF] to-[#F6EFE6]", PHOTOS.library],
  academic_awards: ["\ud83c\udfc5", "from-[#F5DFA8] to-[#F6EFE6]", PHOTOS.graduation],
  non_academic_awards: ["\ud83c\udfc6", "from-[#F2C9A0] to-[#F6EFE6]", PHOTOS.together],
  projects: ["\ud83d\udee0\ufe0f", "from-[#D5E3E8] to-[#F6EFE6]", PHOTOS.making],
  research: ["\ud83d\udd2c", "from-[#DCD9F0] to-[#F6EFE6]", PHOTOS.library],
  leadership: ["\ud83e\udded", "from-[#F3C9C2] to-[#F6EFE6]", PHOTOS.together],
  administrative_work: ["\ud83d\uddc2\ufe0f", "from-[#E2DECF] to-[#F6EFE6]", PHOTOS.workspace],
  social_service: ["\ud83e\udd1d", "from-[#CFE7CB] to-[#F6EFE6]", PHOTOS.together],
  internships: ["\ud83d\udcbc", "from-[#DCE6F5] to-[#F6EFE6]", PHOTOS.workspace],
  programs_camps: ["\ud83c\udf0d", "from-[#CFE3EE] to-[#F6EFE6]", PHOTOS.together],
  media_coverage: ["\ud83d\udcf0", "from-[#E6DED2] to-[#F6EFE6]", PHOTOS.workspace],
  picture_gallery: ["\ud83d\uddbc\ufe0f", "from-[#F2B694] to-[#F6EFE6]", PHOTOS.graduation],
  video_gallery: ["\ud83c\udfac", "from-[#D8CDE8] to-[#F6EFE6]", PHOTOS.making],
  skills: ["\u2728", "from-[#F5E0B8] to-[#F6EFE6]", PHOTOS.making],
};

export function getSectionBanner(key) {
  const [icon, gradient, image] = SECTION_BANNERS[key] || [
    "\ud83d\udcc1",
    "from-[#EDE3D3] to-[#F6EFE6]",
    null,
  ];
  return { icon, gradient, image: image || null };
}

// The full 17-section profile structure now lives in lib/sectionSchema.js
// (each section's exact fields, and whether it's a single form, a
// repeatable list, a mixed form+table, or a media gallery).
export { SECTION_SCHEMA, getSectionMeta } from "./sectionSchema";
