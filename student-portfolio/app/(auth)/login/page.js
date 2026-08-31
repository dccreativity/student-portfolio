"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";
import { UNSPLASH_IMAGES } from "@/lib/constants";
import Logo from "@/components/Logo";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      if (signInError.message.toLowerCase().includes("email not confirmed")) {
        router.push(`/verify?email=${encodeURIComponent(email)}`);
        return;
      }
      setError(signInError.message);
      return;
    }

    router.push("/dashboard");
    router.refresh();
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
              <label className="text-sm font-medium">Password</label>
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-xl border border-line bg-white/80 px-4 py-2.5 outline-none focus:ring-2 focus:ring-clay"
              />
            </div>

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
