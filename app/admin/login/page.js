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
      setError("This account does not have administrator access.");
      await supabase.auth.signOut();
      return;
    }
    if (profile?.status !== "approved") {
      setError("Your admin access is still pending super admin approval.");
      await supabase.auth.signOut();
      return;
    }

    router.push("/admin/dashboard");
    router.refresh();
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
            Request access
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
