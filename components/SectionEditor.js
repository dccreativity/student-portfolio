"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import { getSectionMeta } from "@/lib/sectionSchema";
import { attachmentsOf, withAttachments } from "@/lib/uploads";
import FileAttachments from "@/components/FileAttachments";
import EducationEditor from "@/components/EducationEditor";

function emptyEntry(fields) {
  const e = {};
  fields.forEach((f) => (e[f.key] = ""));
  return e;
}

function FieldInput({ field, value, onChange, readOnly }) {
  if (readOnly) {
    return (
      <div className="w-full rounded-xl border border-line bg-cream/40 px-3 py-2 text-sm min-h-[38px] text-neutral-700 whitespace-pre-wrap">
        {value || <span className="text-neutral-400">—</span>}
      </div>
    );
  }
  if (field.long) {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.label}
        rows={4}
        className="w-full rounded-xl border border-line bg-white/80 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-clay"
      />
    );
  }
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.label}
      className="w-full rounded-xl border border-line bg-white/80 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-clay"
    />
  );
}

function RepeatableTable({ fields, entries, onChange, readOnly, userId, pathPrefix }) {
  function update(i, changes) {
    onChange(entries.map((e, idx) => (idx === i ? { ...e, ...changes } : e)));
  }
  function replaceEntry(i, next) {
    onChange(entries.map((e, idx) => (idx === i ? next : e)));
  }
  function add() {
    onChange([...entries, emptyEntry(fields)]);
  }
  function remove(i) {
    onChange(entries.filter((_, idx) => idx !== i));
  }

  if (readOnly && entries.length === 0) {
    return <p className="text-sm text-neutral-400">Nothing added yet.</p>;
  }

  return (
    <div className="space-y-4">
      {entries.map((entry, i) => (
        <div key={i} className="rounded-2xl border border-line bg-cream/50 p-4 relative">
          {!readOnly && (
            <button
              type="button"
              onClick={() => remove(i)}
              className="absolute top-3 right-3 text-neutral-400 hover:text-red-600"
              aria-label="Remove entry"
            >
              ×
            </button>
          )}
          <div className="grid sm:grid-cols-2 gap-3 pr-6">
            {fields.map((f) => (
              <div key={f.key} className={f.long ? "sm:col-span-2" : ""}>
                <label className="text-xs text-neutral-500">{f.label}</label>
                <FieldInput
                  field={f}
                  value={entry[f.key] ?? ""}
                  onChange={(v) => update(i, { [f.key]: v })}
                  readOnly={readOnly}
                />
              </div>
            ))}
          </div>
          <FileAttachments
            attachments={attachmentsOf(entry)}
            // Replace the whole entry in one call. Two chained updates
            // would both read the same stale entries array, which is what
            // used to silently drop the uploaded file's URL.
            onChange={(next) => replaceEntry(i, withAttachments(entry, next))}
            userId={userId}
            pathPrefix={pathPrefix}
            readOnly={readOnly}
            label="Attach proof / evidence"
          />
        </div>
      ))}
      {!readOnly && (
        <button type="button" onClick={add} className="text-sm text-clay font-medium">
          + Add entry
        </button>
      )}
    </div>
  );
}

