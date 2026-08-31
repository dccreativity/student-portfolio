"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabaseClient";

const BUCKET = "portfolio-media";

// `readOnly` is used by the admin's per-student view — admins can browse
// a student's galleries but never upload, edit captions, or delete.
export default function MediaGallery({ userId, sectionKey, mediaType, readOnly = false }) {
  const supabase = createClient();
  const fileInput = useRef(null);

  const [items, setItems] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    let channel;

    async function load() {
      const { data } = await supabase
        .from("portfolio_media")
        .select("*")
        .eq("user_id", userId)
        .eq("section", sectionKey)
        .order("created_at", { ascending: false });
      setItems(data || []);

      channel = supabase
        .channel(`media-${sectionKey}-${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "portfolio_media",
            filter: `user_id=eq.${userId}`,
          },
          () => load()
        )
        .subscribe();
    }

    load();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [userId, sectionKey]);

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setStatus("Uploading…");

    const path = `${userId}/${sectionKey}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file);

    if (uploadError) {
      setStatus(`Error: ${uploadError.message}`);
      setUploading(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(path);

    const { error: insertError } = await supabase.from("portfolio_media").insert({
      user_id: userId,
      section: sectionKey,
      file_url: publicUrlData.publicUrl,
      caption: "",
      year: new Date().getFullYear(),
    });

    setUploading(false);
    setStatus(insertError ? `Error: ${insertError.message}` : "Uploaded ✓");
    setTimeout(() => setStatus(""), 2000);
    if (fileInput.current) fileInput.current.value = "";
  }

  function updateCaption(id, caption) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, caption } : it)));
  }

  async function saveCaption(item) {
    await supabase.from("portfolio_media").update({ caption: item.caption }).eq("id", item.id);
  }

  async function handleDelete(item) {
    await supabase.from("portfolio_media").delete().eq("id", item.id);
  }

  return (
    <div>
      {readOnly && (
        <p className="text-xs uppercase tracking-wide text-neutral-400 mb-4">View only</p>
      )}

      {!readOnly && (
        <>
          <label className="inline-block rounded-xl bg-ink text-white px-5 py-2.5 text-sm font-medium hover:bg-black transition cursor-pointer">
            {uploading ? "Uploading…" : `Upload ${mediaType === "image" ? "photo" : "video"}`}
            <input
              ref={fileInput}
              type="file"
              accept={mediaType === "image" ? "image/*" : "video/*"}
              onChange={handleUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
          {status && <span className="text-sm text-neutral-500 ml-4">{status}</span>}
        </>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        {items.map((item) => (
          <div key={item.id} className="rounded-2xl border border-line bg-white/70 overflow-hidden">
            {mediaType === "image" ? (
              <img src={item.file_url} alt={item.caption || ""} className="w-full h-40 object-cover" />
            ) : (
              <video src={item.file_url} controls className="w-full h-40 object-cover bg-black" />
            )}
            <div className="p-3 space-y-2">
              {readOnly ? (
                <p className="text-sm text-neutral-600">{item.caption || "—"}</p>
              ) : (
                <>
                  <input
                    value={item.caption || ""}
                    onChange={(e) => updateCaption(item.id, e.target.value)}
                    onBlur={() => saveCaption(item)}
                    placeholder="Caption / activity"
                    className="w-full text-sm rounded-lg border border-line px-2 py-1 outline-none focus:ring-2 focus:ring-clay"
                  />
                  <button
                    onClick={() => handleDelete(item)}
                    className="text-xs text-neutral-400 hover:text-red-600"
                  >
                    Remove
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-sm text-neutral-500">Nothing uploaded yet.</p>
        )}
      </div>
    </div>
  );
}
