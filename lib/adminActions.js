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

// Removing student accounts outright.
//
// The opposite end of the scale from erasePortfolio: nothing is kept, the
// account goes, and the student stops appearing in the lists. If they ever
// sign in with Google again they arrive as a brand new student with a
// brand new empty portfolio.
//
// Files go first and by name, because storage keeps no link back to the
// account — once auth.users is gone there is nothing left to say which
// photographs were theirs, so deleting the account first would strand
// them. Rows follow in one call to remove_students(), which is where the
// super-admin check actually lives (see
// supabase/migration-remove-student.sql); deleting the auth.users row
// cascades to the profile and to every saved section.
export async function removeStudents(supabase, students) {
  const list = (students || []).filter((s) => s?.id);
  if (list.length === 0) throw new Error("No student was named.");

  let filesRemoved = 0;
  for (const student of list) {
    const files = await listStoredFiles(supabase, student.id);
    if (files.length > 0) {
      await removeStoredFiles(supabase, files);
      filesRemoved += files.length;
    }
  }

  const { data, error } = await supabase.rpc("remove_students", {
    targets: list.map((s) => s.id),
  });
  if (error) throw new Error(friendlyRemoveError(error));

  return { removed: Number(data ?? 0), filesRemoved };
}

function friendlyRemoveError(error) {
  const msg = String(error?.message || error);
  if (/only the super admin/i.test(msg)) {
    return "Only the super admin can remove a student profile.";
  }
  if (/your own account/i.test(msg)) {
    return "You cannot remove your own account.";
  }
  if (/could not find the function|does not exist|schema cache/i.test(msg)) {
    return (
      "This site hasn't been set up to remove accounts yet — run " +
      "supabase/migration-remove-student.sql in Supabase, then try again."
    );
  }
  return msg;
}
