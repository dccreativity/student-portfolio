"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import { SECTION_SCHEMA } from "@/lib/sectionSchema";

function isSectionFilled(meta, content) {
  if (!content) return false;
  if (meta.type === "single") {
    return Object.values(content).some((v) => String(v || "").trim().length > 0);
  }
  if (meta.type === "repeatable") {
    return (content.entries || []).length > 0;
  }
  if (meta.type === "mixed") {
    const hasBasic = meta.fields.some((f) => String(content[f.key] || "").trim().length > 0);
    const hasGroup = meta.repeatableGroups.some((g) => (content[g.key] || []).length > 0);
    return hasBasic || hasGroup;
  }
  return false;
}

export default function DashboardOverview() {
  const supabase = createClient();
  const [profile, setProfile] = useState(null);
  const [sectionsData, setSectionsData] = useState({});
  const [mediaCounts, setMediaCounts] = useState({ picture_gallery: 0, video_gallery: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let dataChannel, mediaChannel;

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileRow } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setProfile(profileRow);

      const { data: rows } = await supabase
        .from("portfolio_data")
        .select("section, content")
        .eq("user_id", user.id);
      const map = {};
      (rows || []).forEach((r) => (map[r.section] = r.content));
      setSectionsData(map);

      const { data: mediaRows } = await supabase
        .from("portfolio_media")
        .select("section")
        .eq("user_id", user.id);
      const counts = { picture_gallery: 0, video_gallery: 0 };
      (mediaRows || []).forEach((m) => (counts[m.section] = (counts[m.section] || 0) + 1));
      setMediaCounts(counts);

      setLoading(false);

      dataChannel = supabase
        .channel(`overview-data-${user.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "portfolio_data", filter: `user_id=eq.${user.id}` },
          (payload) => {
            const row = payload.new ?? payload.old;
            setSectionsData((prev) => ({ ...prev, [row.section]: payload.eventType === "DELETE" ? undefined : row.content }));
          }
        )
        .subscribe();

      mediaChannel = supabase
        .channel(`overview-media-${user.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "portfolio_media", filter: `user_id=eq.${user.id}` },
          () => load()
        )
        .subscribe();
    }

    load();
    return () => {
      if (dataChannel) supabase.removeChannel(dataChannel);
      if (mediaChannel) supabase.removeChannel(mediaChannel);
    };
  }, []);

  const total = SECTION_SCHEMA.length;
  const done = SECTION_SCHEMA.filter((s) =>
    s.type === "media" ? mediaCounts[s.key] > 0 : isSectionFilled(s, sectionsData[s.key])
  ).length;
  const percent = total ? Math.round((done / total) * 100) : 0;

  const education = sectionsData.education || {};
  const satEntry = (sectionsData.external_exams?.entries || []).find((e) =>
    (e.exam || "").toUpperCase().includes("SAT")
  );
  const awardsCount =
    (sectionsData.academic_awards?.entries || []).length +
    (sectionsData.non_academic_awards?.entries || []).length;
  const projectsCount = (sectionsData.projects?.entries || []).length;

  if (loading) {
    return <div className="p-10 text-neutral-500">Loading your portfolio…</div>;
  }

  return (
    <main className="p-6 md:p-10 max-w-6xl">
      <p className="text-neutral-500">Welcome back,</p>
      <h1 className="font-display text-4xl md:text-5xl mt-1 mb-8">
        Your <span className="text-clay">journey.</span>
        <br />
        Your story.
      </h1>

      <div className="grid md:grid-cols-3 gap-6">
        <section className="md:col-span-2 bg-white/70 backdrop-blur border border-line rounded-3xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-sand flex items-center justify-center font-display text-xl">
              {profile?.full_name?.[0] ?? "S"}
            </div>
            <div>
              <h2 className="font-display text-2xl">{profile?.full_name}</h2>
              <p className="text-sm text-neutral-500">{profile?.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
            {[
              ["GPA", education.gpa || "—"],
              ["SAT Score", satEntry?.score || "—"],
              ["Awards", awardsCount || "—"],
              ["Projects", projectsCount || "—"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-cream/60 border border-line p-4">
                <p className="text-xl font-semibold">{value}</p>
                <p className="text-xs text-neutral-500 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white/70 backdrop-blur border border-line rounded-3xl p-6">
          <h3 className="font-medium mb-4">Portfolio Completion</h3>
          <div
            className="w-28 h-28 rounded-full mx-auto grid place-items-center"
            style={{ background: `conic-gradient(#E07A45 ${percent * 3.6}deg, #EDE3D3 0deg)` }}
          >
            <div className="w-20 h-20 rounded-full bg-white grid place-items-center">
              <span className="font-display text-xl">{percent}%</span>
            </div>
          </div>
          <p className="text-center text-sm text-neutral-500 mt-4">
            {done}/{total} sections completed
          </p>
        </section>
      </div>

      <section className="mt-8">
        <h3 className="font-medium mb-4">Sections</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SECTION_SCHEMA.map((s) => {
            const filled = s.type === "media" ? mediaCounts[s.key] > 0 : isSectionFilled(s, sectionsData[s.key]);
            return (
              <a
                key={s.key}
                href={`/dashboard/${s.key}`}
                className="bg-white/70 border border-line rounded-2xl p-4 hover:border-clay transition"
              >
                <p className="font-medium">{s.label}</p>
                <p className="text-xs text-neutral-500 mt-1">
                  {filled ? "Completed" : "Not started yet"}
                </p>
              </a>
            );
          })}
        </div>
      </section>
    </main>
  );
}
