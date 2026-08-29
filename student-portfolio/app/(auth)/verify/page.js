"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import BreathingBackground from "@/components/BreathingBackground";

function VerifyForm() {
  const router = useRouter();
  const params = useSearchParams();
  const supabase = createClient();
  const email = params.get("email") || "";

  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

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

    router.push("/dashboard");
  }

  async function handleResend() {
    setError("");
    setInfo("");
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email,
    });
    if (resendError) {
      setError(resendError.message);
    } else {
      setInfo("A new code has been sent to your email.");
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <BreathingBackground />
      <div className="w-full max-w-md bg-white/70 backdrop-blur-xl border border-line rounded-3xl p-8 shadow-sm">
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
            className="w-full rounded-xl bg-ink text-white py-2.5 font-medium hover:bg-black transition disabled:opacity-60"
          >
            {loading ? "Verifying…" : "Verify email"}
          </button>
        </form>

        <button
          onClick={handleResend}
          className="text-sm text-clay font-medium mt-6"
        >
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
