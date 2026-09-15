"use client";

import {
  DEFAULT_PROGRAMME_BY_YEAR,
  YEAR_OPTIONS,
  isIbProgramme,
  isOtherProgramme,
  normaliseProgramme,
  programmeColumns,
  programmeScaleHint,
  programmesForYear,
} from "@/lib/constants";
import { attachmentsOf, withAttachments } from "@/lib/uploads";
import FileAttachments from "@/components/FileAttachments";

// One entry per academic year: the year, the programme sat that year, and
// that year's subject results. The programme decides the table's columns —
// the IB adds an SL/HL column and is marked 1-7, Cambridge is a
// subject/grade pair marked A*-U, and "Other" leaves the grade as free
// text so a student from ICSE, CBSE, the MYP or any other board can enter
// their marks exactly as they were awarded.
//
// Every year and every programme is offered to every student. The grade on
// a student's account is for grouping them in the admin view and nothing
// else: it does not decide what they may record here.
//
// Subject is free text in every case: no fixed list covers the
// combinations students actually take.

export function emptyRecord(year = "", programme = null) {
  return {
    year,
    programme: programme ?? DEFAULT_PROGRAMME_BY_YEAR[year] ?? "",
    otherProgramme: "",
    subjects: [emptySubject()],
  };
}

function emptySubject() {
  return { subject: "", level: "", grade: "" };
}

const CONTROL =
  "w-full rounded-lg border border-line bg-white/80 px-2.5 py-2 text-sm h-[38px] outline-none focus:ring-2 focus:ring-clay";

