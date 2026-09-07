"use client";

import {
  LETTERHEAD_SECTIONS,
  buildLetterhead,
  buildSectionBlocks,
  headingRuns,
} from "@/lib/resumeLayout";

// Mirrors lib/generateResumePdf.js exactly, so what a student sees here
// is what comes out of Download PDF: Times, US Letter proportions,
// uppercase section headers over a double rule, bold/italic heading runs
// with a right-aligned date, and hanging-indent bullets.

function Runs({ runs }) {
  return runs.map((run, i) => (
    <span
      key={i}
      className={run.style === "bold" ? "font-bold" : run.style === "italic" ? "italic" : ""}
    >
      {run.text}
    </span>
  ));
}

function Bullet({ item }) {
  if (item.type === "attachment") {
    return (
      <li className="flex gap-2 pl-[49px] list-none">
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer"
          className="italic text-[11.3px] text-neutral-500 hover:text-clay underline decoration-neutral-300"
        >
          Attached: {item.text}
        </a>
      </li>
    );
  }
  return (
    <li className="flex gap-0 list-none">
      <span className="w-[24px] shrink-0" />
      <span className="w-[25px] shrink-0 text-center">•</span>
      <span className="flex-1 min-w-0">
        {item.label && <span className="italic">{item.label}: </span>}
        {item.url ? (
          <a href={item.url} target="_blank" rel="noreferrer" className="text-blue-800 underline">
            {item.text}
          </a>
        ) : (
          item.text
        )}
      </span>
      {item.right && (
        <span className="shrink-0 pl-3 text-right tabular-nums">{item.right}</span>
      )}
    </li>
  );
}

// The picture gallery, laid out as a table of at most three columns so
// the photographs are actually large enough to read, each with its
// caption directly beneath it.
function Gallery({ items }) {
  return (
    <div className="grid grid-cols-3 gap-3 mt-1">
      {items.map((item, i) => (
        <figure key={i} className="break-inside-avoid">
          {/* Fitted rather than cropped, and left-aligned, so the
              preview matches what the PDF draws. */}
          <img
            src={item.url}
            alt={item.caption || ""}
            className="h-24 w-full object-contain object-left"
          />
          <figcaption className="mt-1 text-[10.5px] leading-snug text-neutral-600">
            {item.caption || "\u2014"}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

function SectionHeading({ children }) {
  return (
    <div>
      <h2 className="font-bold uppercase text-[14.7px] tracking-[0.01em] leading-tight">
        {children}
      </h2>
      {/* The reference's double rule under every section header. */}
      <div className="border-t border-black mt-[3px]" />
      <div className="border-t border-black mt-[1.5px] mb-[7px]" />
    </div>
  );
}

export default function ResumePreview({ profile, sections }) {
  const headerSection = sections.find((s) => s.meta.key === "header");
  const letterhead = buildLetterhead(profile, headerSection?.content);

  return (
    <article
      className="bg-white border border-line rounded-xl shadow-sm mx-auto text-black font-serif leading-[1.18]"
      style={{ maxWidth: "816px", padding: "48px", fontSize: "13.33px" }}
    >
      {/* ---- Letterhead ---- */}
      <header className="text-center mb-1">
        <h1 className="font-bold text-[24px] leading-tight mb-[2px]">{letterhead.name}</h1>
        {letterhead.lines.length === 0 && (
          <p className="text-neutral-400 italic mt-1">
            Add your email, phone, address and LinkedIn under Header / Contact.
          </p>
        )}
        {letterhead.lines.map((line, i) => (
          <p key={i} className="mt-[2px]">
            {line.label && <span className="font-bold">{line.label} </span>}
            {line.email ? (
              <>
                <a href={`mailto:${line.email}`} className="text-blue-800 underline">
                  {line.email}
                </a>
                {line.text.slice(line.email.length)}
              </>
            ) : (
              line.text
            )}
          </p>
        ))}
      </header>

      {/* ---- Sections ---- */}
      <div className="mt-4">
        {sections
          .filter((s) => !LETTERHEAD_SECTIONS.includes(s.meta.key))
          .map((section) => {
            const blocks = buildSectionBlocks(section);
            return (
              <section key={section.meta.key} className="mt-[22px] first:mt-0">
                <SectionHeading>{section.meta.label}</SectionHeading>

                {blocks.length === 0 && (
                  <p className="italic text-[11.3px] text-neutral-400">To be added.</p>
                )}

                {blocks.map((block, i) => {
                  if (block.type === "entry") {
                    return (
                      <div key={i} className={i > 0 ? "mt-[6px]" : ""}>
                        <div className="flex gap-3">
                          <p className="flex-1 min-w-0">
                            <Runs runs={headingRuns(block)} />
                          </p>
                          {block.right && (
                            <p className="shrink-0 text-right">{block.right}</p>
                          )}
                        </div>
                        {block.bullets.length > 0 && (
                          <ul className="mt-[1px]">
                            {block.bullets.map((b, j) => (
                              <Bullet key={j} item={b} />
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  }
                  if (block.type === "paragraph") {
                    return (
                      <p key={i} className="whitespace-pre-wrap">
                        {block.text}
                      </p>
                    );
                  }
                  if (block.type === "gallery") {
                    return <Gallery key={i} items={block.items} />;
                  }
                  if (block.type === "labelled") {
                    return (
                      <p key={i}>
                        <span className="font-bold">{block.label} </span>
                        {block.text}
                      </p>
                    );
                  }
                  return (
                    <ul key={i}>
                      <Bullet item={block} />
                    </ul>
                  );
                })}
              </section>
            );
          })}
      </div>
    </article>
  );
}
