"use client";

import { useCallback, useEffect, useState } from "react";

// Super-admin account repairs, shown on a student's page.
//
// This exists so that a forgotten password never depends on the school's
// mail server being willing to send. The super admin types a new password,
// tells the student, and the student logs in — no email anywhere in the
// loop.
//
// The button only calls the API; the API decides whether the caller is
// allowed. Hiding this panel is a courtesy to ordinary admins, not the
// security boundary.
export default function AccountTools({ student }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [state, setState] = useState(null);

  const refreshState = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/account?userId=${student.id}`);
      if (response.ok) setState(await response.json());
    } catch {
      // Not knowing the confirmation state only costs the hint below.
    }
  }, [student.id]);

  useEffect(() => {
    refreshState();
  }, [refreshState]);

  async function call(action, extra = {}) {
    setBusy(true);
    setResult(null);
    try {
      const response = await fetch("/api/admin/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, userId: student.id, ...extra }),
      });
      const data = await response.json();
      setResult(
        response.ok
          ? { ok: true, message: data.message }
          : { ok: false, message: data.error || "That didn't work." }
      );
      if (response.ok) {
        if (action === "set_password") setPassword("");
        refreshState();
      }
    } catch {
      setResult({ ok: false, message: "Couldn't reach the server. Try again." });
    } finally {
      setBusy(false);
    }
  }

  // A password worth handing over: readable aloud, no ambiguous characters.
  function suggest() {
    const words = ["Falcon", "Harbour", "Lantern", "Meadow", "Compass", "Juniper", "Marble", "Orchid"];
    const word = words[Math.floor(Math.random() * words.length)];
    setPassword(`${word}-${Math.floor(1000 + Math.random() * 9000)}`);
    setResult(null);
  }

  return (
    <section className="bg-white/70 border border-line rounded-3xl p-6 mb-6">
      <h3 className="font-medium">Account</h3>
      <p className="text-xs text-neutral-500 mt-0.5 mb-4">
        Set a password for {student.full_name || "this student"} and tell them
        what it is. Nothing is emailed, so this works even when the school&apos;s
        mail server does not.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setResult(null);
          }}
          placeholder="New password (at least 8 characters)"
          className="flex-1 min-w-[16rem] rounded-xl border border-line bg-white/80 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-clay"
        />
        <button
          type="button"
          onClick={suggest}
          disabled={busy}
          className="rounded-xl border border-line px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-white transition disabled:opacity-50"
        >
          Suggest one
        </button>
        <button
          type="button"
          onClick={() => call("set_password", { password })}
          disabled={busy || password.length < 8}
          className="rounded-xl bg-ink text-white px-4 py-2 text-sm font-medium hover:bg-inkDeep transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {busy ? "Saving…" : "Set password"}
        </button>
      </div>

      <p className="text-xs text-neutral-400 mt-2">
        Write it down before you save it — it is not shown again afterwards.
      </p>

      {state && !state.confirmed && (
        <div className="mt-4 pt-4 border-t border-line">
          <p className="text-sm">
            This account never confirmed its email address, so it cannot log in
            yet.
          </p>
          <button
            type="button"
            onClick={() => call("confirm_email")}
            disabled={busy}
            className="mt-2 rounded-xl border border-clay/30 bg-clay/10 text-clay px-3 py-1.5 text-sm font-medium hover:bg-clay/20 transition disabled:opacity-50"
          >
            Confirm it for them
          </button>
        </div>
      )}

      {result && (
        <p
          className={`text-sm mt-3 ${
            result.ok ? "text-emerald-700" : "text-red-600"
          }`}
        >
          {result.message}
        </p>
      )}
    </section>
  );
}
