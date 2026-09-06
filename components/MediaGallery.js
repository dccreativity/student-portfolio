"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import {
  BUCKET,
  formatBytes,
  MAX_FILE_BYTES,
  signPaths,
  storagePathOf,
  uploadPortfolioFile,
} from "@/lib/uploads";

// `readOnly` is used by the admin's per-student view — admins can browse
// a student's galleries but never upload, edit captions, or delete.
export default function MediaGallery({ userId, sectionKey, mediaType, readOnly = false }) {
  const supabase = createClient();
  const fileInput = useRef(null);

  const [items, setItems] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let channel;
    let cancelled = false;

    async function load() {
      const { data } = await supabase
        .from("portfolio_media")
        .select("*")
        .eq("user_id", userId)
        .eq("section", sectionKey)
        .order("created_at", { ascending: false });

      const rows = data || [];
      // The bucket is private: every row needs a freshly signed link
      // before it can be shown.
      const map = await signPaths(supabase, rows.map(storagePathOf));
      if (cancelled) return;
      setItems(
        rows.map((r) => {
          const path = storagePathOf(r);
          return { ...r, view_url: (path && map.get(path)) || r.file_url };
        })
      );
    }

    load();
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

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [userId, sectionKey]);

  async function handleUpload(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setError("");
    setUploading(true);

    const failures = [];
    for (let i = 0; i < files.length; i++) {
      setStatus(files.length > 1 ? `Uploading ${i + 1} of ${files.length}…` : "Uploading…");
      try {
        const uploaded = await uploadPortfolioFile(supabase, {
          userId,
          pathPrefix: sectionKey,
          file: files[i],
        });

        const { error: insertError } = await supabase.from("portfolio_media").insert({
          user_id: userId,
          section: sectionKey,
          // file_url is kept for older rows' sake; storage_path is what
          // actually resolves the file now that the bucket is private.
          file_url: uploaded.url,
          storage_path: uploaded.path,
          caption: "",
          year: new Date().getFullYear(),
        });
        if (insertError) throw new Error(insertError.message);
      } catch (err) {
        failures.push(`${files[i].name}: ${err.message}`);
      }
    }

    setUploading(false);
    if (fileInput.current) fileInput.current.value = "";

    if (failures.length > 0) {
      setStatus("");
      setError(failures.join(" · "));
    } else {
      setStatus("Uploaded ✓");
      setTimeout(() => setStatus(""), 2500);
    }
  }

  function updateCaption(id, caption) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, caption, dirty: true } : it)));
  }

  async function saveCaption(item) {
    if (!item.dirty) return;
    await supabase.from("portfolio_media").update({ caption: item.caption }).eq("id", item.id);
    setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, dirty: false } : it)));
  }

  async function handleDelete(item) {
    const { error: deleteError } = await supabase
      .from("portfolio_media")
      .delete()
      .eq("id", item.id);
    if (deleteError) {
      setError(`Couldn't remove that file: ${deleteError.message}`);
      return;
    }
    // Free the storage object too, so removed files don't keep counting
    // against the project's quota.
    const path = storagePathOf(item);
    if (path) await supabase.storage.from(BUCKET).remove([path]);
  }

  const noun = mediaType === "image" ? "photo" : "video";

  return (
    <div>
      {readOnly && (
        <p className="text-xs uppercase tracking-wide text-neutral-400 mb-4">View only</p>
      )}

      {!readOnly && (
        <div className="flex flex-wrap items-center gap-4">
          <label className="inline-block rounded-xl bg-ink text-white px-5 py-2.5 text-sm font-medium hover:bg-black transition cursor-pointer">
            {uploading ? status || "Uploading…" : `Upload ${noun}s`}
            <input
              ref={fileInput}
              type="file"
              multiple
              accept={mediaType === "image" ? "image/*" : "video/*"}
              onChange={handleUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
          <span className="text-xs text-neutral-400">
            You can pick several at once · up to {formatBytes(MAX_FILE_BYTES)} each
          </span>
          {!uploading && status && <span className="text-sm text-neutral-500">{status}</span>}
        </div>
      )}

      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        {items.map((item) => (
          <div key={item.id} className="rounded-2xl border border-line bg-white/70 overflow-hidden">
            {mediaType === "image" ? (
              <img
                src={item.view_url}
                alt={item.caption || ""}
                className="w-full h-40 object-cover"
              />
            ) : (
              <video src={item.view_url} controls className="w-full h-40 object-cover bg-black" />
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
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-neutral-400">
                      {item.dirty ? "Unsaved — click outside to save" : "Saved"}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDelete(item)}
                      className="text-xs text-neutral-400 hover:text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-sm text-neutral-500">
            {readOnly ? "Nothing uploaded yet." : `No ${noun}s yet — upload your first one above.`}
          </p>
        )}
      </div>
    </div>
  );
}
