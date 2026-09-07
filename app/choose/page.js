import Link from "next/link";
import BreathingBackground from "@/components/BreathingBackground";
import Logo from "@/components/Logo";

export default function ChoosePage() {
  return (
    <>
      <BreathingBackground hue />

      <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16">
        <Link href="/" className="mb-3">
          <Logo className="h-14" />
        </Link>
        <p className="text-sm text-neutral-500 mb-10">How are you signing in?</p>

        <div className="grid sm:grid-cols-2 gap-4 w-full max-w-3xl">
          <Link
            href="/login"
            className="group bg-white/70 backdrop-blur-xl border border-line rounded-3xl p-7 hover:border-clay hover:bg-white/90 hover:-translate-y-0.5 transition-all shadow-sm"
          >
            <span className="inline-grid place-items-center w-11 h-11 rounded-2xl bg-clay/10 text-clay text-lg mb-4">
              🎓
            </span>
            <p className="text-[11px] uppercase tracking-[0.14em] text-neutral-500">Students</p>
            <h2 className="font-display text-2xl mt-1 mb-2">Student Login</h2>
            <p className="text-sm text-neutral-600 leading-relaxed">
              Log in or create your account with your school email. You can see
              and edit only your own portfolio.
            </p>
            <span className="inline-block mt-5 text-sm font-medium text-clay group-hover:translate-x-1 transition-transform">
              Continue →
            </span>
          </Link>

          <Link
            href="/admin/login"
            className="group bg-ink text-white rounded-3xl p-7 hover:bg-black hover:-translate-y-0.5 transition-all shadow-sm"
          >
            <span className="inline-grid place-items-center w-11 h-11 rounded-2xl bg-white/10 text-clayLight text-lg mb-4">
              🏫
            </span>
            <p className="text-[11px] uppercase tracking-[0.14em] text-white/50">School staff</p>
            <h2 className="font-display text-2xl mt-1 mb-2">Admin Login</h2>
            <p className="text-sm text-white/70 leading-relaxed">
              View every student profile, grouped by grade. Staff addresses are
              approved in advance — students cannot get in this way.
            </p>
            <span className="inline-block mt-5 text-sm font-medium text-clayLight group-hover:translate-x-1 transition-transform">
              Continue →
            </span>
          </Link>
        </div>

        <Link href="/" className="text-sm text-neutral-500 mt-10 hover:text-ink transition">
          ← Back to home
        </Link>
      </main>
    </>
  );
}
