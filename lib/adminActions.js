import {
  collectAttachmentPaths,
  listStoredFiles,
  removeStoredFiles,
  storagePathOf,
} from "@/lib/uploads";

// Clearing one section of one student's portfolio, leaving the other
// sixteen untouched.
//
// Same permission story as erasePortfolio below: the database decides.
// The delete policies match the student themselves and the super admin,
// and nobody else, so an ordinary admin calling this deletes nothing.
export async function clearSection(supabase, studentId, meta) {
  if (!studentId) throw new Error("No student was named.");
  if (!meta?.key) throw new Error("No section was named.");

  // Galleries keep their files as rows of their own; every other section
  // keeps them inside its saved content.
  if (meta.type === "media") {
    const { data: rows, error: readError } = await supabase
      .from("portfolio_media")
      .select("id, storage_path, file_url")
      .eq("user_id", studentId)
      .eq("section", meta.key);
    if (readError) throw new Error(readError.message);

    const paths = (rows || []).map(storagePathOf).filter(Boolean);
    if (paths.length > 0) await removeStoredFiles(supabase, paths);

    const { error } = await supabase
      .from("portfolio_media")
      .delete()
      .eq("user_id", studentId)
      .eq("section", meta.key);
    if (error) throw new Error(error.message);

    return { filesRemoved: paths.length };
  }

  const { data: row, error: readError } = await supabase
    .from("portfolio_data")
    .select("content")
    .eq("user_id", studentId)
    .eq("section", meta.key)
    .maybeSingle();
  if (readError) throw new Error(readError.message);

  const paths = collectAttachmentPaths(row?.content);
  if (paths.length > 0) await removeStoredFiles(supabase, paths);

  const { error } = await supabase
    .from("portfolio_data")
    .delete()
    .eq("user_id", studentId)
    .eq("section", meta.key);
  if (error) throw new Error(error.message);

  return { filesRemoved: paths.length };
}

// Erasing everything a student has entered.
//
// The account itself is left alone: the student signs in with Google
// exactly as before and finds an empty portfolio waiting, rather than
// being locked out and having to be re-added. Their name, school email,
// grade and UID stay too, so they remain in the right grade's list
// instead of dropping into "Grade not set".
//
// Only the super admin can do this, and that is decided by the database,
// not by this function: the delete policies on portfolio_data,
// portfolio_media and storage.objects match nobody else, so an ordinary
// admin calling it would simply delete nothing.
//
// Files are removed before rows on purpose. A failure partway then leaves
// rows still pointing at the student's work, which is visible and can be
// retried; the other order would leave files nothing refers to, silently
// taking up space.
export async function erasePortfolio(supabase, studentId) {
  if (!studentId) throw new Error("No student was named.");

  const files = await listStoredFiles(supabase, studentId);
  if (files.length > 0) await removeStoredFiles(supabase, files);

  const { error: mediaError } = await supabase
    .from("portfolio_media")
    .delete()
    .eq("user_id", studentId);
  if (mediaError) throw new Error(mediaError.message);

  const { error: dataError } = await supabase
    .from("portfolio_data")
    .delete()
    .eq("user_id", studentId);
  if (dataError) throw new Error(dataError.message);

  // What actually went, so the person who pressed the button is told
  // rather than left guessing.
  return { filesRemoved: files.length };
}
