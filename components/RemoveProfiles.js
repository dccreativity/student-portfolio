"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import { removeStudents } from "@/lib/adminActions";

// Removing student accounts from the lists the admin browses them in.
//
// Deliberately a mode rather than a button on every row. Deleting a
// profile is the most destructive thing this site can do, and a row of
// permanent delete buttons sitting next to "View" is an accident waiting
// for a mis-click. So nothing is removable until someone asks for it:
// press "Delete a profile", tick the students, press the button, and
// confirm in a dialog that names every account about to go.
//
// The state lives in a hook because the same selection has to drive two
// different lists — the grouped one on the dashboard and the grade
// completion table — and both need to agree on what is ticked.

export function useProfileRemoval({ students, onRemoved }) {
  const supabase = createClient();
  const [active, setActive] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const visibleIds = useMemo(() => students.map((s) => s.id).join(","), [students]);

  // Searching or changing grade changes who is on screen. Ticks follow
  // what is visible, so nobody can be deleted from behind a filter they
  // were scrolled away from.
  useEffect(() => {
    const visible = new Set(visibleIds ? visibleIds.split(",") : []);
    setSelectedIds((prev) => {
      const kept = new Set([...prev].filter((id) => visible.has(id)));
      return kept.size === prev.size ? prev : kept;
    });
  }, [visibleIds]);

  const chosen = students.filter((s) => selectedIds.has(s.id));

  function start() {
    setActive(true);
    setResult(null);
  }

  function cancel() {
    setActive(false);
    setConfirming(false);
    setSelectedIds(new Set());
  }

  function toggle(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelectedIds((prev) =>
      prev.size === students.length ? new Set() : new Set(students.map((s) => s.id))
    );
  }

  async function confirm() {
    setBusy(true);
    setResult(null);
    try {
      const { removed, filesRemoved } = await removeStudents(supabase, chosen);
      setResult({
        ok: true,
        message:
          `${removed} profile${removed === 1 ? "" : "s"} removed` +
          (filesRemoved > 0
            ? `, along with ${filesRemoved} uploaded file${filesRemoved === 1 ? "" : "s"}.`
            : ".") +
          (removed < chosen.length
            ? ` ${chosen.length - removed} could not be removed — only student accounts can be deleted here.`
            : ""),
      });
      setSelectedIds(new Set());
      setConfirming(false);
      setActive(false);
      onRemoved?.();
    } catch (err) {
      setResult({ ok: false, message: err.message || "That didn't work." });
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  }

  return {
    active,
    chosen,
    confirming,
    busy,
    result,
    allSelected: students.length > 0 && selectedIds.size === students.length,
    isSelected: (id) => selectedIds.has(id),
    start,
    cancel,
    toggle,
    toggleAll,
    ask: () => setConfirming(true),
    dismiss: () => setConfirming(false),
    confirm,
  };
}

// The control that turns the mode on, and once on, the one that acts.
export function RemoveProfilesBar({ removal }) {
  const { active, chosen } = removal;

  return (
    <div className="mt-3">
      {!active ? (
        <button
          type="button"
          onClick={removal.start}
          className="rounded-xl border border-red-200 bg-white px-3.5 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 transition"
        >
          Delete a profile
        </button>
      ) : (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-red-200 bg-red-50/70 px-3 py-2">
          <span className="text-sm text-red-900">
            {chosen.length === 0
              ? "Tick the students to remove."
              : `${chosen.length} student${chosen.length === 1 ? "" : "s"} selected.`}
          </span>
          <button
            type="button"
            onClick={removal.toggleAll}
            className="text-xs font-medium text-red-700 hover:underline"
          >
            {removal.allSelected ? "Clear all" : "Select all"}
          </button>
          <span className="flex-1" />
          <button
            type="button"
            onClick={removal.ask}
            disabled={chosen.length === 0}
            className="rounded-xl bg-red-600 text-white px-3.5 py-1.5 text-sm font-medium hover:bg-red-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Delete selected
          </button>
          <button
            type="button"
            onClick={removal.cancel}
            className="rounded-xl border border-red-200 bg-white px-3.5 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 transition"
          >
            Cancel
          </button>
        </div>
      )}

      {removal.result && (
        <p
          className={`text-sm mt-2 ${
            removal.result.ok ? "text-emerald-700" : "text-red-700 font-medium"
          }`}
        >
          {removal.result.message}
        </p>
      )}
    </div>
  );
}

// The tick box in front of a student's name. Renders nothing until the
// mode is on, so the lists look exactly as they did before.
export function RemoveCheckbox({ removal, student, className = "" }) {
  if (!removal?.active) return null;

  return (
    <input
      type="checkbox"
      checked={removal.isSelected(student.id)}
      onChange={() => removal.toggle(student.id)}
      onClick={(e) => e.stopPropagation()}
      aria-label={`Select ${student.full_name || student.email} for removal`}
      className={`w-4 h-4 shrink-0 accent-red-600 cursor-pointer ${className}`}
    />
  );
}

// The last step: every account about to go, written out by name, because
// this is the point where a wrong tick still costs nothing to undo.
export function RemoveProfilesDialog({ removal }) {
  const { confirming, chosen, busy } = removal;

  useEffect(() => {
    if (!confirming) return;
    function onKey(e) {
      if (e.key === "Escape" && !busy) removal.dismiss();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirming, busy]);

  if (!confirming) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="remove-profiles-title"
      className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4"
      onClick={() => !busy && removal.dismiss()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl bg-white border border-red-200 shadow-xl p-6"
      >
        <h3 id="remove-profiles-title" className="font-display text-xl text-red-900">
          Remove {chosen.length === 1 ? "this profile" : `these ${chosen.length} profiles`}?
        </h3>
        <p className="text-sm text-neutral-600 mt-2">
          {chosen.length === 1 ? "This account" : "These accounts"} and everything
          in {chosen.length === 1 ? "it" : "them"} — every section, every uploaded
          file — will be deleted. This cannot be undone.
        </p>

        <ul className="mt-4 max-h-56 overflow-y-auto rounded-2xl border border-line divide-y divide-line">
          {chosen.map((s) => (
            <li key={s.id} className="px-3 py-2">
              <p className="text-sm font-medium truncate">
                {s.full_name || "Unnamed student"}
              </p>
              <p className="text-xs text-neutral-500 truncate">
                {s.grade ? `Grade ${s.grade} · ` : ""}
                {s.email}
              </p>
            </li>
          ))}
        </ul>

        <div className="flex justify-end gap-2 mt-5">
          <button
            type="button"
            onClick={removal.dismiss}
            disabled={busy}
            className="rounded-xl border border-line px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-cream transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={removal.confirm}
            disabled={busy}
            className="rounded-xl bg-red-600 text-white px-4 py-2 text-sm font-medium hover:bg-red-700 transition disabled:opacity-50"
          >
            {busy ? "Removing…" : "Yes, remove permanently"}
          </button>
        </div>
      </div>
    </div>
  );
}
