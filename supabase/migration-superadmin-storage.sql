-- =========================================================
-- Super admin access to the files themselves
--
-- Already applied to the live project. Kept here so the database can be
-- rebuilt from this folder alone. Safe to run again.
-- =========================================================

-- Every file is stored under the owning student's user id as its first
-- path segment, and the policies in media.sql require that segment to
-- equal auth.uid(). That is exactly right for students — it is what stops
-- one student writing into another's folder — but it silently excluded
-- the super admin, who writes into the folder of whichever student they
-- are looking at.
--
-- The result was a half-granted permission: the super admin could already
-- insert and update the database rows describing an attachment, so the
-- record saved while the file behind it was refused, and the app reported
-- a storage error that pointed at the wrong cause.
--
-- Ordinary admins match none of these and remain strictly read-only.

drop policy if exists media_upload_superadmin on storage.objects;
create policy media_upload_superadmin on storage.objects
  for insert
  with check (bucket_id = 'portfolio-media' and public.is_super_admin());

drop policy if exists media_update_superadmin on storage.objects;
create policy media_update_superadmin on storage.objects
  for update
  using (bucket_id = 'portfolio-media' and public.is_super_admin())
  with check (bucket_id = 'portfolio-media' and public.is_super_admin());

drop policy if exists media_delete_superadmin on storage.objects;
create policy media_delete_superadmin on storage.objects
  for delete
  using (bucket_id = 'portfolio-media' and public.is_super_admin());
