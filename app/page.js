import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabaseServer";
import BreathingBackground from "@/components/BreathingBackground";
import Logo from "@/components/Logo";

export default async function Home() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, status")
      .eq("id", user.id)
      .single();

    if (profile?.role === "admin" && profile?.status === "approved") {
      redirect("/admin/dashboard");
    }
    redirect("/dashboard");
  }

  return (
    <>
      <BreathingBackground hue />

      <main className="min-h-screen flex flex-col">
        <header className="flex items-center justify-between px-6 md:px-12 py-6">
          <Logo className="h-8 md:h-9" />
          <Link
            href="/choose"
            className="rounded-full border border-ink/10 bg-white/60 backdrop-blur px-5 py-2 text-sm font-medium hover:bg-white hover:border-ink/20 transition"
          >
            Log in / Sign up
          </Link>
        </header>

        <div className="flex-1 flex items-center justify-center px-6 py-10">
          <div className="w-full max-w-4xl">
            <div className="text-center max-w-2xl mx-auto">
              <h1 className="font-display text-5xl md:text-6xl leading-[1.05] tracking-tight">
                Your <span className="text-clay">journey.</span>
                <br />
                Your story.
              </h1>
              <p className="text-neutral-600 text-lg mt-6 max-w-lg mx-auto leading-relaxed">
                One place for every student to build, showcase and share their
                academic journey — built for Adani International School.
              </p>
            </div>

            {/* The two doors into the portal. Kept fully separate so a
                student account can never reach the staff side. */}
            <div className="grid sm:grid-cols-2 gap-4 mt-12">
              <Link
                href="/login"
                className="group bg-white/70 backdrop-blur-xl border border-line rounded-3xl p-7 hover:border-clay hover:bg-white/90 hover:-translate-y-0.5 transition-all shadow-sm"
              >
                <span className="inline-grid place-items-center w-11 h-11 rounded-2xl bg-clay/10 text-clay text-lg mb-4">
                  🎓
                </span>
                <p className="text-[11px] uppercase tracking-[0.14em] text-neutral-500">
                  Students
                </p>
                <h2 className="font-display text-2xl mt-1 mb-2">Student Login</h2>
                <p className="text-sm text-neutral-600 leading-relaxed">
                  Build your portfolio, upload your evidence and download your
                  resume. You only ever see your own profile.
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
                <p className="text-[11px] uppercase tracking-[0.14em] text-white/50">
                  School staff
                </p>
                <h2 className="font-display text-2xl mt-1 mb-2">Admin Login</h2>
                <p className="text-sm text-white/70 leading-relaxed">
                  Browse every student profile by grade, in view-only mode.
                  Restricted to staff email addresses approved in advance.
                </p>
                <span className="inline-block mt-5 text-sm font-medium text-clayLight group-hover:translate-x-1 transition-transform">
                  Continue →
                </span>
              </Link>
            </div>
          </div>
        </div>

        <footer className="text-center text-xs text-neutral-400 pb-8 px-6">
          © {new Date().getFullYear()} folio. — Adani International School ·
          School email addresses only
        </footer>
      </main>
    </>
  );
}
