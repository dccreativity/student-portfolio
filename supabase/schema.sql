-- =========================================================
-- STUDENT PORTFOLIO — CORE SCHEMA
-- Run this once in Supabase Studio: SQL Editor > New query > paste > Run
-- =========================================================

-- ---------- profiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique not null,
  full_name text,
  grade text,
  role text not null default 'student' check (role in ('student', 'admin')),
  status text not null default 'approved' check (status in ('pending', 'approved')),
  gpa numeric,
  sat_score int,
  awards_count int,
  service_hours int,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- ---------- portfolio_data ----------
-- One row per (student, section). `content` holds that section's fields
-- as jsonb, so every tab in the UI (About, Academics, Projects, ...)
-- can evolve independently without new migrations.
create table if not exists public.portfolio_data (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  section text not null,
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (user_id, section)
);

alter table public.portfolio_data enable row level security;

-- Required for Supabase Realtime to stream row changes to the dashboard.
-- Wrapped so this file stays safe to re-run once the tables are already
-- part of the publication.
do $$
begin
  alter publication supabase_realtime add table public.portfolio_data;
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.profiles;
exception
  when duplicate_object then null;
end;
$$;

-- ---------- helper: is_admin() ----------
-- security definer so it can read `profiles` without recursing through
-- the RLS policies that themselves call this function.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and status = 'approved'
  );
$$;

-- ---------- new user -> profile row ----------
create table if not exists public.admin_allowlist (
  email text primary key
);
alter table public.admin_allowlist enable row level security;

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
    select 1 from public.admin_allowlist where email = lower(new.email)
  );

  insert into public.profiles (id, email, full_name, grade, role, status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'grade',
    case when wants_admin and is_whitelisted then 'admin' else 'student' end,
    'approved'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- protect role/status from self-escalation ----------
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Deliberately NOT security definer: inside a security-definer function
  -- current_user reports the function's owner, not the role doing the
  -- update, which would make this check useless.
  --
  -- Every request from a browser runs as `anon` or `authenticated`, so a
  -- student can never change their own role or status whatever they send.
  -- Anything else -- you, running SQL in the Supabase SQL Editor -- is
  -- allowed through on purpose, otherwise there would be no way left to
  -- appoint or remove staff at all.
  if current_user in ('anon', 'authenticated')
     and (new.role is distinct from old.role or new.status is distinct from old.status)
  then
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

-- ---------- RLS: profiles ----------
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select using (auth.uid() = id);

drop policy if exists profiles_select_admin on public.profiles;
create policy profiles_select_admin on public.profiles
  for select using (public.is_admin());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Deliberately absent: there is no admin UPDATE policy. Admins are
-- read-only across the whole app, so staff can never change a student's
-- profile. Promoting staff is done via public.admin_allowlist below.
drop policy if exists profiles_update_admin on public.profiles;

-- ---------- RLS: portfolio_data ----------
drop policy if exists portfolio_select on public.portfolio_data;
create policy portfolio_select on public.portfolio_data
  for select using (auth.uid() = user_id or public.is_admin());

-- Writes are owner-only. Admins appear in the SELECT policy above and
-- nowhere else, which is what makes "view but never edit or delete"
-- true in the database rather than only in the UI.
drop policy if exists portfolio_insert on public.portfolio_data;
create policy portfolio_insert on public.portfolio_data
  for insert with check (auth.uid() = user_id);

drop policy if exists portfolio_update on public.portfolio_data;
create policy portfolio_update on public.portfolio_data
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists portfolio_delete on public.portfolio_data;
create policy portfolio_delete on public.portfolio_data
  for delete using (auth.uid() = user_id);

-- ---------- authorising school staff ----------
-- Admin access is granted by email, before the person ever signs up.
-- Add each staff member here, then have them create their account at
-- /admin/signup with that exact address:
--
-- insert into public.admin_allowlist (email) values
--   ('principal@adaniinternational.edu.in'),
--   ('counselor@adaniinternational.edu.in')
-- on conflict (email) do nothing;
--
-- Anyone who signs up at /admin/signup with an email that is NOT on this
-- list silently becomes an ordinary student account instead, so a student
-- can never reach the admin dashboard by using the staff form.
--
-- To revoke access later:
-- delete from public.admin_allowlist where email = 'someone@adaniinternational.edu.in';
-- update public.profiles set role = 'student' where email = 'someone@adaniinternational.edu.in';
