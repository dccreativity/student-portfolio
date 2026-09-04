"use client";

import { sectionHasContent } from "@/lib/resumeData";

export default function ResumePreview({ profile, sections }) {
  return (
    <div className="bg-white border border-line rounded-3xl p-8 md:p-12 max-w-3xl mx-auto shadow-sm">
      <h1 className="font-display text-3xl">{profile?.full_name || "Student Name"}</h1>
      <p className="text-sm text-neutral-500 mt-1">
        {[profile?.email, profile?.grade ? `Grade ${profile.grade}` : null]
          .filter(Boolean)
          .join("  ·  ")}
      </p>

      <div className="mt-8 space-y-8">
        {sections.map(({ meta, content, media }) => {
          const has = sectionHasContent({ meta, content, media });
          return (
            <div key={meta.key}>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-clay border-b border-clay/30 pb-1 mb-3">
                {meta.label}
              </h2>

              {!has && <p className="text-sm text-neutral-300">—</p>}

              {has && meta.type === "single" && (
                <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
                  {meta.fields.map(
                    (f) =>
                      content[f.key] && (
                        <div key={f.key}>
                          <dt className="text-neutral-400 text-xs">{f.label}</dt>
                          <dd className="text-neutral-800">{content[f.key]}</dd>
                        </div>
                      )
                  )}
                </dl>
              )}

              {has && meta.type === "repeatable" && (
                <ul className="space-y-2 text-sm">
                  {(content.entries || []).map((entry, i) => (
                    <li key={i} className="text-neutral-700">
                      • {meta.fields.map((f) => entry[f.key]).filter(Boolean).join(" — ")}
                      {entry.attachment_url && (
                        <a
                          href={entry.attachment_url}
                          target="_blank"
                          rel="noreferrer"
                          className="ml-2 text-clay underline text-xs"
                        >
                          📎 {entry.attachment_name || "attachment"}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {has && meta.type === "mixed" && (
                <div className="space-y-3 text-sm">
                  <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-1">
                    {meta.fields.map(
                      (f) =>
                        content[f.key] && (
                          <div key={f.key}>
                            <dt className="text-neutral-400 text-xs">{f.label}</dt>
                            <dd className="text-neutral-800">{content[f.key]}</dd>
                          </div>
                        )
                    )}
                  </dl>
                  {meta.repeatableGroups.map((group) => {
                    const entries = content[group.key] || [];
                    if (entries.length === 0) return null;
                    return (
                      <div key={group.key}>
                        <p className="text-xs font-medium text-neutral-500 mt-2">{group.label}</p>
                        <ul className="space-y-1">
                          {entries.map((entry, i) => (
                            <li key={i} className="text-neutral-700">
                              • {group.fields.map((f) => entry[f.key]).filter(Boolean).join(" — ")}
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              )}

              {has && meta.type === "media" && (
                <p className="text-sm text-neutral-600">
                  {media.length} item{media.length === 1 ? "" : "s"} — full media viewable on the
                  live portfolio.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