function Cell({ column, value, onChange, readOnly }) {
  if (readOnly) {
    return (
      <div className="px-2.5 py-2 text-sm text-neutral-700 h-[38px] flex items-center">
        {value || <span className="text-neutral-300">—</span>}
      </div>
    );
  }
  if (column.type === "select") {
    return (
      <select value={value ?? ""} onChange={(e) => onChange(e.target.value)} className={CONTROL}>
        <option value="">—</option>
        {column.options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    );
  }
  return (
    <input
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={column.label}
      className={CONTROL}
    />
  );
}

function SubjectTable({ programme, subjects, onChange, readOnly }) {
  const columns = programmeColumns(programme);

  // The grid is built from the columns actually being shown, so the
  // header cells line up with the controls beneath them whichever
  // programme is selected — and the delete column only takes space when
  // there is a delete button in it.
  const widths = isIbProgramme(programme) ? "1fr 7rem 9rem" : "1fr 9rem";
  const grid = { gridTemplateColumns: readOnly ? widths : `${widths} 2rem` };

  function update(i, key, value) {
    onChange(subjects.map((s, idx) => (idx === i ? { ...s, [key]: value } : s)));
  }

  if (readOnly && subjects.length === 0) {
    return <p className="text-sm text-neutral-400">No subjects added.</p>;
  }

  return (
    <div className="rounded-xl border border-line overflow-hidden bg-white/60">
      <div
        style={grid}
        className="grid gap-2 px-3 py-2 bg-sand/70 text-[11px] uppercase tracking-wide text-neutral-600"
      >
        {columns.map((c) => (
          <div key={c.key}>{c.label}</div>
        ))}
        {!readOnly && <div />}
      </div>

      <div className="divide-y divide-line">
        {subjects.map((row, i) => (
          <div key={i} style={grid} className="grid gap-2 px-3 py-2 items-center">
            {columns.map((c) => (
              <Cell
                key={c.key}
                column={c}
                value={row[c.key]}
                onChange={(v) => update(i, c.key, v)}
                readOnly={readOnly}
              />
            ))}
            {!readOnly && (
              <button
                type="button"
                onClick={() => onChange(subjects.filter((_, idx) => idx !== i))}
                className="text-neutral-300 hover:text-red-600 text-lg leading-none"
                aria-label="Remove subject"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      {!readOnly && (
        <div className="px-3 py-2 border-t border-line">
          <button
            type="button"
            onClick={() => onChange([...subjects, emptySubject()])}
            className="text-sm text-clay font-medium"
          >
            + Add subject
          </button>
        </div>
      )}
    </div>
  );
}

function Record({ record, onChange, onRemove, readOnly, userId, index }) {
  const options = programmesForYear(record.year);
  const programme = normaliseProgramme(record.programme);
  const other = isOtherProgramme(programme);

  // Changing the year can leave a programme the new year doesn't offer
  // (Grade 11's IB DP, then switched to Grade 9). Fall back to that
  // year's default rather than showing a selection that isn't in the list.
  function setYear(year) {
    const allowed = programmesForYear(year);
    const keep = allowed.includes(programme) ? record.programme : DEFAULT_PROGRAMME_BY_YEAR[year] ?? "";
    onChange({ ...record, year, programme: keep });
  }

  return (
    <div className="rounded-2xl border border-line bg-cream/50 p-4 relative">
      {!readOnly && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-3 right-3 text-neutral-400 hover:text-red-600"
          aria-label="Remove this year"
        >
          ×
        </button>
      )}

      <div className="grid sm:grid-cols-2 gap-3 pr-6 mb-4">
        <div>
          <label className="text-xs text-neutral-500">Grade / Year</label>
          {readOnly ? (
            <div className="px-1 py-2 text-sm">{record.year || "—"}</div>
          ) : (
            <select
              value={record.year ?? ""}
              onChange={(e) => setYear(e.target.value)}
              className={`mt-1 ${CONTROL}`}
            >
              <option value="">Select year</option>
              {YEAR_OPTIONS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="text-xs text-neutral-500">Programme</label>
          {readOnly ? (
            <div className="px-1 py-2 text-sm">
              {(other ? record.otherProgramme : record.programme) || "—"}
            </div>
          ) : (
            <select
              value={programme}
              onChange={(e) => onChange({ ...record, programme: e.target.value })}
              className={`mt-1 ${CONTROL}`}
            >
              <option value="">Select programme</option>
              {options.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          )}
        </div>

        {other && !readOnly && (
          <div className="sm:col-span-2">
            <label className="text-xs text-neutral-500">
              Which programme did you take?
            </label>
            <input
              value={record.otherProgramme ?? ""}
              onChange={(e) => onChange({ ...record, otherProgramme: e.target.value })}
              placeholder="ICSE, CBSE, MYP, State Board…"
              className={`mt-1 ${CONTROL}`}
            />
          </div>
        )}
      </div>

      {programme ? (
        <>
          <p className="text-xs text-neutral-500 mb-2">{programmeScaleHint(programme)}</p>
          <SubjectTable
            programme={programme}
            subjects={record.subjects || []}
            onChange={(subjects) => onChange({ ...record, subjects })}
            readOnly={readOnly}
          />
        </>
      ) : (
        <p className="text-sm text-neutral-500">
          Choose a programme to enter this year&apos;s subjects and grades.
        </p>
      )}

      <FileAttachments
        attachments={attachmentsOf(record)}
        onChange={(next) => onChange(withAttachments(record, next))}
        userId={userId}
        pathPrefix={`education-${index}`}
        readOnly={readOnly}
        label="Attach result slip / transcript"
      />
    </div>
  );
}

export default function EducationEditor({ records, onChange, readOnly = false, userId }) {
  const list = records || [];

  function replaceAt(i, next) {
    onChange(list.map((r, idx) => (idx === i ? next : r)));
  }

  if (readOnly && list.length === 0) {
    return <p className="text-sm text-neutral-400">No academic records added.</p>;
  }

  return (
    <div className="space-y-4">
      {list.map((record, i) => (
        <Record
          key={i}
          index={i}
          record={record}
          onChange={(next) => replaceAt(i, next)}
          onRemove={() => onChange(list.filter((_, idx) => idx !== i))}
          readOnly={readOnly}
          userId={userId}
        />
      ))}

      {!readOnly && (
        <div className="rounded-2xl border border-dashed border-line bg-white/40 p-4">
          <p className="text-sm font-medium mb-1">Add a year</p>
          <p className="text-xs text-neutral-500 mb-3">
            Add every year you have actually taken — including years at a
            previous school. You can add a year more than once if you sat
            more than one programme in it.
          </p>
          <div className="flex flex-wrap gap-2">
            {YEAR_OPTIONS.map((year) => (
              <button
                key={year}
                type="button"
                onClick={() => onChange([...list, emptyRecord(year)])}
                className="rounded-full border border-clay/30 bg-clay/10 text-clay px-3 py-1.5 text-sm font-medium hover:bg-clay/20 transition"
              >
                + {year}
              </button>
            ))}
            <button
              type="button"
              onClick={() => onChange([...list, emptyRecord()])}
              className="rounded-full border border-line px-3 py-1.5 text-sm font-medium text-neutral-600 hover:bg-white transition"
            >
              + Another entry
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
