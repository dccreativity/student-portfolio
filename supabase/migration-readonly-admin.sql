-- =========================================================
-- MIGRATION: admins become genuinely read-only, plus file-attachment
-- support. Run this once in Supabase SQL Editor, after
-- migration-grade.sql and migration-admin-allowlist.sql.
--
-- Until now "admins can view but not edit" was enforced only in the UI —
-- the database still allowed an admin to write. This closes that gap, so
-- even a hand-crafted request from an admin account cannot change or
-- delete a student's data. Students keep full control of their own rows.
-- =========================================================

-- ---------- 1. remember where each gallery file lives ----------
-- Lets "Remove" delete the actual file from Storage instead of leaving
-- an orphan object behind that still counts against your quota.
alter table public.portfolio_media add column if not exists storage_path text;

-- ---------- 2. portfolio_data: admins read only ----------
drop policy if exists portfolio_select on public.portfolio_data;
create policy portfolio_select on public.portfolio_data
  for select using (auth.uid() = user_id or public.is_admin());

drop policy if exists portfolio_insert on public.portfolio_data;
create policy portfolio_insert on public.portfolio_data
  for insert with check (auth.uid() = user_id);

drop policy if exists portfolio_update on public.portfolio_data;
create policy portfolio_update on public.portfolio_data
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists portfolio_delete on public.portfolio_data;
create policy portfolio_delete on public.portfolio_data
  for delete using (auth.uid() = user_id);

-- ---------- 3. portfolio_media: admins read only ----------
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

-- ---------- 4. Storage objects: only the owning student writes ----------
-- The first folder in the object path is always the student's user id,
-- which is what makes this check possible.
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

drop policy if exists "media_read_all" on storage.objects;
create policy "media_read_all"
on storage.objects for select
using (bucket_id = 'portfolio-media');

-- ---------- 5. profiles: admins read every student, edit none ----------
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select using (auth.uid() = id);

drop policy if exists profiles_select_admin on public.profiles;
create policy profiles_select_admin on public.profiles
  for select using (public.is_admin());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Removed on purpose: admins no longer update other people's profiles.
-- Promoting a staff member is done through public.admin_allowlist
-- (see migration-admin-allowlist.sql), not from inside the app.
drop policy if exists profiles_update_admin on public.profiles;

-- No delete policy exists on any of these tables for admins, so an admin
-- cannot remove a student's account or data either.

-- ---------- 6. self-escalation guard ----------
-- With no admin update policy left, role/status can only change through
-- SQL you run yourself. This keeps a student from flipping their own row
-- even if a policy is ever loosened again.
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role or new.status is distinct from old.status then
    new.role := old.role;
    new.status := old.status;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role_trigger on public.profiles;
create trigger protect_profile_role_trigger
  before update on public.profiles
  for each row execute function public.protect_profile_role();
