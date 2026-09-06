// Shared upload helpers for every place a student can attach a file:
// the two galleries and the "Attach files" control on every section.

export const BUCKET = "portfolio-media";

// Supabase's default per-file limit on the free plan. Checked here so a
// student gets a clear message instead of an opaque storage error.
export const MAX_FILE_BYTES = 50 * 1024 * 1024;

export const ACCEPT_ANY =
  "image/*,video/*,application/pdf," +
  "application/msword," +
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document," +
  "application/vnd.ms-excel," +
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet," +
  "application/vnd.ms-powerpoint," +
  "application/vnd.openxmlformats-officedocument.presentationml.presentation," +
  ".doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.rtf,.heic";

export function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Storage object keys only reliably accept a conservative character set —
// spaces, accented characters and emoji in a file name are a common cause
// of uploads that fail with a confusing error, so normalise first.
export function sanitizeFileName(name) {
  const raw = String(name || "");
  const dot = raw.lastIndexOf(".");
  const hasExt = dot > 0 && dot < raw.length - 1 && raw.length - dot <= 8;
  const base = clean(hasExt ? raw.slice(0, dot) : raw) || "file";
  const ext = hasExt ? clean(raw.slice(dot + 1)) : "";
  return ext ? `${base.slice(0, 70)}.${ext}` : base.slice(0, 78);
}

function clean(part) {
  return part
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");
}

export function fileKind(nameOrType = "") {
  const v = String(nameOrType).toLowerCase();
  if (v.startsWith("image/") || /\.(png|jpe?g|gif|webp|avif|heic|bmp|svg)$/.test(v)) return "image";
  if (v.startsWith("video/") || /\.(mp4|mov|webm|m4v|avi|mkv)$/.test(v)) return "video";
  if (v === "application/pdf" || /\.pdf$/.test(v)) return "pdf";
  return "file";
}

export function fileIcon(kind) {
  return { image: "🖼️", video: "🎬", pdf: "📄", file: "📎" }[kind] || "📎";
}

// Uploads one file and returns the attachment record we store inside the
// section's jsonb. Throws an Error with a human-readable message.
export async function uploadPortfolioFile(supabase, { userId, pathPrefix, file }) {
  if (!userId) throw new Error("You need to be logged in to upload files.");
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(
      `That file is ${formatBytes(file.size)}. The limit is ${formatBytes(MAX_FILE_BYTES)} — try compressing it first.`
    );
  }

  const safeName = sanitizeFileName(file.name);
  // The first path segment must be the student's own user id: that is what
  // the Storage RLS policy checks, so files can never land in someone
  // else's folder.
  const path = `${userId}/${pathPrefix}/${Date.now()}-${safeName}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });

  if (error) {
    throw new Error(friendlyUploadError(error));
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return {
    url: data.publicUrl,
    path,
    name: file.name,
    type: file.type || "",
    size: file.size,
    kind: fileKind(file.type || file.name),
    uploaded_at: new Date().toISOString(),
  };
}

export async function removePortfolioFile(supabase, attachment) {
  // Best effort: the row is the source of truth, so a failed object delete
  // (e.g. a legacy attachment saved before we stored `path`) must not block
  // removing it from the section.
  if (!attachment?.path) return;
  await supabase.storage.from(BUCKET).remove([attachment.path]);
}

function friendlyUploadError(error) {
  const msg = String(error?.message || error);
  if (/bucket not found/i.test(msg)) {
    return "The file storage bucket is missing. Run supabase/media.sql in your Supabase SQL Editor, then try again.";
  }
  if (/row-level security|violates|unauthorized|403/i.test(msg)) {
    return "Storage rejected this upload. Re-run supabase/media.sql so the upload policies exist, then try again.";
  }
  if (/payload too large|413|exceeded the maximum/i.test(msg)) {
    return "That file is larger than the storage limit set on your Supabase project.";
  }
  if (/duplicate|already exists/i.test(msg)) {
    return "A file with that exact name was just uploaded — rename it and try again.";
  }
  return `Upload failed: ${msg}`;
}

// Entries saved before multi-file support stored one file as
// attachment_url / attachment_name. Normalise both shapes to one array so
// nothing a student already uploaded is lost.
export function attachmentsOf(entry) {
  if (!entry) return [];
  if (Array.isArray(entry.attachments)) return entry.attachments;
  if (entry.attachment_url) {
    return [
      {
        url: entry.attachment_url,
        name: entry.attachment_name || "Attachment",
        kind: fileKind(entry.attachment_name || ""),
      },
    ];
  }
  return [];
}

// Writes the array back and clears the legacy single-file keys, so an
// entry never carries two conflicting representations.
export function withAttachments(entry, attachments) {
  const next = { ...entry, attachments };
  delete next.attachment_url;
  delete next.attachment_name;
  return next;
}
