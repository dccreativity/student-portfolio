"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";
import { ALLOWED_EMAIL_DOMAIN, isAllowedSchoolEmail } from "@/lib/constants";
import BreathingBackground from "@/components/BreathingBackground";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [requestAdmin, setRequestAdmin] = useState(false);
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
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, request_admin: requestAdmin },
      },
    });
    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    router.push(`/verify?email=${encodeURIComponent(email)}`);
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <BreathingBackground />
      <div className="w-full max-w-md bg-white/70 backdrop-blur-xl border border-line rounded-3xl p-8 shadow-sm">
        <p className="font-display text-2xl mb-1">folio.</p>
        <h1 className="font-display text-3xl mb-2">Create your account</h1>
        <p className="text-sm text-neutral-600 mb-6">
          Only school email addresses ending in{" "}
          <span className="font-medium">@{ALLOWED_EMAIL_DOMAIN}</span> can sign up.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Full name</label>
            <input
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-line bg-white/80 px-4 py-2.5 outline-none focus:ring-2 focus:ring-clay"
              placeholder="Ananya Sharma"
            />
          </div>
          <div>
            <label className="text-sm font-medium">School email</label>
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
              placeholder="At least 8 characters"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-neutral-600">
            <input
              type="checkbox"
              checked={requestAdmin}
              onChange={(e) => setRequestAdmin(e.target.checked)}
              className="rounded border-line"
            />
            I&apos;m school staff requesting administrator access
          </label>
          {requestAdmin && (
            <p className="text-xs text-neutral-500 -mt-2">
              A super admin will need to approve this before you can log in to the admin panel.
            </p>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            disabled={loading}
            className="w-full rounded-xl bg-ink text-white py-2.5 font-medium hover:bg-black transition disabled:opacity-60"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="text-sm text-neutral-600 mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-clay font-medium">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
