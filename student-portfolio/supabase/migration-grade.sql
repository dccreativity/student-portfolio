-- =========================================================
-- MIGRATION: add student grade
-- Your database already exists, so schema.sql's "create table if not
-- exists" won't add this new column on its own — run this once instead.
-- =========================================================

alter table public.profiles add column if not exists grade text;

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

  insert into public.profiles (id, email, full_name, grade, role, status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'grade',
    case when wants_admin then 'admin' else 'student' end,
    case when wants_admin then 'pending' else 'approved' end
  );
  return new;
end;
$$;
