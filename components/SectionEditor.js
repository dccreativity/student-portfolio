"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import { getSectionMeta } from "@/lib/sectionSchema";

const BUCKET = "portfolio-media";

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

// Every entry in a repeatable section can carry one supporting file —
// a certificate photo, an award PDF, a project demo video, etc. Stored
// in the same Storage bucket the galleries use, so no new bucket/policy
// is needed: the path still starts with the student's own user id.
function AttachmentSlot({ entry, onAttach, onRemove, userId, pathPrefix, readOnly }) {
  const supabase = createClient();
  const fileInput = useRef(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    const path = `${userId}/${pathPrefix}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file);
    setUploading(false);
    if (error) {
      alert(`Upload failed: ${error.message}`);
      return;
    }
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    onAttach(data.publicUrl, file.name);
    if (fileInput.current) fileInput.current.value = "";
  }

  if (readOnly) {
    if (!entry.attachment_url) return null;
    return (
      <a
        href={entry.attachment_url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 text-xs text-clay underline mt-2"
      >
        📎 {entry.attachment_name || "View attachment"}
      </a>
    );
  }

  return (
    <div className="mt-2">
      {entry.attachment_url ? (
        <div className="flex items-center gap-2 text-xs text-neutral-600">
          <a href={entry.attachment_url} target="_blank" rel="noreferrer" className="text-clay underline">
            📎 {entry.attachment_name || "Attachment"}
          </a>
          <button onClick={onRemove} className="text-neutral-400 hover:text-red-600">
            Remove
          </button>
        </div>
      ) : (
        <label className="inline-block text-xs text-clay font-medium cursor-pointer">
          {uploading ? "Uploading…" : "+ Attach file (image, PDF, or video)"}
          <input
            ref={fileInput}
            type="file"
            accept="image/*,video/*,application/pdf"
            onChange={handleFile}
            disabled={uploading}
            className="hidden"
          />
        </label>
      )}
    </div>
  );
}

function RepeatableTable({ fields, entries, onChange, readOnly, userId, pathPrefix }) {
  function update(i, key, value) {
    onChange(entries.map((e, idx) => (idx === i ? { ...e, [key]: value } : e)));
  }
  function add() {
    onChange([...entries, emptyEntry(fields)]);
  }
  function remove(i) {
    onChange(entries.filter((_, idx) => idx !== i));
  }
  function attachFile(i, url, name) {
    update(i, "attachment_url", url);
    update(i, "attachment_name", name);
  }
  function removeAttachment(i) {
    update(i, "attachment_url", "");
    update(i, "attachment_name", "");
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
                  onChange={(v) => update(i, f.key, v)}
                  readOnly={readOnly}
                />
              </div>
            ))}
          </div>
          <AttachmentSlot
            entry={entry}
            onAttach={(url, name) => attachFile(i, url, name)}
            onRemove={() => removeAttachment(i)}
            userId={userId}
            pathPrefix={pathPrefix}
            readOnly={readOnly}
          />
        </div>
      ))}
      {!readOnly && (
        <button onClick={add} className="text-sm text-clay font-medium">
          + Add entry
        </button>
      )}
    </div>
  );
}

// `readOnly` is used by the admin's per-student view: admins can see every
// field but cannot save changes, per the school's requirement that admins
// only observe what students have added, never edit or delete it.
export default function SectionEditor({ userId, sectionKey, readOnly = false }) {
  const supabase = createClient();
  const meta = getSectionMeta(sectionKey);

  const [content, setContent] = useState(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let channel;

    async function load() {
      const { data: row } = await supabase
        .from("portfolio_data")
        .select("content")
        .eq("user_id", userId)
        .eq("section", sectionKey)
        .maybeSingle();

      setContent(row?.content ?? defaultContent());
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
            const row = payload.new;
            if (!row || row.section !== sectionKey) return;
            setContent(row.content);
            setStatus("Updated elsewhere — synced.");
            setTimeout(() => setStatus(""), 2000);
          }
        )
        .subscribe();
    }

    function defaultContent() {
      if (meta.type === "single") return {};
      if (meta.type === "repeatable") return { entries: [] };
      if (meta.type === "mixed") {
        const base = {};
        meta.repeatableGroups.forEach((g) => (base[g.key] = []));
        return base;
      }
      return {};
    }

    load();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [sectionKey, userId]);

  async function handleSave() {
    setStatus("Saving…");
    const { error } = await supabase.from("portfolio_data").upsert(
      {
        user_id: userId,
        section: sectionKey,
        content,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,section" }
    );
    setStatus(error ? `Error: ${error.message}` : "Saved ✓");
    setTimeout(() => setStatus(""), 2000);
  }

  if (loading || !content) return <p className="text-neutral-500">Loading…</p>;

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
                onChange={(v) => setContent({ ...content, [f.key]: v })}
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
          onChange={(entries) => setContent({ ...content, entries })}
          readOnly={readOnly}
          userId={userId}
          pathPrefix={sectionKey}
        />
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
                  onChange={(v) => setContent({ ...content, [f.key]: v })}
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
                onChange={(entries) => setContent({ ...content, [group.key]: entries })}
                readOnly={readOnly}
                userId={userId}
                pathPrefix={`${sectionKey}-${group.key}`}
              />
            </div>
          ))}
        </div>
      )}

      {!readOnly && (
        <div className="flex items-center gap-4 mt-8">
          <button
            onClick={handleSave}
            className="rounded-xl bg-ink text-white px-5 py-2.5 text-sm font-medium hover:bg-black transition"
          >
            Save changes
          </button>
          {status && <span className="text-sm text-neutral-500">{status}</span>}
        </div>
      )}
    </div>
  );
}
