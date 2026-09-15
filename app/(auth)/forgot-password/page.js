"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";
import { ALLOWED_EMAIL_DOMAIN, isAllowedSchoolEmail, UNSPLASH_IMAGES } from "@/lib/constants";
import { friendlyAuthError } from "@/lib/authErrors";
import Logo from "@/components/Logo";
import PhotoBackdrop from "@/components/PhotoBackdrop";

// Resetting a password, by whichever route the email takes.
//
// Supabase sends one of two things, and the school cannot freely choose:
// its built-in email service only sends the default template, which
// carries a LINK, and the templates can only be edited — to send a
// {{ .Token }} CODE instead — once custom SMTP is configured. So this
// page accepts both rather than betting on one:
//
//   link  the student clicks it, Supabase hands the page a recovery
//         session, and they are asked only for a new password
//   code  the student types the 6 digits here along with the new password
//
// The link half is why `redirectTo` is passed below, and why the page
// listens for PASSWORD_RECOVERY — the event Supabase raises once it has
// turned a recovery link back into a session.
function ForgotPasswordForm() {
  const params = useSearchParams();
  const supabase = createClient();

  // Staff arrive here from /admin/login and should be sent back there.
  const rawNext = params.get("next") || "/login";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/login";

  const [step, setStep] = useState("request"); // request | code | link
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  // Read inside the timeout below without making it a dependency.
  const stepRef = useRef(step);
  stepRef.current = step;

  // Arriving from a link in an email.
  useEffect(() => {
    // Only treat this as a link arrival when the URL actually carries one.
    // Someone who is merely signed in and opens this page must still be
    // asked to prove who they are.
    const hash = typeof window === "undefined" ? "" : window.location.hash;
    const fromLink =
      params.has("code") || hash.includes("access_token") || hash.includes("type=recovery");

    // Supabase reports a dead link (expired, or already used) in the URL
    // rather than by throwing.
    const failure =
      params.get("error_description") ||
      new URLSearchParams(hash.replace(/^#/, "")).get("error_description");
    if (failure) {
      setError(
        `${failure}. Reset links can only be used once and expire after an hour — request a new one below.`
      );
      return;
    }

    if (!fromLink) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setStep("link");
        setError("");
      }
    });

    // The client exchanges the link for a session as the page loads, which
    // can finish before the listener above is attached.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setStep("link");
    });

    // If that exchange quietly fails the student is left looking at the
    // plain form having just clicked a link, with nothing to tell them
    // why. The usual cause is opening the email on a different device from
    // the one that asked for the reset: the proof the exchange needs is
    // held by the browser that made the request.
    const timer = setTimeout(() => {
      if (stepRef.current !== "request") return;
      setError(
        "That link couldn't be opened here. Reset links only work in the same browser you requested them from — open it on that device, or ask for a new one below."
      );
    }, 4000);

    return () => {
      clearTimeout(timer);
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleRequest(e) {
    e.preventDefault();
    setError("");
    setInfo("");

    if (!isAllowedSchoolEmail(email)) {
      setError(`Please use your school email — it must end with @${ALLOWED_EMAIL_DOMAIN}`);
      return;
    }

    setLoading(true);
    const { error: sendError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      // Where the link in the email comes back to. This exact address has
      // to be listed under Authentication → URL Configuration → Redirect
      // URLs in Supabase, or the link is refused.
      redirectTo: `${window.location.origin}/forgot-password?next=${encodeURIComponent(next)}`,
    });
    setLoading(false);

    if (sendError) {
      setError(friendlyAuthError(sendError, "reset email"));
      return;
    }

    // Never say whether an account exists — that would let anyone test
    // which addresses are registered.
    setStep("code");
    setInfo(`If an account exists for ${email.trim()}, a reset email is on its way.`);
  }

  async function handleReset(e) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Your new password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    // On the link route the session already exists, so there is nothing to
    // verify — go straight to setting the password.
    if (step === "code") {
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

  const settingPassword = step === "code" || step === "link";

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

          {!settingPassword ? (
            <>
              <h1 className="font-display text-3xl mb-2">Forgot your password?</h1>
              <p className="text-sm text-neutral-600 mb-6">
                Enter your school email and we&apos;ll send you a reset email.
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
                  className="w-full rounded-xl bg-ink text-white py-2.5 font-medium hover:bg-inkDeep transition disabled:opacity-60"
                >
                  {loading ? "Sending…" : "Email me a reset"}
                </button>
              </form>
            </>
          ) : (
            <>
              <h1 className="font-display text-3xl mb-2">Set a new password</h1>
              <p className="text-sm text-neutral-600 mb-6">
                {step === "link"
                  ? "Your reset link checked out. Choose a new password."
                  : "Your email has either a link to click or a 6-digit code. Use whichever you were sent."}
              </p>

              <form onSubmit={handleReset} className="space-y-4">
                {step === "code" && (
                  <div>
                    <label className="text-sm font-medium">
                      6-digit code{" "}
                      <span className="font-normal text-neutral-500">
                        — only if your email has one
                      </span>
                    </label>
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
                )}
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
                  className="w-full rounded-xl bg-ink text-white py-2.5 font-medium hover:bg-inkDeep transition disabled:opacity-60"
                >
                  {loading ? "Saving…" : "Save new password"}
                </button>
              </form>

              {step === "code" && (
                <p className="text-xs text-neutral-500 mt-4">
                  If your email contains a link rather than a code, just click
                  it — it brings you back here ready to set the password.
                </p>
              )}

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
                Start again
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
