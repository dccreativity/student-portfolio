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
    <main className="min-h-screen relative flex flex-col">
      <BreathingBackground hue />

      <header className="flex items-center justify-between px-6 md:px-10 py-6">
        <Logo className="h-9" />
        <Link
          href="/choose"
          className="rounded-full border border-ink/15 bg-white/60 backdrop-blur px-5 py-2 text-sm font-medium hover:bg-white transition"
        >
          Log in / Sign up
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-6 text-center">
        <div className="max-w-2xl">
          <h1 className="font-display text-5xl md:text-6xl leading-tight mb-6">
            Your <span className="text-clay">journey.</span>
            <br />
            Your story.
          </h1>
          <p className="text-neutral-600 text-lg mb-8 max-w-lg mx-auto">
            One place for every student to build, showcase, and share their
            academic journey — built for Adani International School.
          </p>
          <Link
            href="/choose"
            className="inline-block rounded-full bg-ink text-white px-8 py-3.5 font-medium hover:bg-black transition"
          >
            Get started
          </Link>
        </div>
      </div>

      <footer className="text-center text-xs text-neutral-400 pb-6">
        © {new Date().getFullYear()} folio. — Adani International School
      </footer>
    </main>
  );
}
