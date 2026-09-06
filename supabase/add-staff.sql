-- =========================================================
-- APPOINT SCHOOL STAFF
--
-- This is the one file you edit and re-run whenever staff change.
-- Put your staff email addresses in STEP 2, then run the whole file.
-- Everything else happens on its own. Safe to run as many times as you
-- like.
-- =========================================================


-- ---------------------------------------------------------
-- STEP 1 — repair the role guard (automatic, leave as-is)
--
-- An earlier version of this guard reverted every role change, including
-- ones made here in the SQL Editor: the UPDATE reported success and then
-- silently did nothing. This replaces it with a guard that blocks the
-- app's own roles (so no student can ever promote themselves) while
-- letting you appoint staff from here.
-- ---------------------------------------------------------
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
set search_path = public
as $$
begin
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


-- ---------------------------------------------------------
-- STEP 2 — YOUR STAFF EMAILS  ← the only part you edit
--
-- One line per person, comma-separated, semicolon after the last one.
-- Use their exact school address. Addresses are lower-cased for you.
-- ---------------------------------------------------------
insert into public.admin_allowlist (email)
select lower(trim(e))
from unnest(array[

  'you@adaniinternational.edu.in',
  'counselor@adaniinternational.edu.in'

]) as e
on conflict (email) do nothing;


-- ---------------------------------------------------------
-- STEP 3 — apply it (automatic, leave as-is)
--
-- Anyone on the list who has NOT signed up yet becomes an admin
-- automatically when they create their account at /admin/signup.
--
-- Anyone on the list who ALREADY has an account is promoted here: the
-- rule that reads the allowlist only runs at sign-up, so an existing
-- account would otherwise stay a student for ever.
-- ---------------------------------------------------------
update public.profiles p
   set role = 'admin', status = 'approved'
  from public.admin_allowlist a
 where lower(p.email) = a.email
   and (p.role is distinct from 'admin' or p.status is distinct from 'approved');


-- ---------------------------------------------------------
-- STEP 4 — what you should see
--
-- "Signed up - can log in now"     they can use /admin/login today
-- "Not signed up yet"              they become an admin the moment they
--                                  create their account at /admin/signup
-- ---------------------------------------------------------
select a.email                                as "Staff email",
       case
         when p.id is null then 'Not signed up yet'
         when p.role = 'admin' and p.status = 'approved'
           then 'Signed up - can log in now'
         else 'Signed up but NOT an admin - tell Claude'
       end                                    as "Status"
from public.admin_allowlist a
left join public.profiles p on lower(p.email) = a.email
order by a.email;


-- ---------------------------------------------------------
-- To remove someone's staff access later, run these two lines with
-- their address:
--
--   delete from public.admin_allowlist where email = 'them@adaniinternational.edu.in';
--   update public.profiles set role = 'student'
--    where lower(email) = 'them@adaniinternational.edu.in';
--
-- Their portfolio data, if any, is untouched.
-- ---------------------------------------------------------
