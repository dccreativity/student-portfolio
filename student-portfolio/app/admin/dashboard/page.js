"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

export default function AdminDashboard() {
  const supabase = createClient();
  const router = useRouter();

  const [students, setStudents] = useState([]);
  const [pendingAdmins, setPendingAdmins] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let channel;

    async function load() {
      const [{ data: studentRows }, { data: pendingRows }] = await Promise.all([
        supabase.from("profiles").select("*").eq("role", "student").order("full_name"),
        supabase
          .from("profiles")
          .select("*")
          .eq("role", "admin")
          .eq("status", "pending"),
      ]);

      setStudents(studentRows || []);
      setPendingAdmins(pendingRows || []);
      setLoading(false);

      // Reflects new signups and any profile edits live, across every
      // admin who currently has this page open.
      channel = supabase
        .channel("admin-profiles")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "profiles" },
          () => load()
        )
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

  const filtered = students.filter((s) =>
    `${s.full_name} ${s.email}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-cream p-6 md:p-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-3xl">Super Admin</h1>
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
                  <button
                    onClick={() => approveAdmin(p.id)}
                    className="rounded-lg bg-ink text-white px-3 py-1.5"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => rejectAdmin(p.id)}
                    className="rounded-lg border border-line px-3 py-1.5"
                  >
                    Deny
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="bg-white/70 border border-line rounded-3xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-medium">Students ({students.length})</h2>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="rounded-xl border border-line bg-white/80 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-clay"
          />
        </div>

        {loading ? (
          <p className="text-neutral-500 text-sm">Loading…</p>
        ) : (
          <div className="divide-y divide-line">
            {filtered.map((s) => (
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
            {filtered.length === 0 && (
              <p className="text-sm text-neutral-500 py-4">No students found.</p>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
