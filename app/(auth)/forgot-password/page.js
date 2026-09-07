"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";
import { ALLOWED_EMAIL_DOMAIN, isAllowedSchoolEmail, UNSPLASH_IMAGES } from "@/lib/constants";
import Logo from "@/components/Logo";
import PhotoBackdrop from "@/components/PhotoBackdrop";

// Resetting a password happens in two steps on one page: ask for a code,
// then enter that code together with the new password.
//
// A 6-digit code rather than a reset link, deliberately. The rest of the
// app verifies by code for the same reason — a link has to come back to
// an exact redirect URL, and a mismatch there is silent and maddening to
// debug. A code works from any device, and from a phone where the email
// opens in a different browser than the one the student signed up in.
function ForgotPasswordForm() {
  const params = useSearchParams();
  const supabase = createClient();

  // Staff arrive here from /admin/login and should be sent back there.
  const rawNext = params.get("next") || "/login";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/login";

  const [step, setStep] = useState("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRequest(e) {
    e.preventDefault();
    setError("");
    setInfo("");

    if (!isAllowedSchoolEmail(email)) {
      setError(`Please use your school email — it must end with @${ALLOWED_EMAIL_DOMAIN}`);
      return;
    }

    setLoading(true);
    const { error: sendError } = await supabase.auth.resetPasswordForEmail(email.trim());
    setLoading(false);

    if (sendError) {
      setError(
        /rate|limit|too many/i.test(sendError.message)
          ? "Too many emails have been sent from this site in the last hour. Wait a little and try again."
          : sendError.message
      );
      return;
    }

    // Never say whether an account exists — that would let anyone test
    // which addresses are registered.
    setStep("reset");
    setInfo(`If an account exists for ${email.trim()}, a 6-digit code is on its way.`);
  }

  async function handleReset(e) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Your new password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    // The code signs them in just long enough to set a new password.
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: "recovery",
    });

    if (verifyError) {
      setLoading(false);
      setError(
        /expired|invalid|token/i.test(verifyError.message)
          ? "That code is wrong or has expired. Request a new one below."
          : verifyError.message
      );
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setLoading(false);
      setError(updateError.message);
      return;
    }

    // Sign the recovery session out so they log in properly with the new
    // password — and land on the right door, student or staff.
    await supabase.auth.signOut();
    setLoading(false);
    window.location.assign(`${next}?reset=1`);
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

          {step === "request" ? (
            <>
              <h1 className="font-display text-3xl mb-2">Forgot your password?</h1>
              <p className="text-sm text-neutral-600 mb-6">
                Enter your school email and we&apos;ll send you a 6-digit code to
                set a new one.
              </p>

              <form onSubmit={handleRequest} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">School email</label>
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={`you@${ALLOWED_EMAIL_DOMAIN}`}
                    className="mt-1 w-full rounded-xl border border-line bg-white/80 px-4 py-2.5 outline-none focus:ring-2 focus:ring-clay"
                  />
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <button
                  disabled={loading}
                  className="w-full rounded-xl bg-ink text-white py-2.5 font-medium hover:bg-black transition disabled:opacity-60"
                >
                  {loading ? "Sending…" : "Send me a code"}
                </button>
              </form>
            </>
          ) : (
            <>
              <h1 className="font-display text-3xl mb-2">Set a new password</h1>
              <p className="text-sm text-neutral-600 mb-6">
                Enter the code sent to <span className="font-medium">{email}</span>{" "}
                and choose a new password.
              </p>

              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">6-digit code</label>
                  <input
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    maxLength={6}
                    inputMode="numeric"
                    placeholder="••••••"
                    className="mt-1 w-full text-center tracking-[0.5em] text-xl rounded-xl border border-line bg-white/80 px-4 py-3 outline-none focus:ring-2 focus:ring-clay"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">New password</label>
                  <input
                    required
                    type="password"
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="mt-1 w-full rounded-xl border border-line bg-white/80 px-4 py-2.5 outline-none focus:ring-2 focus:ring-clay"
                  />
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}
                {info && !error && <p className="text-sm text-green-700">{info}</p>}

                <button
                  disabled={loading}
                  className="w-full rounded-xl bg-ink text-white py-2.5 font-medium hover:bg-black transition disabled:opacity-60"
                >
                  {loading ? "Saving…" : "Save new password"}
                </button>
              </form>

              <button
                type="button"
                onClick={() => {
                  setStep("request");
                  setCode("");
                  setPassword("");
                  setError("");
                  setInfo("");
                }}
                className="text-sm text-clay font-medium mt-6"
              >
                Send another code
              </button>
            </>
          )}

          <p className="text-sm text-neutral-600 mt-8">
            Remembered it?{" "}
            <Link href={next} className="text-clay font-medium">
              Back to log in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
