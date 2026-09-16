// Shared upload helpers for every place a student can attach a file:
// the two galleries and the "Attach files" control on every section.

export const BUCKET = "portfolio-media";

// The bucket is private, so nothing in it is reachable by URL without a
// session. Files are handed out as short-lived signed links instead,
// minted per view for whoever is allowed to see them.
export const SIGNED_URL_TTL = 60 * 60; // 1 hour, for on-screen links
export const SIGNED_URL_TTL_LONG = 60 * 60 * 24 * 7; // 1 week, for links inside a downloaded PDF

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

// ---------------------------------------------------------------------
// Shrinking photographs before they are uploaded
//
// A photo off a modern phone is 3-5 MB and several thousand pixels wide.
// Nothing on this site — a gallery tile, a resume thumbnail — shows more
// than a fraction of that, so the full-size original costs storage and
// costs every student who later loads the page, for no visible gain.
//
// Resizing to fit inside MAX_IMAGE_EDGE and re-encoding as JPEG typically
// takes 4 MB down to 200-400 KB with no difference at the sizes actually
// displayed.
//
// JPEG rather than WebP on purpose: the resume PDF is drawn by jsPDF,
// which decodes JPEG and PNG and nothing else. Transparency is flattened
// onto white first, since JPEG has no alpha and the alternative is the
// black background that catches people out.
// ---------------------------------------------------------------------
export const MAX_IMAGE_EDGE = 1600;
const IMAGE_QUALITY = 0.82;

// Formats deliberately left alone: a GIF would lose its animation, and an
// SVG is already tiny and would only get bigger as pixels.
const NEVER_SHRINK = /^image\/(gif|svg\+xml)$/i;

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("unreadable"));
    };
    img.src = url;
  });
}

export async function shrinkImage(file) {
  if (typeof document === "undefined") return file;
  if (!String(file.type || "").startsWith("image/")) return file;
  if (NEVER_SHRINK.test(file.type)) return file;

  try {
    const img = await loadImage(file);
    const { naturalWidth: w, naturalHeight: h } = img;
    if (!w || !h) return file;

    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(w, h));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);

    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", IMAGE_QUALITY)
    );

    // If the original was already smaller — a tidy screenshot, say — keep
    // it rather than re-encoding it into something worse.
    if (!blob || blob.size >= file.size) return file;

    const renamed = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], renamed, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    // An image the browser cannot decode — a HEIC straight off an iPhone
    // on a browser without support — uploads untouched rather than failing.
    return file;
  }
}

// Uploads one file and returns the attachment record we store inside the
// section's jsonb. Throws an Error with a human-readable message.
export async function uploadPortfolioFile(supabase, { userId, pathPrefix, file: original }) {
  if (!userId) throw new Error("You need to be logged in to upload files.");

  // Shrink first, so a large photo is measured against the limit at the
  // size it will actually be stored.
  const file = await shrinkImage(original);

  if (file.size > MAX_FILE_BYTES) {
    throw new Error(
      `That file is ${formatBytes(file.size)}. The limit is ${formatBytes(MAX_FILE_BYTES)} — try compressing it first.`
    );
  }

  const safeName = sanitizeFileName(file.name);
  // The first path segment is the owning student's user id. The Storage
  // policy checks it against the person uploading, so one student can
  // never write into another's folder; the super admin has a separate
  // policy and may write anywhere in the bucket.
  const path = `${userId}/${pathPrefix}/${Date.now()}-${safeName}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });

  if (error) {
    throw new Error(friendlyUploadError(error));
  }

  const { data: signed } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL);

  return {
    // `path` is the durable identifier; `url` is a signed link that
    // expires, refreshed whenever the file is displayed again.
    url: signed?.signedUrl || "",
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
  // must not block removing the file from the section. The path is
  // recovered from a legacy public URL when it wasn't stored separately.
  const path = storagePathOf(attachment);
  if (!path) return;
  await supabase.storage.from(BUCKET).remove([path]);
}

function friendlyUploadError(error) {
  const msg = String(error?.message || error);
  if (/bucket not found/i.test(msg)) {
    return "The file storage bucket is missing. Run supabase/media.sql in your Supabase SQL Editor, then try again.";
  }
  if (/row-level security|violates|unauthorized|403/i.test(msg)) {
    // Deliberately does not name a file to re-run. This is almost always
    // a permission question — who is uploading, into whose folder — and
    // pointing at media.sql sends people to re-run something that was
    // never the problem.
    return (
      "Storage wouldn't accept this file. You may not have permission to " +
      "add files here, or your session may have expired — try signing out " +
      "and back in. If it keeps happening, tell your school administrator."
    );
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
        path: storagePathFromUrl(entry.attachment_url),
        name: entry.attachment_name || "Attachment",
        kind: fileKind(entry.attachment_name || ""),
      },
    ];
  }
  return [];
}

// Files uploaded while the bucket was public were stored as a public URL
// only. The object path is still recoverable from that URL, which is what
// lets those older files keep working now that the bucket is private.
export function storagePathFromUrl(url) {
  if (!url || typeof url !== "string") return null;
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const i = url.indexOf(marker);
  if (i === -1) return null;
  try {
    return decodeURIComponent(url.slice(i + marker.length).split("?")[0]);
  } catch {
    return url.slice(i + marker.length).split("?")[0];
  }
}

export function storagePathOf(item) {
  if (!item) return null;
  return item.path || item.storage_path || storagePathFromUrl(item.url || item.file_url);
}

// Signs a batch of object paths in one request and returns a
// path -> signed URL map. Paths the viewer isn't allowed to read simply
// don't come back, so nothing leaks by accident.
export async function signPaths(supabase, paths, expiresIn = SIGNED_URL_TTL) {
  const unique = [...new Set((paths || []).filter(Boolean))];
  if (unique.length === 0) return new Map();

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(unique, expiresIn);
  if (error || !data) return new Map();

  const map = new Map();
  data.forEach((row) => {
    if (row?.signedUrl && !row.error) map.set(row.path, row.signedUrl);
  });
  return map;
}

// Replaces each attachment's `url` with a freshly signed one.
export async function signAttachments(supabase, attachments, expiresIn = SIGNED_URL_TTL) {
  const list = attachments || [];
  const map = await signPaths(supabase, list.map(storagePathOf), expiresIn);
  return list.map((a) => {
    const path = storagePathOf(a);
    const url = path ? map.get(path) : null;
    return url ? { ...a, url } : a;
  });
}

// Writes the array back and clears the legacy single-file keys, so an
// entry never carries two conflicting representations.
export function withAttachments(entry, attachments) {
  const next = { ...entry, attachments };
  delete next.attachment_url;
  delete next.attachment_name;
  return next;
}
