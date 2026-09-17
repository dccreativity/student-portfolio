"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import { erasePortfolio } from "@/lib/adminActions";

// Wiping a student's portfolio back to empty.
//
// Shown to the super admin only, and hidden behind two deliberate steps:
// the controls stay collapsed until asked for, and the student's own name
// has to be typed before the button will work. That second step is the
// one that matters — it guards against the real mistake here, which is
// not mis-clicking but doing this on the wrong student's page.
export default function ErasePortfolio({ student, onErased }) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const expected = (student.full_name || student.email || "").trim();
  const matches = typed.trim().toLowerCase() === expected.toLowerCase() && expected !== "";

  async function run() {
    setBusy(true);
    setResult(null);
    try {
      const { filesRemoved } = await erasePortfolio(supabase, student.id);
      setResult({
        ok: true,
        message:
          `Portfolio erased — every section is empty and ${filesRemoved} ` +
          `uploaded file${filesRemoved === 1 ? " was" : "s were"} deleted. ` +
          `${expected} can still sign in; they will find a blank portfolio.`,
      });
      setTyped("");
      setOpen(false);
      onErased?.();
    } catch (err) {
      setResult({ ok: false, message: err.message || "That didn't work." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-3xl border border-red-200 bg-red-50/60 p-6 mb-6">
      <h3 className="font-medium text-red-900">Erase this portfolio</h3>
      <p className="text-xs text-red-800/80 mt-0.5 max-w-2xl">
        Empties all 17 sections and deletes every file {expected} has
        uploaded. Their account, name, grade and UID are kept, so they can
        sign in as usual and start again from blank. This cannot be undone.
      </p>

      {!open ? (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setResult(null);
          }}
          className="mt-4 rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 transition"
        >
          Erase portfolio…
        </button>
      ) : (
        <div className="mt-4">
          <label className="block text-sm text-red-900 mb-1.5">
            Type <span className="font-semibold">{expected}</span> to confirm
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={expected}
              autoComplete="off"
              className="flex-1 min-w-[14rem] rounded-xl border border-red-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-400"
            />
            <button
              type="button"
              onClick={run}
              disabled={!matches || busy}
              className="rounded-xl bg-red-600 text-white px-4 py-2 text-sm font-medium hover:bg-red-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {busy ? "Erasing…" : "Erase everything"}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setTyped("");
              }}
              disabled={busy}
              className="rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-white transition disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {result && (
        <p
          className={`text-sm mt-3 ${
            result.ok ? "text-emerald-800" : "text-red-700 font-medium"
          }`}
        >
          {result.message}
        </p>
      )}
    </section>
  );
}
