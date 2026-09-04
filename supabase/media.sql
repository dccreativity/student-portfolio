-- =========================================================
-- PICTURE / VIDEO GALLERY STORAGE
-- Run this in Supabase SQL Editor after schema.sql and auth-hook.sql
-- =========================================================

insert into storage.buckets (id, name, public)
values ('portfolio-media', 'portfolio-media', true)
on conflict (id) do nothing;

create policy "media_upload_own"
on storage.objects for insert
with check (
  bucket_id = 'portfolio-media'
  and (auth.uid()::text = (storage.foldername(name))[1] or public.is_admin())
);

create policy "media_read_all"
on storage.objects for select
using (bucket_id = 'portfolio-media');

create policy "media_delete_own"
on storage.objects for delete
using (
  bucket_id = 'portfolio-media'
  and (auth.uid()::text = (storage.foldername(name))[1] or public.is_admin())
);

create table if not exists public.portfolio_media (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  section text not null check (section in ('picture_gallery', 'video_gallery')),
  file_url text not null,
  caption text,
  year int,
  activity_tag text,
  created_at timestamptz not null default now()
);

alter table public.portfolio_media enable row level security;
alter publication supabase_realtime add table public.portfolio_media;

create policy "portfolio_media_select" on public.portfolio_media
  for select using (auth.uid() = user_id or public.is_admin());
create policy "portfolio_media_insert" on public.portfolio_media
  for insert with check (auth.uid() = user_id or public.is_admin());
create policy "portfolio_media_delete" on public.portfolio_media
  for delete using (auth.uid() = user_id or public.is_admin());
