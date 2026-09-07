"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { getSectionMeta } from "@/lib/sectionSchema";
import { getSectionBanner } from "@/lib/constants";
import SectionEditor from "@/components/SectionEditor";
import MediaGallery from "@/components/MediaGallery";
import PhotoBackdrop from "@/components/PhotoBackdrop";

export default function SectionPage() {
  const { section } = useParams();
  const supabase = createClient();
  const meta = getSectionMeta(section);

  const [userId, setUserId] = useState(null);
  const [grade, setGrade] = useState(null);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(async ({ data }) => {
      const id = data.user?.id ?? null;
      if (cancelled) return;
      setUserId(id);
      if (!id) return;
      // The Education section offers the years a student of this grade
      // would be expected to hold, so it needs the grade.
      const { data: profile } = await supabase
        .from("profiles")
        .select("grade")
        .eq("id", id)
        .single();
      if (!cancelled) setGrade(profile?.grade ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!meta) {
    return <main className="p-10 text-neutral-500">Unknown section.</main>;
  }
  if (!userId) {
    return <main className="p-10 text-neutral-500">Loading…</main>;
  }

  const banner = getSectionBanner(meta.key);

  return (
    <main className="p-6 md:p-10 max-w-3xl">
      <PhotoBackdrop
        src={banner.image}
        gradient={banner.gradient}
        overlay="bg-gradient-to-r from-ink/75 via-ink/45 to-ink/20"
        className="rounded-3xl mb-8 h-28"
      >
        <div className="h-full flex items-center gap-4 px-6">
          <span className="grid place-items-center w-12 h-12 rounded-2xl bg-white/85 text-xl shrink-0">
            {banner.icon}
          </span>
          <div className="min-w-0">
            <h1 className="font-display text-2xl md:text-3xl leading-tight truncate text-white">
              {meta.label}
            </h1>
            <p className="text-sm text-white/70">Saved changes sync everywhere in real time.</p>
          </div>
        </div>
      </PhotoBackdrop>

      {meta.type === "media" ? (
        <MediaGallery userId={userId} sectionKey={meta.key} mediaType={meta.mediaType} />
      ) : (
        <SectionEditor userId={userId} sectionKey={meta.key} studentGrade={grade} />
      )}
    </main>
  );
}
