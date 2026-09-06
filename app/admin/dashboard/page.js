"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { GRADE_OPTIONS } from "@/lib/constants";
import Logo from "@/components/Logo";

export default function AdminDashboard() {
  const supabase = createClient();
  const router = useRouter();

  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let channel;
    let cancelled = false;

    async function load() {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "student")
        .order("full_name");
      if (cancelled) return;
      setStudents(data || []);
      setLoading(false);
    }

    load();
    channel = supabase
      .channel("admin-profiles")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => load())
      .subscribe();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  const filtered = students.filter((s) => {
    const matchesSearch = `${s.full_name} ${s.email}`
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesGrade = gradeFilter === "all" || s.grade === gradeFilter;
    return matchesSearch && matchesGrade;
  });

  // Grade 9–12 first, then anyone who signed up before grades were
  // collected, so no student is ever missing from this list.
  const groups = GRADE_OPTIONS.map((g) => ({
    key: g,
    label: `Grade ${g}`,
    rows: filtered.filter((s) => s.grade === g),
  }));
  const ungraded = filtered.filter((s) => !GRADE_OPTIONS.includes(s.grade));
  if (ungraded.length > 0 && gradeFilter === "all") {
    groups.push({ key: "none", label: "Grade not set", rows: ungraded });
  }

  const visibleGroups = groups.filter(
    (g) => g.rows.length > 0 && (gradeFilter === "all" || gradeFilter === g.key)
  );

  return (
    <main className="min-h-screen bg-cream p-6 md:p-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Logo className="h-8 mb-1" />
          <p className="text-xs uppercase tracking-wide text-neutral-500">
            School staff · view only
          </p>
        </div>
        <button onClick={handleLogout} className="text-sm text-neutral-500 hover:text-ink">
          Log out
        </button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
        <div className="bg-white/70 border border-line rounded-2xl p-4">
          <p className="text-2xl font-semibold">{students.length}</p>
          <p className="text-xs text-neutral-500 mt-1">Students enrolled</p>
        </div>
        {GRADE_OPTIONS.map((g) => (
          <div key={g} className="bg-white/70 border border-line rounded-2xl p-4">
            <p className="text-2xl font-semibold">
              {students.filter((s) => s.grade === g).length}
            </p>
            <p className="text-xs text-neutral-500 mt-1">Grade {g}</p>
          </div>
        ))}
      </div>

      <section className="bg-white/70 border border-line rounded-3xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h2 className="font-medium">Students ({filtered.length})</h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              You can open and download any profile. Editing and deleting are
              disabled for staff accounts.
            </p>
          </div>
          <div className="flex gap-2">
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              className="rounded-xl border border-line bg-white/80 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-clay"
            >
              <option value="all">All grades</option>
              {GRADE_OPTIONS.map((g) => (
                <option key={g} value={g}>
                  Grade {g}
                </option>
              ))}
            </select>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email…"
              className="rounded-xl border border-line bg-white/80 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-clay"
            />
          </div>
        </div>

        {loading ? (
          <p className="text-neutral-500 text-sm">Loading…</p>
        ) : visibleGroups.length === 0 ? (
          <p className="text-sm text-neutral-500 py-4">No students found.</p>
        ) : (
          <div className="space-y-8">
            {visibleGroups.map((group) => (
              <div key={group.key}>
                <h3 className="text-xs uppercase tracking-wide text-neutral-400 mb-2">
                  {group.label} · {group.rows.length}
                </h3>
                <div className="divide-y divide-line">
                  {group.rows.map((s) => (
                    <Link
                      key={s.id}
                      href={`/admin/dashboard/${s.id}`}
                      className="flex items-center justify-between py-3 hover:text-clay"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-9 h-9 rounded-full bg-sand grid place-items-center font-display text-sm shrink-0">
                          {s.full_name?.[0]?.toUpperCase() ?? "S"}
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{s.full_name || "Unnamed student"}</p>
                          <p className="text-sm text-neutral-500 truncate">{s.email}</p>
                        </div>
                      </div>
                      <span className="text-sm text-neutral-400 shrink-0 ml-4">View →</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
