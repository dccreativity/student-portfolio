"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { SECTION_SCHEMA } from "@/lib/sectionSchema";
import Logo from "@/components/Logo";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const isOverview = pathname === "/dashboard";

  return (
    <aside className="hidden md:flex md:flex-col w-64 shrink-0 bg-ink text-white/90 min-h-screen sticky top-0 px-5 py-6">
      <div className="mb-8 px-2">
        <Logo dark className="h-7" />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
        <Link
          href="/dashboard"
          className={`block rounded-xl px-3 py-2.5 text-sm font-medium transition ${
            isOverview ? "bg-clay text-white" : "hover:bg-white/10"
          }`}
        >
          Dashboard
        </Link>

        {SECTION_SCHEMA.map((section) => {
          const href = `/dashboard/${section.key}`;
          const active = pathname === href;
          return (
            <Link
              key={section.key}
              href={href}
              className={`block rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                active ? "bg-clay text-white" : "hover:bg-white/10"
              }`}
            >
              {section.label}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={handleLogout}
        className="mt-4 text-left rounded-xl px-3 py-2.5 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition"
      >
        Log out
      </button>
    </aside>
  );
}
