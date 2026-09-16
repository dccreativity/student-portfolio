// Defines the exact structure of the student profile, matching the
// school's own 17-section template. Each entry's `type` controls how
// app/dashboard/[section]/page.js renders and saves it:
//
//   "single"     -> one fixed set of fields, saved as content = {field: value}
//   "repeatable" -> a list of entries, saved as content = { entries: [{...fields}] }
//   "mixed"      -> fixed fields PLUS one or more repeatable sub-tables
//                   (used for Education: basic info + grades + IB courses)
//   "media"      -> files, stored in the separate portfolio_media table +
//                   Supabase Storage, not in portfolio_data at all
//
// A field may also carry:
//
//   long: true       a multi-line box rather than a single-line input
//   bullets: true    a bullet-point list: each point is its own line, and
//                    each becomes its own bullet on the resume. Stored as
//                    one newline-separated string, so anything a student
//                    typed before this existed reads back as one point.
//   maxLength: n     a hard limit with a live character count
//   options: [...]   a dropdown instead of free text
//   hint: "..."      a line of examples under the field, for a free-text
//                    field where the answer is open but students need to
//                    see the sort of thing that belongs there
//
// A section may also carry `short`: a compact heading for the admin's
// per-grade table, where seventeen full section names cannot sit side by
// side. Everywhere else shows the full `label`.

// The skills vocabulary. A fixed list so that the same skill is named the
// same way by every student, and can therefore be counted across a cohort.
// Re-exported from lib/constants.js alongside the rest of the schema.
export const SKILL_OPTIONS = [
  "Critical thinking",
  "Creativity",
  "Collaboration",
  "Communication",
  "Information literacy",
  "Media literacy",
  "Technology literacy",
  "Flexibility",
  "Leadership",
  "Initiative",
  "Productivity",
  "Social skills",
];

