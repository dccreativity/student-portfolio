-- =========================================================
-- Google sign-in
--
-- Already applied to the live project. Kept here so the database can be
-- rebuilt from this folder alone. Safe to run again.
-- =========================================================

-- Creating a profile when the account comes from Google.
--
-- Two things change now that Google is the only way in.
--
-- First, staff. The old rule needed `request_admin` in the sign-up
-- metadata — set by the staff sign-up form — AND membership of the
-- allowlist. Google sends its own metadata and carries no such flag, so
-- that rule would make every teacher a student. The allowlist was always
-- the real gate; it is now the only one, which also means it no longer
-- matters which door someone signs in at.
--
-- Second, the name. Google supplies `full_name` on some accounts and
-- `name` on others, so both are read before falling back to the part of
-- the address before the @.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_whitelisted boolean;
  display_name text;
begin
  is_whitelisted := exists (
    select 1 from public.admin_allowlist
    where lower(trim(email)) = lower(trim(new.email))
  );

  display_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'name'), ''),
    split_part(new.email, '@', 1)
  );

  insert into public.profiles (id, email, full_name, grade, uid, role, status)
  values (
    new.id,
    new.email,
    display_name,
    new.raw_user_meta_data->>'grade',
    nullif(new.raw_user_meta_data->>'uid', ''),
    case when is_whitelisted then 'admin' else 'student' end,
    'approved'
  )
  -- Signing in with Google for an address that already has an account
  -- must never wipe the grade, UID or role already recorded against it.
  on conflict (id) do nothing;

  return new;
end;
$$;

-- The domain restriction in supabase/auth-hook.sql is unchanged and still
-- does the real work. It runs Before User Created, whatever the provider,
-- so a personal Gmail cannot get an account even though Google is happy to
-- sign it in.
