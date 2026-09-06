"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import { buildResumeModel } from "@/lib/resumeData";
import { downloadResumePdf } from "@/lib/generateResumePdf";
import ResumePreview from "@/components/ResumePreview";

export default function ResumePage() {
  const supabase = createClient();
  const [model, setModel] = useState(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let dataChannel, mediaChannel, userId;

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      userId = user.id;

      const m = await buildResumeModel(supabase, user.id);
      setModel(m);

      dataChannel = supabase
        .channel(`resume-data-${user.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "portfolio_data", filter: `user_id=eq.${user.id}` },
          async () => setModel(await buildResumeModel(supabase, user.id))
        )
        .subscribe();

      mediaChannel = supabase
        .channel(`resume-media-${user.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "portfolio_media", filter: `user_id=eq.${user.id}` },
          async () => setModel(await buildResumeModel(supabase, user.id))
        )
        .subscribe();
    }

    load();
    return () => {
      if (dataChannel) supabase.removeChannel(dataChannel);
      if (mediaChannel) supabase.removeChannel(mediaChannel);
    };
  }, []);

  async function handleDownload() {
    if (!model) return;
    setDownloading(true);
    downloadResumePdf(model);
    setDownloading(false);
  }

  if (!model) return <main className="p-10 text-neutral-500">Loading…</main>;

  return (
    <main className="p-6 md:p-10">
      <div className="flex items-center justify-between max-w-3xl mx-auto mb-6">
        <div>
          <h1 className="font-display text-3xl">Resume</h1>
          <p className="text-neutral-500 text-sm mt-1">
            Auto-built from everything you've added. Only you (and admins, view-only) can see this.
          </p>
        </div>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="rounded-xl bg-ink text-white px-5 py-2.5 text-sm font-medium hover:bg-black transition disabled:opacity-60"
        >
          {downloading ? "Preparing…" : "Download PDF"}
        </button>
      </div>

      <ResumePreview profile={model.profile} sections={model.sections} />
    </main>
  );
}
