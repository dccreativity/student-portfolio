-- =========================================================
-- Super admin, student UID, and realtime deletes
--
-- Already applied to the live project. Kept here so the database can be
-- rebuilt from this folder alone, and so the reasoning is on the record.
-- Safe to run again.
-- =========================================================

-- ---------------------------------------------------------
-- 1. Realtime DELETE events
--
-- Postgres only puts the primary key in a DELETE's old record unless the
-- table replicates its full row. The app subscribes with
-- filter: user_id=eq.<student>, and that filter can never match a payload
-- containing only `id` — so deleting a photo raised no event and the tile
-- stayed on screen until the page was reloaded.
-- ---------------------------------------------------------
alter table public.portfolio_media replica identity full;
alter table public.portfolio_data  replica identity full;

-- ---------------------------------------------------------
-- 2. Student UID — exactly four digits
--
-- Not unique on purpose: a clash between two genuinely identical school
-- UIDs would block the second student's sign-up with a database error.
-- Add `unique` here if you would rather have that guarantee.
-- ---------------------------------------------------------
alter table public.profiles add column if not exists uid text;

alter table public.profiles drop constraint if exists profiles_uid_format;
alter table public.profiles add constraint profiles_uid_format
  check (uid is null or uid ~ '^[0-9]{4}$');

create index if not exists profiles_uid_idx on public.profiles (uid);

-- ---------------------------------------------------------
-- 3. Super admin
--
-- An ordinary admin stays strictly view-only. The super admin is the one
-- account that may also correct and remove student data.
-- ---------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('student', 'admin', 'superadmin'));

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('admin', 'superadmin')
      and status = 'approved'
  );
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = 'superadmin'
      and status = 'approved'
  );
$$;

drop policy if exists portfolio_update_superadmin on public.portfolio_data;
create policy portfolio_update_superadmin on public.portfolio_data
  for update using (is_super_admin()) with check (is_super_admin());

drop policy if exists portfolio_delete_superadmin on public.portfolio_data;
create policy portfolio_delete_superadmin on public.portfolio_data
  for delete using (is_super_admin());

drop policy if exists portfolio_media_update_superadmin on public.portfolio_media;
create policy portfolio_media_update_superadmin on public.portfolio_media
  for update using (is_super_admin()) with check (is_super_admin());

drop policy if exists portfolio_media_delete_superadmin on public.portfolio_media;
create policy portfolio_media_delete_superadmin on public.portfolio_media
  for delete using (is_super_admin());

-- Role and status are still held by protect_profile_role(), so nobody can
-- promote themselves or anyone else through the app.
drop policy if exists profiles_update_superadmin on public.profiles;
create policy profiles_update_superadmin on public.profiles
  for update using (is_super_admin()) with check (is_super_admin());

-- ---------------------------------------------------------
-- 4. New accounts
--
-- Carries the UID through from sign-up, and matches the admin allowlist
-- case- and whitespace-insensitively on BOTH sides. Comparing a raw
-- stored address against a lower-cased one is what previously let a row
-- saved as "Counselor@…" quietly create a student instead of an admin.
-- ---------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  wants_admin boolean;
  is_whitelisted boolean;
begin
  wants_admin := coalesce((new.raw_user_meta_data->>'request_admin')::boolean, false);
  is_whitelisted := exists (
    select 1 from public.admin_allowlist
    where lower(trim(email)) = lower(trim(new.email))
  );

  insert into public.profiles (id, email, full_name, grade, uid, role, status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'grade',
    nullif(new.raw_user_meta_data->>'uid', ''),
    case when wants_admin and is_whitelisted then 'admin' else 'student' end,
    'approved'
  );
  return new;
end;
$$;

-- ---------------------------------------------------------
-- 5. Seed the super admin
-- ---------------------------------------------------------
insert into public.admin_allowlist (email)
values ('deepak.chaudhary@adaniinternational.edu.in')
on conflict (email) do nothing;

update public.profiles
   set role = 'superadmin', status = 'approved'
 where lower(trim(email)) = 'deepak.chaudhary@adaniinternational.edu.in';

-- ---------------------------------------------------------
-- 6. Super admin writes to an untouched section
--
-- Saving a section the student has never filled in is an INSERT, not an
-- UPDATE (the app upserts). Without this the super admin's Save would
-- fail on exactly the empty sections they are most likely to be
-- correcting. Ordinary admins still match no write policy at all.
-- ---------------------------------------------------------
drop policy if exists portfolio_insert_superadmin on public.portfolio_data;
create policy portfolio_insert_superadmin on public.portfolio_data
  for insert with check (is_super_admin());

drop policy if exists portfolio_media_insert_superadmin on public.portfolio_media;
create policy portfolio_media_insert_superadmin on public.portfolio_media
  for insert with check (is_super_admin());
