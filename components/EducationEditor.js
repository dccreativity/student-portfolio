"use client";

import {
  GRADE_OPTIONS,
  PROGRAMMES,
  expectedRecords,
  isIbProgramme,
  programmeColumns,
} from "@/lib/constants";
import { attachmentsOf, withAttachments } from "@/lib/uploads";
import FileAttachments from "@/components/FileAttachments";

// One academic year per record: the year, the programme sat that year,
// and that year's subject results. The programme decides the table's
// columns — Cambridge programmes are marked A*-U on a subject/grade
// pair, the IB adds an SL/HL column and is marked 1-7.
//
// Subject is free text in every case: no fixed list covers the
// combinations students actually take.

export function emptyRecord(programme = "", year = "") {
  return { year, programme, subjects: [emptySubject()] };
}

function emptySubject() {
  return { subject: "", level: "", grade: "" };
}

function Cell({ column, value, onChange, readOnly }) {
  if (readOnly) {
    return (
      <div className="px-3 py-2 text-sm text-neutral-700 min-h-[38px]">
        {value || <span className="text-neutral-300">—</span>}
      </div>
    );
  }
  if (column.type === "select") {
    return (
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-line bg-white/80 px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-clay"
      >
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
      className="w-full rounded-lg border border-line bg-white/80 px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-clay"
    />
  );
}

function SubjectTable({ programme, subjects, onChange, readOnly }) {
  const columns = programmeColumns(programme);
  const grid = isIbProgramme(programme)
    ? "grid-cols-[1fr_7rem_9rem_2rem]"
    : "grid-cols-[1fr_9rem_2rem]";

  function update(i, key, value) {
    onChange(subjects.map((s, idx) => (idx === i ? { ...s, [key]: value } : s)));
  }

  if (readOnly && subjects.length === 0) {
    return <p className="text-sm text-neutral-400">No subjects added.</p>;
  }

  return (
    <div className="rounded-xl border border-line overflow-hidden bg-white/60">
      <div className={`grid ${grid} gap-2 px-3 py-2 bg-sand/70 text-[11px] uppercase tracking-wide text-neutral-600`}>
        {columns.map((c) => (
          <div key={c.key}>{c.label}</div>
        ))}
        {!readOnly && <div />}
      </div>

      <div className="divide-y divide-line">
        {subjects.map((row, i) => (
          <div key={i} className={`grid ${grid} gap-2 px-3 py-2 items-center`}>
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
  const columns = programmeColumns(record.programme);

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
              onChange={(e) => onChange({ ...record, year: e.target.value })}
              className="mt-1 w-full rounded-xl border border-line bg-white/80 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-clay"
            >
              <option value="">Select year</option>
              {GRADE_OPTIONS.map((g) => (
                <option key={g} value={`Grade ${g}`}>
                  Grade {g}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="text-xs text-neutral-500">Programme</label>
          {readOnly ? (
            <div className="px-1 py-2 text-sm">{record.programme || "—"}</div>
          ) : (
            <select
              value={record.programme ?? ""}
              onChange={(e) => onChange({ ...record, programme: e.target.value })}
              className="mt-1 w-full rounded-xl border border-line bg-white/80 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-clay"
            >
              <option value="">Select programme</option>
              {PROGRAMMES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {record.programme ? (
        <>
          <p className="text-xs text-neutral-500 mb-2">
            {isIbProgramme(record.programme)
              ? "Marked 1–7, with each subject taken at SL or HL."
              : "Marked A* to U."}
          </p>
          <SubjectTable
            programme={record.programme}
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

export default function EducationEditor({
  records,
  onChange,
  studentGrade,
  readOnly = false,
  userId,
}) {
  const list = records || [];

  // A student's grade implies which programmes they are sitting and which
  // they must already have finished. Those are offered as one-click
  // additions — never added for them, since a Grade 12 student is on
  // either the A Level or the IB track, not both.
  const suggestions = expectedRecords(studentGrade).filter(
    (s) => !list.some((r) => r.programme === s.programme)
  );

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
        <div className="space-y-3">
          {suggestions.length > 0 && (
            <div className="rounded-2xl border border-dashed border-line bg-white/40 p-4">
              <p className="text-sm font-medium mb-1">
                {studentGrade ? `Expected for Grade ${studentGrade}` : "Add a year"}
              </p>
              <p className="text-xs text-neutral-500 mb-3">
                Add the years you have actually taken. A Grade 12 student is on
                either the A Level or the IB track — add the one that applies.
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s.programme}
                    type="button"
                    onClick={() => onChange([...list, emptyRecord(s.programme, s.year)])}
                    className="rounded-full border border-clay/30 bg-clay/10 text-clay px-3 py-1.5 text-sm font-medium hover:bg-clay/20 transition"
                  >
                    + {s.year} — {s.programme}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => onChange([...list, emptyRecord()])}
            className="text-sm text-clay font-medium"
          >
            + Add another year
          </button>
        </div>
      )}
    </div>
  );
}
