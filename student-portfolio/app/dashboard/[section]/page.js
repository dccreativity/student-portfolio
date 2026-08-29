"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { getSectionMeta } from "@/lib/sectionSchema";
import SectionEditor from "@/components/SectionEditor";
import MediaGallery from "@/components/MediaGallery";

export default function SectionPage() {
  const { section } = useParams();
  const supabase = createClient();
  const meta = getSectionMeta(section);

  const [userId, setUserId] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  if (!meta) {
    return <main className="p-10 text-neutral-500">Unknown section.</main>;
  }
  if (!userId) {
    return <main className="p-10 text-neutral-500">Loading…</main>;
  }

  return (
    <main className="p-6 md:p-10 max-w-3xl">
      <h1 className="font-display text-3xl mb-1">{meta.label}</h1>
      <p className="text-neutral-500 mb-8">Changes sync in real time.</p>

      {meta.type === "media" ? (
        <MediaGallery userId={userId} sectionKey={meta.key} mediaType={meta.mediaType} />
      ) : (
        <SectionEditor userId={userId} sectionKey={meta.key} />
      )}
    </main>
  );
}
