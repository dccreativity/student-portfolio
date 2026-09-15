"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { isStaffRole } from "@/lib/constants";
import { friendlyAuthError } from "@/lib/authErrors";
import Logo from "@/components/Logo";

function VerifyForm() {
  const router = useRouter();
  const params = useSearchParams();
  const supabase = createClient();
  const email = params.get("email") || "";
  const rawNext = params.get("next") || "/dashboard";
  // Never follow an absolute URL out of the site.
  const next =
    rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";

  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  // What happens once the address is confirmed, however it was confirmed —
  // by typing the code below, or by clicking the link in the email.
  //
  // Supabase's built-in email service can only send its default template,
  // which carries a link rather than a {{ .Token }} code, so this page has
  // to handle both. The link brings the student back here with a session
  // already established; there is nothing left to verify at that point.
  const finish = useCallback(async () => {
    if (next === "/admin/login") {
      // Whitelisted staff are auto-approved by the database trigger the
      // moment they verify. Anyone else who signed up via /admin/signup
      // is silently a plain student account — tell them clearly instead
      // of letting them wonder why /admin/login rejects them.
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      await supabase.auth.signOut();

      if (!isStaffRole(profile?.role)) {
        setError(
          "This email isn't on the approved staff list, so it can't get admin access. Contact your super admin if this seems wrong."
        );
        return;
      }
    }
    window.location.assign(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [next]);

  // Arriving from the link in the email: the session is already there.
  useEffect(() => {
    const hash = typeof window === "undefined" ? "" : window.location.hash;
    if (!params.has("code") && !hash.includes("access_token")) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") finish();
    });

    // The exchange can complete before the listener is attached.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) finish();
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finish]);

  async function handleVerify(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "signup",
    });

    setLoading(false);

    if (verifyError) {
      setError(verifyError.message);
      return;
    }

    await finish();
  }

  async function handleResend() {
    setError("");
    setInfo("");
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email,
    });
    if (resendError) {
      setError(friendlyAuthError(resendError, "verification code"));
    } else {
      setInfo("A new code has been sent to your email.");
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-cream px-6">
      <div className="w-full max-w-md bg-white/70 backdrop-blur-xl border border-line rounded-3xl p-8 shadow-sm">
        <Logo className="h-12 mb-6" />
        <h1 className="font-display text-3xl mb-2">Check your inbox</h1>
        <p className="text-sm text-neutral-600 mb-6">
          Enter the 6-digit code we sent to <span className="font-medium">{email}</span>.
        </p>

        <form onSubmit={handleVerify} className="space-y-4">
          <input
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={6}
            inputMode="numeric"
            className="w-full text-center tracking-[0.5em] text-xl rounded-xl border border-line bg-white/80 px-4 py-3 outline-none focus:ring-2 focus:ring-clay"
            placeholder="••••••"
          />

          {error && <p className="text-sm text-red-600">{error}</p>}
          {info && <p className="text-sm text-green-700">{info}</p>}

          <button
            disabled={loading}
            className="w-full rounded-xl bg-ink text-white py-2.5 font-medium hover:bg-inkDeep transition disabled:opacity-60"
          >
            {loading ? "Verifying…" : "Verify email"}
          </button>
        </form>

        <button onClick={handleResend} className="text-sm text-clay font-medium mt-6">
          Resend code
        </button>
      </div>
    </main>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={null}>
      <VerifyForm />
    </Suspense>
  );
}