// `readOnly` is used by the admin's per-student view: admins can see every
// field but cannot save changes, per the school's requirement that admins
// only observe what students have added, never edit or delete it.
export default function SectionEditor({ userId, sectionKey, studentGrade, readOnly = false }) {
  const supabase = createClient();
  const meta = getSectionMeta(sectionKey);

  const [content, setContent] = useState(null);
  const [status, setStatus] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Read inside the realtime callback without re-subscribing on every
  // keystroke.
  const dirtyRef = useRef(false);
  dirtyRef.current = dirty;

  // The realtime stream echoes our own save straight back. Remember what
  // we last wrote so that echo doesn't get reported as someone else's
  // edit a second after the student pressed Save.
  const lastSavedRef = useRef(null);

  const edit = useCallback((updater) => {
    setContent((prev) => (typeof updater === "function" ? updater(prev) : updater));
    setDirty(true);
    setStatus("");
  }, []);

  useEffect(() => {
    let channel;
    let cancelled = false;

    function defaultContent() {
      if (meta.type === "single") return {};
      if (meta.type === "repeatable") return { entries: [] };
      if (meta.type === "education") return { records: [] };
      if (meta.type === "mixed") {
        const base = {};
        meta.repeatableGroups.forEach((g) => (base[g.key] = []));
        return base;
      }
      return {};
    }

    // Education used to store a flat list of {year, subject, grade} rows
    // plus a separate diploma-course list. Fold those into the per-year
    // records the section uses now, so nothing a student already entered
    // is lost the first time they open the page.
    function migrate(content) {
      if (!content || meta.type !== "education") return content;
      if (Array.isArray(content.records)) return content;

      const byYear = new Map();
      (content.grades || []).forEach((g) => {
        const year = String(g.year || "").trim() || "Earlier";
        if (!byYear.has(year)) byYear.set(year, []);
        byYear.get(year).push({ subject: g.subject || "", level: "", grade: g.grade || "" });
      });

      const records = [...byYear.entries()].map(([year, subjects]) => ({
        year,
        programme: "",
        subjects,
      }));

      const courses = content.diploma_courses || [];
      if (courses.length > 0) {
        records.push({
          year: "",
          programme: "IBDP 1",
          subjects: courses.map((c) => ({
            subject: c.course || "",
            level: c.level || "",
            grade: "",
          })),
        });
      }

      const next = { ...content, records };
      delete next.grades;
      delete next.diploma_courses;
      return next;
    }

    async function load() {
      const { data: row } = await supabase
        .from("portfolio_data")
        .select("content")
        .eq("user_id", userId)
        .eq("section", sectionKey)
        .maybeSingle();

      if (cancelled) return;
      setContent(migrate(row?.content) ?? defaultContent());
      setDirty(false);
      setLoading(false);

      channel = supabase
        .channel(`section-${sectionKey}-${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "portfolio_data",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const changed = payload.new;
            if (!changed || changed.section !== sectionKey) return;
            if (JSON.stringify(changed.content) === lastSavedRef.current) return;
            // Never clobber what the student is part-way through typing —
            // their own unsaved work outranks an echo from another tab.
            if (dirtyRef.current) {
              setStatus("This section changed in another tab. Save to keep your version.");
              return;
            }
            setContent(changed.content);
            setStatus("Updated elsewhere — synced.");
            setTimeout(() => setStatus(""), 2500);
          }
        )
        .subscribe();
    }

    load();
    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [sectionKey, userId]);

  // Browsers only show their own generic prompt, but it is enough to stop
  // a student losing a long entry by closing the tab before saving.
  useEffect(() => {
    if (readOnly) return undefined;
    function warn(e) {
      if (!dirtyRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [readOnly]);

  async function handleSave() {
    setSaving(true);
    setStatus("Saving…");
    lastSavedRef.current = JSON.stringify(content);
    const { error } = await supabase.from("portfolio_data").upsert(
      {
        user_id: userId,
        section: sectionKey,
        content,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,section" }
    );
    setSaving(false);

    if (error) {
      setStatus(`Couldn't save: ${error.message}`);
      return;
    }
    setDirty(false);
    setStatus("Saved ✓");
    setTimeout(() => setStatus((s) => (s === "Saved ✓" ? "" : s)), 2500);
  }

  if (loading || !content) return <p className="text-neutral-500">Loading…</p>;

  const sectionAttachments = Array.isArray(content.attachments) ? content.attachments : [];

  return (
    <div>
      {readOnly && (
        <p className="text-xs uppercase tracking-wide text-neutral-400 mb-4">View only</p>
      )}

      {meta.type === "single" && (
        <div className="grid sm:grid-cols-2 gap-4">
          {meta.fields.map((f) => (
            <div key={f.key} className={f.long ? "sm:col-span-2" : ""}>
              <label className="text-xs text-neutral-500">{f.label}</label>
              <FieldInput
                field={f}
                value={content[f.key] ?? ""}
                onChange={(v) => edit((prev) => ({ ...prev, [f.key]: v }))}
                readOnly={readOnly}
              />
            </div>
          ))}
        </div>
      )}

      {meta.type === "repeatable" && (
        <RepeatableTable
          fields={meta.fields}
          entries={content.entries || []}
          onChange={(entries) => edit((prev) => ({ ...prev, entries }))}
          readOnly={readOnly}
          userId={userId}
          pathPrefix={sectionKey}
        />
      )}

      {meta.type === "education" && (
        <div className="space-y-8">
          <div className="grid sm:grid-cols-2 gap-4">
            {meta.fields.map((f) => (
              <div key={f.key}>
                <label className="text-xs text-neutral-500">{f.label}</label>
                <FieldInput
                  field={f}
                  value={content[f.key] ?? ""}
                  onChange={(v) => edit((prev) => ({ ...prev, [f.key]: v }))}
                  readOnly={readOnly}
                />
              </div>
            ))}
          </div>

          <div>
            <h3 className="font-medium mb-1">Academic record</h3>
            <p className="text-sm text-neutral-500 mb-3">
              One entry per year, with the programme you sat and the grades you
              achieved in it.
            </p>
            <EducationEditor
              records={content.records || []}
              onChange={(records) => edit((prev) => ({ ...prev, records }))}
              studentGrade={studentGrade}
              readOnly={readOnly}
              userId={userId}
            />
          </div>
        </div>
      )}

      {meta.type === "mixed" && (
        <div className="space-y-8">
          <div className="grid sm:grid-cols-2 gap-4">
            {meta.fields.map((f) => (
              <div key={f.key}>
                <label className="text-xs text-neutral-500">{f.label}</label>
                <FieldInput
                  field={f}
                  value={content[f.key] ?? ""}
                  onChange={(v) => edit((prev) => ({ ...prev, [f.key]: v }))}
                  readOnly={readOnly}
                />
              </div>
            ))}
          </div>

          {meta.repeatableGroups.map((group) => (
            <div key={group.key}>
              <h3 className="font-medium mb-3">{group.label}</h3>
              <RepeatableTable
                fields={group.fields}
                entries={content[group.key] || []}
                onChange={(entries) => edit((prev) => ({ ...prev, [group.key]: entries }))}
                readOnly={readOnly}
                userId={userId}
                pathPrefix={`${sectionKey}-${group.key}`}
              />
            </div>
          ))}
        </div>
      )}

      {/* Section-level files. Repeatable sections attach evidence per
          entry above; the single/mixed sections (Header, Objective,
          Education) had no upload option at all before this. */}
      {(meta.type === "single" || meta.type === "mixed" || meta.type === "education") && (
        <div className="mt-6 border-t border-line pt-4">
          <p className="text-xs text-neutral-500">Supporting documents</p>
          <FileAttachments
            attachments={sectionAttachments}
            onChange={(next) => edit((prev) => ({ ...prev, attachments: next }))}
            userId={userId}
            pathPrefix={sectionKey}
            readOnly={readOnly}
            label="Attach files"
          />
        </div>
      )}

      {!readOnly && (
        <div className="sticky bottom-0 -mx-6 md:-mx-0 mt-8 bg-cream/85 backdrop-blur border-t border-line px-6 md:px-0 py-4 flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !dirty}
            className="rounded-xl bg-ink text-white px-5 py-2.5 text-sm font-medium hover:bg-black transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? "Saving…" : dirty ? "Save changes" : "Saved"}
          </button>
          {dirty && !saving && (
            <span className="text-sm text-clay font-medium">
              You have unsaved changes in this section.
            </span>
          )}
          {status && <span className="text-sm text-neutral-500">{status}</span>}
        </div>
      )}
    </div>
  );
}
