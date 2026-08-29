-- =========================================================
-- STUDENT PORTFOLIO — CORE SCHEMA
-- Run this once in Supabase Studio: SQL Editor > New query > paste > Run
-- =========================================================

-- ---------- profiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique not null,
  full_name text,
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
alter publication supabase_realtime add table public.portfolio_data;
alter publication supabase_realtime add table public.profiles;

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
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  wants_admin boolean;
begin
  wants_admin := coalesce((new.raw_user_meta_data->>'request_admin')::boolean, false);

  insert into public.profiles (id, email, full_name, role, status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    case when wants_admin then 'admin' else 'student' end,
    case when wants_admin then 'pending' else 'approved' end
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
security definer
set search_path = public
as $$
begin
  if (new.role <> old.role or new.status <> old.status) and not public.is_admin() then
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

drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin on public.profiles
  for update using (public.is_admin());

-- ---------- RLS: portfolio_data ----------
drop policy if exists portfolio_select on public.portfolio_data;
create policy portfolio_select on public.portfolio_data
  for select using (auth.uid() = user_id or public.is_admin());

drop policy if exists portfolio_insert on public.portfolio_data;
create policy portfolio_insert on public.portfolio_data
  for insert with check (auth.uid() = user_id or public.is_admin());

drop policy if exists portfolio_update on public.portfolio_data;
create policy portfolio_update on public.portfolio_data
  for update using (auth.uid() = user_id or public.is_admin());

drop policy if exists portfolio_delete on public.portfolio_data;
create policy portfolio_delete on public.portfolio_data
  for delete using (auth.uid() = user_id or public.is_admin());

-- ---------- seed the first super admin ----------
-- 1. Sign up normally through the app with your own school email, WITH the
--    "I'm school staff requesting administrator access" box checked.
-- 2. Verify your email with the OTP code as usual.
-- 3. Then run this (replace the email) to approve yourself as the first
--    super admin — every admin approved after this can be approved from
--    the admin dashboard UI instead of SQL:
--
-- update public.profiles
--    set role = 'admin', status = 'approved'
--    where email = 'you@adaniinternational.edu.in';
