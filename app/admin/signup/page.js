"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";
import { ALLOWED_EMAIL_DOMAIN, isAllowedSchoolEmail } from "@/lib/constants";
import Logo from "@/components/Logo";

// Deliberately separate from the student /signup page and never linked
// from it — staff requesting admin access live entirely in their own
// flow, so there's no path from the student side into this one.
export default function AdminSignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!isAllowedSchoolEmail(email)) {
      setError(`Please use your school email — it must end with @${ALLOWED_EMAIL_DOMAIN}`);
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, request_admin: true },
      },
    });
    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    if (data?.user && data.user.identities && data.user.identities.length === 0) {
      setError("An account with this email already exists. Try logging in instead.");
      return;
    }

    router.push(`/verify?email=${encodeURIComponent(email)}&next=/admin/login`);
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-cream px-6">
      <div className="w-full max-w-md bg-white/70 backdrop-blur-xl border border-line rounded-3xl p-8 shadow-sm">
        <Logo className="h-9 mb-6" />
        <h1 className="font-display text-3xl mb-2">Request staff access</h1>
        <p className="text-sm text-neutral-600 mb-6">
          A super admin will need to approve your account before you can log in.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Full name</label>
            <input
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-line bg-white/80 px-4 py-2.5 outline-none focus:ring-2 focus:ring-clay"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Staff school email</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-line bg-white/80 px-4 py-2.5 outline-none focus:ring-2 focus:ring-clay"
              placeholder={`you@${ALLOWED_EMAIL_DOMAIN}`}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Password</label>
            <input
              required
              type="password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-line bg-white/80 px-4 py-2.5 outline-none focus:ring-2 focus:ring-clay"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">
              {error}
              {error.includes("already exists") && (
                <>
                  {" "}
                  <Link href="/admin/login" className="underline">
                    Go to log in
                  </Link>
                </>
              )}
            </p>
          )}

          <button
            disabled={loading}
            className="w-full rounded-xl bg-ink text-white py-2.5 font-medium hover:bg-black transition disabled:opacity-60"
          >
            {loading ? "Submitting…" : "Request access"}
          </button>
        </form>

        <p className="text-sm text-neutral-600 mt-6">
          Already approved?{" "}
          <Link href="/admin/login" className="text-clay font-medium">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
