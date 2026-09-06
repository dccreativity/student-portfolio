"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import {
  ACCEPT_ANY,
  fileIcon,
  fileKind,
  formatBytes,
  removePortfolioFile,
  uploadPortfolioFile,
} from "@/lib/uploads";

// One reusable attachment control, used for every entry in every
// repeatable section AND at the top of the single/mixed sections, so a
// student can attach evidence (photo, PDF, certificate, video) anywhere.
export default function FileAttachments({
  attachments = [],
  onChange,
  userId,
  pathPrefix,
  readOnly = false,
  label = "Attach files",
}) {
  const supabase = createClient();
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");

  async function handleFiles(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setError("");
    setBusy(true);

    const uploaded = [];
    const failures = [];

    for (let i = 0; i < files.length; i++) {
      setProgress(files.length > 1 ? `Uploading ${i + 1} of ${files.length}…` : "Uploading…");
      try {
        uploaded.push(
          await uploadPortfolioFile(supabase, { userId, pathPrefix, file: files[i] })
        );
      } catch (err) {
        failures.push(`${files[i].name}: ${err.message}`);
      }
    }

    setBusy(false);
    setProgress("");
    if (inputRef.current) inputRef.current.value = "";

    // Apply every success in one update — updating per file would read a
    // stale array and silently drop all but the last one.
    if (uploaded.length > 0) onChange([...attachments, ...uploaded]);
    if (failures.length > 0) setError(failures.join(" · "));
  }

  async function handleRemove(index) {
    const target = attachments[index];
    onChange(attachments.filter((_, i) => i !== index));
    await removePortfolioFile(supabase, target);
  }

  if (readOnly && attachments.length === 0) return null;

  return (
    <div className="mt-3">
      {attachments.length > 0 && (
        <ul className="flex flex-wrap gap-2 mb-2">
          {attachments.map((a, i) => {
            const kind = a.kind || fileKind(a.type || a.name || "");
            return (
              <li
                key={a.path || a.url || i}
                className="group flex items-center gap-2 rounded-xl border border-line bg-white/80 pl-2 pr-2.5 py-1.5 max-w-full"
              >
                {kind === "image" ? (
                  <img
                    src={a.url}
                    alt=""
                    className="w-8 h-8 rounded-lg object-cover shrink-0"
                  />
                ) : (
                  <span className="w-8 h-8 rounded-lg bg-sand grid place-items-center text-sm shrink-0">
                    {fileIcon(kind)}
                  </span>
                )}
                <a
                  href={a.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-ink hover:text-clay truncate max-w-[10rem]"
                  title={a.name}
                >
                  {a.name || "Attachment"}
                </a>
                {a.size ? (
                  <span className="text-[10px] text-neutral-400 shrink-0">
                    {formatBytes(a.size)}
                  </span>
                ) : null}
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => handleRemove(i)}
                    className="text-neutral-300 hover:text-red-600 text-sm leading-none shrink-0"
                    aria-label={`Remove ${a.name || "attachment"}`}
                  >
                    ×
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {!readOnly && (
        <>
          <label className="inline-flex items-center gap-1.5 text-xs font-medium text-clay cursor-pointer hover:text-ink transition">
            {busy ? progress || "Uploading…" : `+ ${label}`}
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={ACCEPT_ANY}
              onChange={handleFiles}
              disabled={busy}
              className="hidden"
            />
          </label>
          <span className="text-[11px] text-neutral-400 ml-2">
            Images, PDFs, documents or video
          </span>
          {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        </>
      )}
    </div>
  );
}
