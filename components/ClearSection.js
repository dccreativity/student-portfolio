"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import { clearSection } from "@/lib/adminActions";

// Clearing a single section of a student's portfolio.
//
// Shown to the super admin only, beside the section they are looking at,
// so the thing being cleared is the thing on screen. Two clicks rather
// than a typed confirmation: this undoes one section, not a whole
// portfolio, and making it as heavy as the full erase would only train
// people to click through warnings.
export default function ClearSection({ student, meta, onCleared }) {
  const supabase = createClient();
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  async function run() {
    setBusy(true);
    setResult(null);
    try {
      const { filesRemoved } = await clearSection(supabase, student.id, meta);
      setResult({
        ok: true,
        message:
          `${meta.label} cleared` +
          (filesRemoved > 0
            ? `, along with ${filesRemoved} file${filesRemoved === 1 ? "" : "s"}.`
            : "."),
      });
      setAsking(false);
      onCleared?.();
    } catch (err) {
      setResult({ ok: false, message: err.message || "That didn't work." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 pt-4 border-t border-line">
      {!asking ? (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setAsking(true);
              setResult(null);
            }}
            className="text-sm font-medium text-red-700 hover:text-red-800 hover:underline"
          >
            Clear this section
          </button>
          <span className="text-xs text-neutral-500">
            Empties {meta.label} only — the rest of the portfolio is untouched.
          </span>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-red-800">
            Clear <span className="font-medium">{meta.label}</span> for{" "}
            {student.full_name || student.email}? This cannot be undone.
          </span>
          <button
            type="button"
            onClick={run}
            disabled={busy}
            className="rounded-xl bg-red-600 text-white px-3.5 py-1.5 text-sm font-medium hover:bg-red-700 transition disabled:opacity-50"
          >
            {busy ? "Clearing…" : "Yes, clear it"}
          </button>
          <button
            type="button"
            onClick={() => setAsking(false)}
            disabled={busy}
            className="rounded-xl border border-line px-3.5 py-1.5 text-sm font-medium text-neutral-600 hover:bg-white transition disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      )}

      {result && (
        <p
          className={`text-sm mt-2 ${
            result.ok ? "text-emerald-700" : "text-red-700 font-medium"
          }`}
        >
          {result.message}
        </p>
      )}
    </div>
  );
}
