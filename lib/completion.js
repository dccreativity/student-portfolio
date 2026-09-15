// Whether a student has actually filled a section in.
//
// One definition, used by the student's own dashboard and by the admin's
// per-grade table, so a green tick means exactly the same thing in both
// places: the student has saved something real here, not merely opened
// the page.

import { SECTION_SCHEMA } from "@/lib/sectionSchema";

const filled = (v) => String(v ?? "").trim().length > 0;

export function isSectionFilled(meta, content, mediaCount = 0) {
  if (meta.type === "media") return mediaCount > 0;
  if (!content) return false;

  if (meta.type === "single") {
    // `attachments` is bookkeeping, not an answer — a section holding
    // nothing but an upload still counts, but an empty object does not.
    return Object.entries(content).some(([key, value]) =>
      key === "attachments" ? (value || []).length > 0 : filled(value)
    );
  }

  if (meta.type === "repeatable") {
    return (content.entries || []).length > 0;
  }

  if (meta.type === "education") {
    return (
      meta.fields.some((f) => filled(content[f.key])) ||
      (content.records || []).length > 0
    );
  }

  if (meta.type === "mixed") {
    return (
      meta.fields.some((f) => filled(content[f.key])) ||
      meta.repeatableGroups.some((g) => (content[g.key] || []).length > 0)
    );
  }

  return false;
}

// { sectionKey: boolean } for one student.
export function sectionCompletion(contentBySection, mediaCounts = {}) {
  const out = {};
  SECTION_SCHEMA.forEach((meta) => {
    out[meta.key] = isSectionFilled(
      meta,
      contentBySection?.[meta.key],
      mediaCounts?.[meta.key] || 0
    );
  });
  return out;
}

export function completedCount(completion) {
  return SECTION_SCHEMA.filter((s) => completion[s.key]).length;
}
