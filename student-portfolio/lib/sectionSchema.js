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

export const SECTION_SCHEMA = [
  {
    key: "header",
    label: "Header / Contact",
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
    type: "single",
    fields: [{ key: "statement", label: "Objective statement", long: true }],
  },
  {
    key: "education",
    label: "Education",
    type: "mixed",
    fields: [
      { key: "school_name", label: "School name" },
      { key: "city_state", label: "City / State" },
      { key: "graduation_date", label: "Expected graduation date" },
      { key: "gpa", label: "GPA" },
    ],
    repeatableGroups: [
      {
        key: "grades",
        label: "Grade 9–12 academic performance",
        fields: [
          { key: "year", label: "Grade / Year" },
          { key: "subject", label: "Subject" },
          { key: "grade", label: "Grade" },
        ],
      },
      {
        key: "diploma_courses",
        label: "Diploma Programme courses",
        fields: [
          { key: "course", label: "Course" },
          { key: "level", label: "HL / SL" },
        ],
      },
    ],
  },
  {
    key: "external_exams",
    label: "External Exams",
    type: "repeatable",
    fields: [
      { key: "exam", label: "Exam (SAT/ACT/TOEFL/IELTS)" },
      { key: "score", label: "Score" },
      { key: "date", label: "Date" },
    ],
  },
  {
    key: "academic_awards",
    label: "Academic Awards and Honors",
    type: "repeatable",
    fields: [
      { key: "name", label: "Award / honor name" },
      { key: "year", label: "Year" },
      { key: "description", label: "Description" },
    ],
  },
  {
    key: "non_academic_awards",
    label: "Non-Academic Awards",
    type: "repeatable",
    fields: [
      { key: "name", label: "Award name" },
      { key: "year", label: "Year" },
      { key: "level", label: "Level (school/regional/national)" },
      { key: "description", label: "Description" },
    ],
  },
  {
    key: "projects",
    label: "Additional Projects",
    type: "repeatable",
    fields: [
      { key: "title", label: "Project title" },
      { key: "description", label: "Description" },
      { key: "role", label: "Role" },
      { key: "outcomes", label: "Outcomes" },
      { key: "tools", label: "Tools / skills used" },
    ],
  },
  {
    key: "research",
    label: "Additional Reading and Research",
    type: "repeatable",
    fields: [
      { key: "topic", label: "Paper / research topic" },
      { key: "date", label: "Date" },
      { key: "summary", label: "Summary of findings/conclusions" },
    ],
  },
  {
    key: "leadership",
    label: "Leadership Experiences",
    type: "repeatable",
    fields: [
      { key: "position", label: "Position title" },
      { key: "organization", label: "Organization / club" },
      { key: "duration", label: "Duration" },
      { key: "responsibilities", label: "Responsibilities and key initiatives" },
    ],
  },
  {
    key: "administrative_work",
    label: "Administrative Work",
    type: "repeatable",
    fields: [
      { key: "role", label: "Role" },
      { key: "organization", label: "Organization" },
      { key: "duration", label: "Duration" },
      { key: "responsibilities", label: "Logistics / operational responsibilities" },
    ],
  },
  {
    key: "social_service",
    label: "Social Service Activities",
    type: "repeatable",
    fields: [
      { key: "activity", label: "Activity / organization name" },
      { key: "duration", label: "Duration" },
      { key: "role", label: "Role" },
      { key: "impact", label: "Contribution / impact / recognition" },
    ],
  },
  {
    key: "internships",
    label: "Internships",
    type: "repeatable",
    fields: [
      { key: "position", label: "Position" },
      { key: "organization", label: "Company / organization" },
      { key: "duration", label: "Duration" },
      { key: "duties", label: "Key duties and skills gained" },
    ],
  },
  {
    key: "programs_camps",
    label: "Summer Schools / Leadership Camps / Exchanges",
    type: "repeatable",
    fields: [
      { key: "program", label: "Program name" },
      { key: "institution", label: "Institution" },
      { key: "location", label: "Location" },
      { key: "duration", label: "Duration" },
      { key: "takeaways", label: "Key takeaways / learnings" },
    ],
  },
  {
    key: "media_coverage",
    label: "Media Coverage",
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
    type: "media",
    mediaType: "image",
  },
  {
    key: "video_gallery",
    label: "Video Gallery",
    type: "media",
    mediaType: "video",
  },
  {
    key: "skills",
    label: "Skills",
    type: "repeatable",
    fields: [
      { key: "skill", label: "Skill" },
      { key: "category", label: "Category (communication/technical/language/research)" },
    ],
  },
];

export function getSectionMeta(key) {
  return SECTION_SCHEMA.find((s) => s.key === key);
}
