"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ALLOWED_EMAIL_DOMAIN, UNSPLASH_IMAGES } from "@/lib/constants";
import GoogleButton from "@/components/GoogleButton";
import Logo from "@/components/Logo";
import PhotoBackdrop from "@/components/PhotoBackdrop";

// Google is the only way in — there is no password to choose, forget or
// reset, and no confirmation email to wait for. Students and staff both
// already have a school Google account, and signing in with it proves the
// address belongs to them, which is the only thing a password was ever
// standing in for here.
function LoginForm() {
  const params = useSearchParams();

  // Middleware appends ?next= when it turns someone away from a private
  // page, so they land where they were going instead of the dashboard.
  // Only same-site paths are honoured — never an absolute URL.
  const rawNext = params.get("next") || "";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";

  // Set by /auth/callback when Google sends someone back who cannot be let in.
  const authError = params.get("authError");

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
          <h1 className="font-display text-3xl mb-2">Welcome back</h1>
          <p className="text-sm text-neutral-600 mb-8">
            Sign in with your school Google account — the one ending in{" "}
            <span className="font-medium">@{ALLOWED_EMAIL_DOMAIN}</span>.
          </p>

          {authError && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm text-red-700">{authError}</p>
            </div>
          )}

          <GoogleButton next={next} label="Log in with Google" />

          <div className="mt-8 rounded-2xl border border-line bg-white/50 p-4">
            <p className="text-sm font-medium mb-1">First time here?</p>
            <p className="text-sm text-neutral-600">
              There is nothing to sign up for. Log in with your school Google
              account and your portfolio is created for you.
            </p>
          </div>

          <p className="text-sm text-neutral-600 mt-8">
            School staff?{" "}
            <Link href="/admin/login" className="text-clay font-medium">
              Use the staff door
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
