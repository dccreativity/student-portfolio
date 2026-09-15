"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";
import {
  ALLOWED_EMAIL_DOMAIN,
  isAllowedSchoolEmail,
  isValidUid,
  GRADE_OPTIONS,
  UID_LENGTH,
  UNSPLASH_IMAGES,
} from "@/lib/constants";
import { friendlyAuthError } from "@/lib/authErrors";
import Logo from "@/components/Logo";
import PhotoBackdrop from "@/components/PhotoBackdrop";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [grade, setGrade] = useState("");
  const [uid, setUid] = useState("");
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
    if (!grade) {
      setError("Please select your grade.");
      return;
    }
    if (!isValidUid(uid)) {
      setError(`Your UID must be exactly ${UID_LENGTH} digits.`);
      return;
    }

    setLoading(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Where the link in the confirmation email comes back to.
        // Supabase's built-in email service can only send its default
        // template, which carries a link rather than a code, so the link
        // has to land somewhere that can finish the job. This exact
        // address must be listed under Authentication -> URL Configuration
        // -> Redirect URLs in Supabase, or the link is refused.
        emailRedirectTo: `${window.location.origin}/verify?email=${encodeURIComponent(
          email
        )}&next=%2Fdashboard`,
        data: { full_name: fullName, grade, uid: uid.trim() },
      },
    });
    setLoading(false);

    if (signUpError) {
      setError(friendlyAuthError(signUpError, "verification code"));
      return;
    }

    // Supabase doesn't return an error for an email that's already
    // registered and confirmed (to avoid leaking which emails exist) —
    // instead it returns a user object with an empty `identities` array.
    // That's the one reliable signal to check for.
    if (data?.user && data.user.identities && data.user.identities.length === 0) {
      setError("An account with this email already exists. Try logging in instead.");
      return;
    }

    // With email confirmation switched off in Supabase, sign-up
    // returns a session immediately and no code is sent — so there is
    // nothing to verify and the account is ready to use. Sending them
    // to /verify would strand them waiting for a code that is never
    // coming.
    if (data?.session) {
      window.location.assign("/dashboard");
      return;
    }

    router.push(`/verify?email=${encodeURIComponent(email)}&next=%2Fdashboard`);
  }

  return (
    <main className="min-h-screen grid lg:grid-cols-2 bg-cream">
      <PhotoBackdrop
        src={UNSPLASH_IMAGES.authHero}
        gradient="from-clay via-[#532B88] to-ink"
        overlay="bg-ink/45"
        className="hidden lg:block"
      >
        <div className="h-full flex flex-col justify-end p-12 text-white">
          <p className="font-display text-4xl leading-tight max-w-md">
            Every achievement, every story — one place to tell it.
          </p>
        </div>
      </PhotoBackdrop>

      <div className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          <Logo className="h-12 mb-6" />
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
              <label className="text-sm font-medium">Grade</label>
              <select
                required
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="mt-1 w-full rounded-xl border border-line bg-white/80 px-4 py-2.5 outline-none focus:ring-2 focus:ring-clay"
              >
                <option value="" disabled>
                  Select your grade
                </option>
                {GRADE_OPTIONS.map((g) => (
                  <option key={g} value={g}>
                    Grade {g}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">UID</label>
              <input
                required
                // A numeric keypad on phones, and nothing but digits gets
                // in: the school's UID is exactly four digits, so there is
                // no state in which a fifth is wanted.
                inputMode="numeric"
                pattern={`\\d{${UID_LENGTH}}`}
                maxLength={UID_LENGTH}
                value={uid}
                onChange={(e) => setUid(e.target.value.replace(/\D/g, "").slice(0, UID_LENGTH))}
                className="mt-1 w-full rounded-xl border border-line bg-white/80 px-4 py-2.5 outline-none focus:ring-2 focus:ring-clay tracking-[0.3em] font-medium"
                placeholder="0000"
              />
              <p className="mt-1 text-xs text-neutral-500">
                Your {UID_LENGTH}-digit school UID.
              </p>
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

            {error && (
              <p className="text-sm text-red-600">
                {error}
                {error.includes("already exists") && (
                  <>
                    {" "}
                    <Link href="/login" className="underline">
                      Go to log in
                    </Link>
                  </>
                )}
              </p>
            )}

            <button
              disabled={loading}
              className="w-full rounded-xl bg-ink text-white py-2.5 font-medium hover:bg-inkDeep transition disabled:opacity-60"
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
      </div>
    </main>
  );
}
