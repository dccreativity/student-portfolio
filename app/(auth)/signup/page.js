"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";
import { ALLOWED_EMAIL_DOMAIN, isAllowedSchoolEmail, GRADE_OPTIONS, UNSPLASH_IMAGES } from "@/lib/constants";
import Logo from "@/components/Logo";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [grade, setGrade] = useState("");
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

    setLoading(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, grade },
      },
    });
    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
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

    router.push(`/verify?email=${encodeURIComponent(email)}&next=/dashboard`);
  }

  return (
    <main className="min-h-screen grid lg:grid-cols-2 bg-cream">
      <div className="hidden lg:block relative">
        <img
          src={UNSPLASH_IMAGES.authHero}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-ink/40" />
        <div className="relative h-full flex flex-col justify-end p-12 text-white">
          <p className="font-display text-4xl leading-tight max-w-md">
            Every achievement, every story — one place to tell it.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          <Logo className="h-10 mb-6" />
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
      </div>
    </main>
  );
}
