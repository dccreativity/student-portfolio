"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import { SECTION_SCHEMA } from "@/lib/sectionSchema";
import { GRADE_OPTIONS, UID_LENGTH, UNSPLASH_IMAGES, isValidUid } from "@/lib/constants";
import { isSectionFilled } from "@/lib/completion";
import PhotoBackdrop from "@/components/PhotoBackdrop";
import StatusTick from "@/components/StatusTick";

export default function DashboardOverview() {
  const supabase = createClient();
  const [profile, setProfile] = useState(null);
  const [sectionsData, setSectionsData] = useState({});
  const [mediaCounts, setMediaCounts] = useState({ picture_gallery: 0, video_gallery: 0 });
  const [loading, setLoading] = useState(true);
  const [gradeSaving, setGradeSaving] = useState(false);
  const [uid, setUid] = useState("");
  const [uidStatus, setUidStatus] = useState("");

  // Accounts created before grades were collected have none, and the
  // admin list groups by grade — so students need a way to set it here.
  async function saveGrade(grade) {
    if (!profile || !grade || grade === profile.grade) return;
    setGradeSaving(true);
    const { error } = await supabase.from("profiles").update({ grade }).eq("id", profile.id);
    setGradeSaving(false);
    if (!error) setProfile((p) => ({ ...p, grade }));
  }

  // Same reason as the grade above: accounts created before UIDs were
  // collected have none, and the admin list identifies students by it.
  async function saveUid() {
    const next = uid.trim();
    if (!profile || next === (profile.uid || "")) return;
    if (!isValidUid(next)) {
      setUidStatus(`Needs to be exactly ${UID_LENGTH} digits.`);
      return;
    }
    const { error } = await supabase.from("profiles").update({ uid: next }).eq("id", profile.id);
    if (error) {
      setUidStatus("Couldn't save that.");
      return;
    }
    setProfile((p) => ({ ...p, uid: next }));
    setUidStatus("Saved");
    setTimeout(() => setUidStatus(""), 2000);
  }

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
      setUid(profileRow?.uid || "");

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
    isSectionFilled(s, sectionsData[s.key], mediaCounts[s.key])
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
      <PhotoBackdrop
        src={UNSPLASH_IMAGES.dashboardHero}
        gradient="from-clay via-[#532B88] to-ink"
        overlay="bg-gradient-to-r from-ink/75 via-ink/35 to-transparent"
        className="rounded-3xl mb-8 h-40 md:h-48"
      >
        <div className="h-full flex flex-col justify-end p-6 md:p-8">
          <p className="text-white/70 text-sm">Welcome back,</p>
          <h1 className="font-display text-3xl md:text-4xl text-white leading-tight">
            Your <span className="text-clayLight">journey.</span> Your story.
          </h1>
        </div>
      </PhotoBackdrop>

      <div className="grid md:grid-cols-3 gap-6">
        <section className="md:col-span-2 bg-white/70 backdrop-blur border border-line rounded-3xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-sand flex items-center justify-center font-display text-xl">
              {profile?.full_name?.[0] ?? "S"}
            </div>
            <div>
              <h2 className="font-display text-2xl">{profile?.full_name}</h2>
              <p className="text-sm text-neutral-500">{profile?.email}</p>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-sand text-ink rounded-full pl-3 pr-1.5 py-1 border border-line">
                  UID
                  <input
                    inputMode="numeric"
                    maxLength={UID_LENGTH}
                    value={uid}
                    onChange={(e) => {
                      setUid(e.target.value.replace(/\D/g, "").slice(0, UID_LENGTH));
                      setUidStatus("");
                    }}
                    onBlur={saveUid}
                    placeholder="0000"
                    aria-label={`Your ${UID_LENGTH}-digit school UID`}
                    className="w-14 bg-white/70 rounded-full px-2 py-0.5 tracking-widest text-center outline-none focus:ring-2 focus:ring-clay"
                  />
                </span>
                {uidStatus && (
                  <span className="text-xs text-neutral-500">{uidStatus}</span>
                )}
                <select
                  value={profile?.grade ?? ""}
                  onChange={(e) => saveGrade(e.target.value)}
                  disabled={gradeSaving}
                  aria-label="Your current grade"
                  className="text-xs font-medium bg-clay/10 text-clay rounded-full pl-3 pr-2 py-1 border border-clay/20 outline-none focus:ring-2 focus:ring-clay disabled:opacity-60"
                >
                  <option value="" disabled>
                    Set your grade
                  </option>
                  {GRADE_OPTIONS.map((g) => (
                    <option key={g} value={g}>
                      Grade {g}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-neutral-500">
                  {profile?.grade ? (
                    <>
                      Your current grade. Earlier years go in{" "}
                      <a href="/dashboard/education" className="text-clay underline">
                        Education
                      </a>
                      .
                    </>
                  ) : (
                    "Pick your current grade so your school can find your profile."
                  )}
                </span>
              </div>
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
            style={{ background: `conic-gradient(#532B88 ${percent * 3.6}deg, #E9DEF6 0deg)` }}
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
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="font-medium">Sections</h3>
          <p className="flex items-center gap-4 text-xs text-neutral-500">
            <span className="flex items-center gap-1.5">
              <StatusTick done /> Saved
            </span>
            <span className="flex items-center gap-1.5">
              <StatusTick done={false} /> Pending
            </span>
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SECTION_SCHEMA.map((s) => {
            const filled = isSectionFilled(s, sectionsData[s.key], mediaCounts[s.key]);
            return (
              <a
                key={s.key}
                href={`/dashboard/${s.key}`}
                className="bg-white/70 border border-line rounded-2xl p-4 hover:border-clay transition flex items-start gap-3"
              >
                <StatusTick done={filled} />
                <span>
                  <p className="font-medium leading-tight">{s.label}</p>
                  <p className="text-xs text-neutral-500 mt-1">
                    {filled ? "Saved" : "Pending"}
                  </p>
                </span>
              </a>
            );
          })}
        </div>
      </section>
    </main>
  );
}
