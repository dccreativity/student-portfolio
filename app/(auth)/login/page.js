"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";
import { UNSPLASH_IMAGES } from "@/lib/constants";
import Logo from "@/components/Logo";
import PhotoBackdrop from "@/components/PhotoBackdrop";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const supabase = createClient();

  // Middleware appends ?next= when it turns someone away from a private
  // page, so they land where they were going instead of the dashboard.
  // Only same-site paths are honoured — never an absolute URL.
  const rawNext = params.get("next") || "";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // Set by the reset page so the change is visibly confirmed.
  const justReset = params.get("reset") === "1";

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setLoading(false);
      if (signInError.message.toLowerCase().includes("email not confirmed")) {
        router.push(
          `/verify?email=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}`
        );
        return;
      }
      setError(
        /invalid login credentials/i.test(signInError.message)
          ? "That email and password don't match an account. Check both, or create an account below."
          : signInError.message
      );
      return;
    }

    // A hard navigation rather than router.push: the auth cookie is
    // written by the browser client, and a client-side transition can
    // reach the middleware before that cookie is readable — which is the
    // classic Supabase + Next "logs in, bounces back to login" loop.
    window.location.assign(next);
  }

  return (
    <main className="min-h-screen grid lg:grid-cols-2 bg-cream">
      <PhotoBackdrop
        src={UNSPLASH_IMAGES.authHero}
        gradient="from-clay via-[#B4643C] to-ink"
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
          <h1 className="font-display text-3xl mb-6">Welcome back</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">School email</label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-xl border border-line bg-white/80 px-4 py-2.5 outline-none focus:ring-2 focus:ring-clay"
              />
            </div>
            <div>
              <div className="flex items-baseline justify-between">
                <label className="text-sm font-medium">Password</label>
                <Link
                  href="/forgot-password?next=%2Flogin"
                  className="text-xs text-clay font-medium hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-xl border border-line bg-white/80 px-4 py-2.5 outline-none focus:ring-2 focus:ring-clay"
              />
            </div>

            {justReset && !error && (
              <p className="text-sm text-green-700">
                Password updated. Log in with your new password.
              </p>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              disabled={loading}
              className="w-full rounded-xl bg-ink text-white py-2.5 font-medium hover:bg-black transition disabled:opacity-60"
            >
              {loading ? "Logging in…" : "Log in"}
            </button>
          </form>

          <p className="text-sm text-neutral-600 mt-6">
            New here?{" "}
            <Link href="/signup" className="text-clay font-medium">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
