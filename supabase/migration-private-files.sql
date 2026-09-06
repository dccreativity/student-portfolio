-- =========================================================
-- MIGRATION: uploaded files stop being reachable by URL
-- Run this in Supabase SQL Editor after migration-readonly-admin.sql.
-- Safe to re-run.
--
-- Until now the storage bucket was public: anyone holding a file's URL
-- could open it with no account at all, even though the database rows
-- around it were locked down. This makes the bucket private and limits
-- object reads to the student who owns the file and to staff. The app
-- serves files through short-lived signed links instead.
-- =========================================================

-- ---------- 1. the bucket itself ----------
update storage.buckets set public = false where id = 'portfolio-media';

-- ---------- 2. who may read an object ----------
-- The first folder of every object path is the owner's user id, which is
-- what makes this check possible.
drop policy if exists "media_read_all" on storage.objects;

drop policy if exists "media_read_own_or_admin" on storage.objects;
create policy "media_read_own_or_admin"
on storage.objects for select
using (
  bucket_id = 'portfolio-media'
  and (
    auth.uid()::text = (storage.foldername(name))[1]
    or public.is_admin()
  )
);

-- Writes stay owner-only (set in migration-readonly-admin.sql); repeated
-- here so this file is self-contained if run on its own.
drop policy if exists "media_upload_own" on storage.objects;
create policy "media_upload_own"
on storage.objects for insert
with check (
  bucket_id = 'portfolio-media'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "media_update_own" on storage.objects;
create policy "media_update_own"
on storage.objects for update
using (
  bucket_id = 'portfolio-media'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "media_delete_own" on storage.objects;
create policy "media_delete_own"
on storage.objects for delete
using (
  bucket_id = 'portfolio-media'
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- ---------- 3. keep already-uploaded files working ----------
-- Gallery rows created while the bucket was public stored only a public
-- URL. The object path is still inside that URL, so recover it into
-- storage_path — that is what signed links are minted from.
update public.portfolio_media
   set storage_path = split_part(file_url, '/storage/v1/object/public/portfolio-media/', 2)
 where storage_path is null
   and file_url like '%/storage/v1/object/public/portfolio-media/%';

-- Section attachments live inside portfolio_data's jsonb rather than in
-- their own column. The app recovers those paths from the stored URL at
-- read time (see storagePathFromUrl in lib/uploads.js), so no data change
-- is needed here.
