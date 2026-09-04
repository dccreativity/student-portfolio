import Link from "next/link";
import BreathingBackground from "@/components/BreathingBackground";
import Logo from "@/components/Logo";

export default function ChoosePage() {
  return (
    <main className="min-h-screen relative flex flex-col items-center justify-center px-6">
      <BreathingBackground hue />

      <Logo className="h-10 mb-10" />

      <div className="grid sm:grid-cols-2 gap-6 w-full max-w-2xl">
        <Link
          href="/login"
          className="group bg-white/70 backdrop-blur-xl border border-line rounded-3xl p-8 text-left hover:border-clay hover:bg-white transition shadow-sm"
        >
          <p className="text-xs uppercase tracking-wide text-neutral-500 mb-2">Students</p>
          <h2 className="font-display text-2xl mb-2">Student Login</h2>
          <p className="text-sm text-neutral-600">
            Build and manage your own portfolio — sign up or log in with your
            school email.
          </p>
          <span className="inline-block mt-4 text-sm font-medium text-clay group-hover:translate-x-1 transition">
            Continue →
          </span>
        </Link>

        <Link
          href="/admin/login"
          className="group bg-ink text-white rounded-3xl p-8 text-left hover:bg-black transition shadow-sm"
        >
          <p className="text-xs uppercase tracking-wide text-white/50 mb-2">School staff</p>
          <h2 className="font-display text-2xl mb-2">Admin Login</h2>
          <p className="text-sm text-white/70">
            View student portfolios. Restricted to approved staff email
            addresses only.
          </p>
          <span className="inline-block mt-4 text-sm font-medium text-clayLight group-hover:translate-x-1 transition">
            Continue →
          </span>
        </Link>
      </div>

      <Link href="/" className="text-sm text-neutral-500 mt-10 hover:text-ink">
        ← Back to home
      </Link>
    </main>
  );
}
