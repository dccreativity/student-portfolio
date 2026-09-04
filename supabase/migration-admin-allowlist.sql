-- =========================================================
-- MIGRATION: admin allowlist (run after migration-grade.sql)
-- Replaces manual "request access, super admin approves" with a fixed
-- list of pre-authorized staff emails you control. Anyone signing up
-- via /admin/signup with an email NOT on this list simply becomes a
-- normal student account instead — they can never reach the admin
-- dashboard, no matter what they check at sign-up.
-- =========================================================

create table if not exists public.admin_allowlist (
  email text primary key
);

-- Locked down: no client-side access at all. Only the security-definer
-- trigger function below (which bypasses RLS) can read this table, so
-- managing it is done by you, directly in SQL — see the bottom of this
-- file.
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

-- =========================================================
-- Manage your admin list here. Run an insert like this for each staff
-- member who should have admin access (they still need to sign up once
-- at /admin/signup with this exact email — this just pre-authorizes it):
--
-- insert into public.admin_allowlist (email) values
--   ('principal@adaniinternational.edu.in'),
--   ('counselor@adaniinternational.edu.in');
--
-- To remove someone:
-- delete from public.admin_allowlist where email = 'someone@adaniinternational.edu.in';
-- =========================================================
