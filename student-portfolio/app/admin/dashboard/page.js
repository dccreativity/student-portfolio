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
  const [pendingAdmins, setPendingAdmins] = useState([]);
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let channel;

    async function load() {
      const [{ data: studentRows }, { data: pendingRows }] = await Promise.all([
        supabase.from("profiles").select("*").eq("role", "student").order("full_name"),
        supabase.from("profiles").select("*").eq("role", "admin").eq("status", "pending"),
      ]);

      setStudents(studentRows || []);
      setPendingAdmins(pendingRows || []);
      setLoading(false);

      channel = supabase
        .channel("admin-profiles")
        .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => load())
        .subscribe();
    }

    load();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  async function approveAdmin(id) {
    await supabase.from("profiles").update({ status: "approved" }).eq("id", id);
  }

  async function rejectAdmin(id) {
    await supabase.from("profiles").update({ role: "student", status: "approved" }).eq("id", id);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  const filtered = students.filter((s) => {
    const matchesSearch = `${s.full_name} ${s.email}`.toLowerCase().includes(search.toLowerCase());
    const matchesGrade = gradeFilter === "all" || s.grade === gradeFilter;
    return matchesSearch && matchesGrade;
  });

  const grouped = GRADE_OPTIONS.reduce((acc, g) => {
    acc[g] = filtered.filter((s) => s.grade === g);
    return acc;
  }, {});
  const ungraded = filtered.filter((s) => !GRADE_OPTIONS.includes(s.grade));

  return (
    <main className="min-h-screen bg-cream p-6 md:p-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Logo className="h-8 mb-1" />
          <p className="text-xs uppercase tracking-wide text-neutral-500">Super Admin</p>
        </div>
        <button onClick={handleLogout} className="text-sm text-neutral-500 hover:text-ink">
          Log out
        </button>
      </div>

      {pendingAdmins.length > 0 && (
        <section className="bg-white/70 border border-line rounded-3xl p-6 mb-8">
          <h2 className="font-medium mb-4">Pending admin approvals</h2>
          <div className="space-y-3">
            {pendingAdmins.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">{p.full_name}</p>
                  <p className="text-neutral-500">{p.email}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => approveAdmin(p.id)} className="rounded-lg bg-ink text-white px-3 py-1.5">
                    Approve
                  </button>
                  <button onClick={() => rejectAdmin(p.id)} className="rounded-lg border border-line px-3 py-1.5">
                    Deny
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="bg-white/70 border border-line rounded-3xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <h2 className="font-medium">Students ({filtered.length})</h2>
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
        ) : filtered.length === 0 ? (
          <p className="text-sm text-neutral-500 py-4">No students found.</p>
        ) : (
          <div className="space-y-8">
            {GRADE_OPTIONS.filter((g) => gradeFilter === "all" || gradeFilter === g).map(
              (g) =>
                grouped[g].length > 0 && (
                  <div key={g}>
                    <h3 className="text-xs uppercase tracking-wide text-neutral-400 mb-2">
                      Grade {g} · {grouped[g].length}
                    </h3>
                    <div className="divide-y divide-line">
                      {grouped[g].map((s) => (
                        <Link
                          key={s.id}
                          href={`/admin/dashboard/${s.id}`}
                          className="flex items-center justify-between py-3 hover:text-clay"
                        >
                          <div>
                            <p className="font-medium">{s.full_name}</p>
                            <p className="text-sm text-neutral-500">{s.email}</p>
                          </div>
                          <span className="text-sm text-neutral-400">View →</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )
            )}

            {ungraded.length > 0 && (gradeFilter === "all") && (
              <div>
                <h3 className="text-xs uppercase tracking-wide text-neutral-400 mb-2">
                  Grade not set · {ungraded.length}
                </h3>
                <div className="divide-y divide-line">
                  {ungraded.map((s) => (
                    <Link
                      key={s.id}
                      href={`/admin/dashboard/${s.id}`}
                      className="flex items-center justify-between py-3 hover:text-clay"
                    >
                      <div>
                        <p className="font-medium">{s.full_name}</p>
                        <p className="text-sm text-neutral-500">{s.email}</p>
                      </div>
                      <span className="text-sm text-neutral-400">View →</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