export const SECTION_SCHEMA = [
  {
    key: "header",
    label: "Header / Contact",
    short: "Contact",
    type: "single",
    fields: [
      { key: "name", label: "Name" },
      { key: "address", label: "Address" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone Number" },
      { key: "linkedin", label: "LinkedIn / Personal Website" },
    ],
  },
  {
    key: "objective",
    label: "Objective",
    short: "Objective",
    type: "single",
    fields: [
      { key: "statement", label: "Objective statement", long: true, maxLength: 500 },
    ],
  },
  {
    key: "education",
    label: "Education",
    short: "Education",
    // "education" is its own type: each year is a record with a
    // programme, and the programme decides the shape of that year's
    // subject table. See components/EducationEditor.js.
    type: "education",
    fields: [
      { key: "school_name", label: "School name" },
      { key: "city_state", label: "City / State" },
      { key: "graduation_date", label: "Expected graduation date" },
      { key: "gpa", label: "GPA" },
    ],
  },
  {
    key: "external_exams",
    label: "External Exams",
    short: "External Exams",
    type: "repeatable",
    fields: [
      {
        key: "exam",
        label: "Exam",
        hint: "SAT · ACT · PSAT · AP · IELTS · TOEFL · Duolingo · Olympiads (Maths, Physics, Chemistry, Biology, Informatics, Astronomy) · NTSE · KVPY · any other external exam",
      },
      { key: "score", label: "Score" },
      { key: "date", label: "Date" },
    ],
  },
  {
    key: "academic_awards",
    label: "Academic Awards and Honors",
    short: "Academic Awards",
    type: "repeatable",
    fields: [
      { key: "name", label: "Award / honor name" },
      { key: "year", label: "Year" },
      { key: "description", label: "Description", bullets: true },
    ],
  },
  {
    key: "non_academic_awards",
    label: "Non-Academic Awards",
    short: "Non-Academic Awards",
    type: "repeatable",
    fields: [
      { key: "name", label: "Award name" },
      { key: "year", label: "Year" },
      { key: "level", label: "Level (school/regional/national)" },
      { key: "description", label: "Description", bullets: true },
    ],
  },
  {
    key: "projects",
    label: "Additional Projects",
    short: "Projects",
    type: "repeatable",
    fields: [
      { key: "title", label: "Project title" },
      { key: "description", label: "Description", bullets: true },
      { key: "role", label: "Role" },
      { key: "outcomes", label: "Outcomes", bullets: true },
      { key: "tools", label: "Tools / skills used" },
    ],
  },
  {
    key: "research",
    label: "Additional Reading and Research",
    short: "Reading & Research",
    type: "repeatable",
    fields: [
      { key: "topic", label: "Paper / research topic" },
      { key: "date", label: "Date" },
      { key: "summary", label: "Summary of findings/conclusions", bullets: true },
    ],
  },
  {
    key: "leadership",
    label: "Leadership Experiences",
    short: "Leadership",
    type: "repeatable",
    fields: [
      { key: "position", label: "Position title" },
      { key: "organization", label: "Organization / club" },
      { key: "duration", label: "Duration" },
      { key: "responsibilities", label: "Responsibilities and key initiatives", bullets: true },
    ],
  },
  {
    key: "administrative_work",
    label: "Administrative Work",
    short: "Administrative Work",
    type: "repeatable",
    fields: [
      { key: "role", label: "Role" },
      { key: "organization", label: "Organization" },
      { key: "duration", label: "Duration" },
      { key: "responsibilities", label: "Logistics / operational responsibilities", bullets: true },
    ],
  },
  {
    key: "social_service",
    label: "Social Service Activities",
    short: "Social Service",
    type: "repeatable",
    fields: [
      { key: "activity", label: "Activity / organization name" },
      { key: "duration", label: "Duration" },
      { key: "role", label: "Role" },
      { key: "impact", label: "Contribution / impact / recognition", bullets: true },
    ],
  },
  {
    key: "internships",
    label: "Internships",
    short: "Internships",
    type: "repeatable",
    fields: [
      { key: "position", label: "Position" },
      { key: "organization", label: "Company / organization" },
      { key: "duration", label: "Duration" },
      { key: "duties", label: "Key duties and skills gained", bullets: true },
    ],
  },
  {
    key: "programs_camps",
    label: "Summer Schools / Leadership Camps / Exchanges",
    short: "Summer & Camps",
    type: "repeatable",
    fields: [
      { key: "program", label: "Program name" },
      { key: "institution", label: "Institution" },
      { key: "location", label: "Location" },
      { key: "duration", label: "Duration" },
      { key: "takeaways", label: "Key takeaways / learnings", bullets: true },
    ],
  },
  {
    key: "media_coverage",
    label: "Media Coverage",
    short: "Media Coverage",
    type: "repeatable",
    fields: [
      { key: "title", label: "Title" },
      { key: "platform", label: "Publication / platform" },
      { key: "date", label: "Date" },
      { key: "link", label: "Link" },
    ],
  },
  {
    key: "picture_gallery",
    label: "Picture Gallery",
    short: "Pictures",
    type: "media",
    mediaType: "image",
  },
  {
    key: "video_gallery",
    label: "Video Gallery",
    short: "Videos",
    // Links only — nothing is uploaded here. Each link becomes its own
    // bullet in the resume.
    type: "repeatable",
    fields: [
      { key: "title", label: "Title / description" },
      { key: "url", label: "Link (YouTube, Drive, Vimeo…)" },
    ],
  },
  {
    key: "skills",
    label: "Skills",
    short: "Skills",
    type: "repeatable",
    fields: [
      { key: "skill", label: "Skill", options: SKILL_OPTIONS },
      {
        key: "category",
        label: "Evidence / how you have demonstrated it",
        bullets: true,
      },
    ],
  },
];

export function getSectionMeta(key) {
  return SECTION_SCHEMA.find((s) => s.key === key);
}
