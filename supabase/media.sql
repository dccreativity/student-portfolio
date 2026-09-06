-- =========================================================
-- FILE STORAGE — galleries and section attachments
-- Run this in Supabase SQL Editor after schema.sql and auth-hook.sql.
-- Safe to re-run: every policy is dropped first.
-- =========================================================

-- Private on purpose: nothing in this bucket is reachable by URL without
-- a session. The app hands out short-lived signed links instead.
insert into storage.buckets (id, name, public)
values ('portfolio-media', 'portfolio-media', false)
on conflict (id) do update set public = false;

-- Every object path starts with the uploader's own user id
-- (<user_id>/<section>/<timestamp>-<file>), which is what these policies
-- check. Writes are owner-only — admins are read-only everywhere.
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

-- A student reads their own files; staff read any student's files. Nobody
-- else, signed in or not, can read anything here.
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

create table if not exists public.portfolio_media (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  section text not null check (section in ('picture_gallery', 'video_gallery')),
  file_url text not null,
  storage_path text,
  caption text,
  year int,
  activity_tag text,
  created_at timestamptz not null default now()
);

alter table public.portfolio_media add column if not exists storage_path text;
alter table public.portfolio_media enable row level security;

-- Streams gallery changes to any open dashboard in real time. Wrapped
-- because re-running the file would otherwise fail once the table is
-- already published.
do $$
begin
  alter publication supabase_realtime add table public.portfolio_media;
exception
  when duplicate_object then null;
end;
$$;

drop policy if exists "portfolio_media_select" on public.portfolio_media;
create policy "portfolio_media_select" on public.portfolio_media
  for select using (auth.uid() = user_id or public.is_admin());

drop policy if exists "portfolio_media_insert" on public.portfolio_media;
create policy "portfolio_media_insert" on public.portfolio_media
  for insert with check (auth.uid() = user_id);

drop policy if exists "portfolio_media_update" on public.portfolio_media;
create policy "portfolio_media_update" on public.portfolio_media
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "portfolio_media_delete" on public.portfolio_media;
create policy "portfolio_media_delete" on public.portfolio_media
  for delete using (auth.uid() = user_id);
