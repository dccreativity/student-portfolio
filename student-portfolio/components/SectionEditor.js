"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import { getSectionMeta } from "@/lib/sectionSchema";

function emptyEntry(fields) {
  const e = {};
  fields.forEach((f) => (e[f.key] = ""));
  return e;
}

function FieldInput({ field, value, onChange }) {
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

function RepeatableTable({ fields, entries, onChange }) {
  function update(i, key, value) {
    onChange(entries.map((e, idx) => (idx === i ? { ...e, [key]: value } : e)));
  }
  function add() {
    onChange([...entries, emptyEntry(fields)]);
  }
  function remove(i) {
    onChange(entries.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-4">
      {entries.map((entry, i) => (
        <div key={i} className="rounded-2xl border border-line bg-cream/50 p-4 relative">
          <button
            onClick={() => remove(i)}
            className="absolute top-3 right-3 text-neutral-400 hover:text-red-600"
            aria-label="Remove entry"
          >
            ×
          </button>
          <div className="grid sm:grid-cols-2 gap-3 pr-6">
            {fields.map((f) => (
              <div key={f.key} className={f.long ? "sm:col-span-2" : ""}>
                <label className="text-xs text-neutral-500">{f.label}</label>
                <FieldInput
                  field={f}
                  value={entry[f.key] ?? ""}
                  onChange={(v) => update(i, f.key, v)}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
      <button onClick={add} className="text-sm text-clay font-medium">
        + Add entry
      </button>
    </div>
  );
}

export default function SectionEditor({ userId, sectionKey }) {
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
      {meta.type === "single" && (
        <div className="grid sm:grid-cols-2 gap-4">
          {meta.fields.map((f) => (
            <div key={f.key} className={f.long ? "sm:col-span-2" : ""}>
              <label className="text-xs text-neutral-500">{f.label}</label>
              <FieldInput
                field={f}
                value={content[f.key] ?? ""}
                onChange={(v) => setContent({ ...content, [f.key]: v })}
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
              />
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-4 mt-8">
        <button
          onClick={handleSave}
          className="rounded-xl bg-ink text-white px-5 py-2.5 text-sm font-medium hover:bg-black transition"
        >
          Save changes
        </button>
        {status && <span className="text-sm text-neutral-500">{status}</span>}
      </div>
    </div>
  );
}
