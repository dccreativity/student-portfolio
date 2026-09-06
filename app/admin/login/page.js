"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";
import Logo from "@/components/Logo";

function AdminLoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(
    params.get("denied") ? "That account isn't an approved administrator yet." : ""
  );
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setLoading(false);
      setError(signInError.message);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, status")
      .eq("id", data.user.id)
      .single();

    setLoading(false);

    if (profile?.role !== "admin") {
      // Students land here if they try the staff door. Sign them straight
      // back out — an admin session is never created for them.
      setError(
        "This account does not have staff access. Students should log in through Student Login."
      );
      await supabase.auth.signOut();
      return;
    }
    if (profile?.status !== "approved") {
      // Reachable by staff accounts created before access moved to the
      // email allowlist, which were left waiting for a manual approval
      // step that no longer exists. Name the remedy rather than leaving
      // the person — often the administrator themselves — at a dead end.
      setError(
        "This staff account hasn't been activated yet. Ask your school administrator " +
          "to add this address to the staff list (supabase/add-staff.sql)."
      );
      await supabase.auth.signOut();
      return;
    }

    // Full navigation, for the same cookie-timing reason as the student
    // login page.
    window.location.assign("/admin/dashboard");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-cream px-6">
      <div className="w-full max-w-md bg-white/70 backdrop-blur-xl border border-line rounded-3xl p-8 shadow-sm">
        <Logo className="h-9 mb-1" />
        <p className="text-xs uppercase tracking-wide text-neutral-500 mb-6">Staff / Admin</p>
        <h1 className="font-display text-3xl mb-6">Staff login</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Staff email</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-line bg-white/80 px-4 py-2.5 outline-none focus:ring-2 focus:ring-clay"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Password</label>
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-line bg-white/80 px-4 py-2.5 outline-none focus:ring-2 focus:ring-clay"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            disabled={loading}
            className="w-full rounded-xl bg-ink text-white py-2.5 font-medium hover:bg-black transition disabled:opacity-60"
          >
            {loading ? "Logging in…" : "Log in"}
          </button>
        </form>

        <p className="text-sm text-neutral-600 mt-6">
          New staff member?{" "}
          <Link href="/admin/signup" className="text-clay font-medium">
            Create your staff account
          </Link>
        </p>
        <p className="text-xs text-neutral-400 mt-4">
          Students: this is not your login.{" "}
          <Link href="/login" className="underline hover:text-ink">
            Go to Student Login
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <AdminLoginForm />
    </Suspense>
  );
}
