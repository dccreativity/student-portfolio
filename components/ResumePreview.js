"use client";

import {
  RESUME_SPECIAL_SECTIONS,
  entryLines,
  sectionHasContent,
} from "@/lib/resumeData";
import { attachmentsOf } from "@/lib/uploads";

function Attachments({ items }) {
  if (!items || items.length === 0) return null;
  return (
    <span className="ml-2">
      {items.map((a, i) => (
        <a
          key={a.path || a.url || i}
          href={a.url}
          target="_blank"
          rel="noreferrer"
          className="text-clay underline text-[11px] mr-2"
        >
          📎 {a.name || "attachment"}
        </a>
      ))}
    </span>
  );
}

function SectionBlock({ title, children }) {
  return (
    <section className="break-inside-avoid">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink border-b border-ink/70 pb-1 mb-2">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function ResumePreview({ profile, sections, header }) {
  const objective = sections.find((s) => s.meta.key === "objective");
  const objectiveText = String(objective?.content?.statement || "").trim();
  const headerFiles = attachmentsOf(sections.find((s) => s.meta.key === "header")?.content);

  return (
    <article className="bg-white border border-line rounded-3xl px-8 py-10 md:px-14 md:py-14 max-w-3xl mx-auto shadow-sm text-ink">
      {/* ---- Letterhead: name + contact details ---- */}
      <header className="text-center border-b-2 border-ink pb-4 mb-6">
        <h1 className="font-display text-3xl md:text-4xl tracking-tight">{header?.name}</h1>
        {header?.contactLines?.length > 0 ? (
          <div className="mt-2 space-y-0.5">
            {header.contactLines.map((line, i) => (
              <p key={i} className="text-[12px] text-neutral-600">
                {line}
              </p>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-[12px] text-neutral-300">
            Add your address, email, phone and LinkedIn in Header / Contact
          </p>
        )}
        {header?.grade && (
          <p className="mt-1 text-[11px] uppercase tracking-wide text-neutral-400">
            {header.grade}
          </p>
        )}
        {headerFiles.length > 0 && (
          <div className="mt-1">
            <Attachments items={headerFiles} />
          </div>
        )}
      </header>

      {/* ---- Objective, immediately under the letterhead ---- */}
      <div className="mb-6">
        <SectionBlock title="Objective">
          {objectiveText ? (
            <p className="text-[12.5px] leading-relaxed text-neutral-800 whitespace-pre-wrap">
              {objectiveText}
            </p>
          ) : (
            <p className="text-[12.5px] text-neutral-300">
              Your objective statement will appear here.
            </p>
          )}
          <Attachments items={attachmentsOf(objective?.content)} />
        </SectionBlock>
      </div>

      {/* ---- Every remaining section, in template order ---- */}
      <div className="space-y-6">
        {sections
          .filter((s) => !RESUME_SPECIAL_SECTIONS.includes(s.meta.key))
          .map(({ meta, content, media }) => {
            const has = sectionHasContent({ meta, content, media });
            return (
              <SectionBlock key={meta.key} title={meta.label}>
                {!has && (
                  <p className="text-[12.5px] text-neutral-300">
                    Nothing added yet — this space fills in as you add entries.
                  </p>
                )}

                {has && meta.type === "single" && (
                  <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-1 text-[12.5px]">
                    {meta.fields.map(
                      (f) =>
                        String(content[f.key] || "").trim() && (
                          <div key={f.key} className="flex gap-1.5">
                            <dt className="text-neutral-500 shrink-0">{f.label}:</dt>
                            <dd className="text-neutral-900">{content[f.key]}</dd>
                          </div>
                        )
                    )}
                  </dl>
                )}

                {has && meta.type === "repeatable" && (
                  <ul className="space-y-1.5 text-[12.5px]">
                    {(content.entries || []).map((entry, i) => {
                      const line = entryLines(meta.fields, entry);
                      return (
                        <li key={i} className="flex gap-2">
                          <span className="text-ink/40 select-none">▪</span>
                          <span className="min-w-0">
                            <span className="font-medium text-neutral-900">{line.title}</span>
                            {line.detail && (
                              <span className="text-neutral-600"> — {line.detail}</span>
                            )}
                            <Attachments items={line.attachments} />
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {has && meta.type === "mixed" && (
                  <div className="space-y-3 text-[12.5px]">
                    <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-1">
                      {meta.fields.map(
                        (f) =>
                          String(content[f.key] || "").trim() && (
                            <div key={f.key} className="flex gap-1.5">
                              <dt className="text-neutral-500 shrink-0">{f.label}:</dt>
                              <dd className="text-neutral-900">{content[f.key]}</dd>
                            </div>
                          )
                      )}
                    </dl>
                    {meta.repeatableGroups.map((group) => {
                      const entries = content[group.key] || [];
                      if (entries.length === 0) return null;
                      return (
                        <div key={group.key}>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 mb-1">
                            {group.label}
                          </p>
                          <ul className="space-y-1">
                            {entries.map((entry, i) => {
                              const line = entryLines(group.fields, entry);
                              return (
                                <li key={i} className="flex gap-2">
                                  <span className="text-ink/40 select-none">▪</span>
                                  <span className="min-w-0">
                                    <span className="font-medium text-neutral-900">
                                      {line.title}
                                    </span>
                                    {line.detail && (
                                      <span className="text-neutral-600"> — {line.detail}</span>
                                    )}
                                    <Attachments items={line.attachments} />
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                )}

                {has && meta.type === "media" && (
                  <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {media.slice(0, 6).map((m, i) => (
                      <li key={i} className="text-[11px]">
                        {meta.mediaType === "image" ? (
                          <img
                            src={m.file_url}
                            alt={m.caption || ""}
                            className="w-full h-20 object-cover rounded-lg border border-line"
                          />
                        ) : (
                          <a
                            href={m.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="w-full h-20 rounded-lg border border-line bg-sand grid place-items-center text-clay"
                          >
                            ▶ Watch
                          </a>
                        )}
                        <p className="mt-1 text-neutral-600 truncate">{m.caption || "—"}</p>
                      </li>
                    ))}
                    {media.length > 6 && (
                      <li className="text-[11px] text-neutral-500 self-center">
                        +{media.length - 6} more in the portal
                      </li>
                    )}
                  </ul>
                )}

                {/* Files attached to the section itself, not to one entry. */}
                {meta.type !== "media" && <Attachments items={attachmentsOf(content)} />}
              </SectionBlock>
            );
          })}
      </div>
    </article>
  );
}
