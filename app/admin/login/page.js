"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ALLOWED_EMAIL_DOMAIN } from "@/lib/constants";
import GoogleButton from "@/components/GoogleButton";
import Logo from "@/components/Logo";

// The staff door. Same Google sign-in as the student one — what makes
// someone staff is being on the allowlist in the database, not which page
// they started from. A student who finds this page and signs in is simply
// sent to their own dashboard.
function AdminLoginForm() {
  const params = useSearchParams();
  const denied = params.get("denied") === "1";
  const authError = params.get("authError");

  return (
    <main className="min-h-screen grid place-items-center bg-ink px-6 py-16">
      <div className="w-full max-w-md">
        <div className="rounded-3xl bg-cream p-8">
          <Logo className="h-11 mb-6" />
          <p className="text-xs uppercase tracking-wide text-neutral-500 mb-1">
            School staff
          </p>
          <h1 className="font-display text-3xl mb-2">Staff sign-in</h1>
          <p className="text-sm text-neutral-600 mb-8">
            Sign in with your school Google account. Staff access is granted to
            approved addresses only.
          </p>

          {denied && (
            <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-sm text-amber-800">
                That account doesn&apos;t have staff access. Students should use
                the student door.
              </p>
            </div>
          )}

          {authError && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm text-red-700">{authError}</p>
            </div>
          )}

          <GoogleButton next="/admin/dashboard" label="Log in with Google" />

          <p className="text-xs text-neutral-500 mt-6">
            Only @{ALLOWED_EMAIL_DOMAIN} accounts can sign in, and only the
            addresses your school has approved get staff access. Everyone else
            lands on their own student portfolio.
          </p>
        </div>

        <p className="text-sm text-white/70 mt-6 text-center">
          Are you a student?{" "}
          <Link href="/login" className="text-white font-medium underline">
            Student login
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
