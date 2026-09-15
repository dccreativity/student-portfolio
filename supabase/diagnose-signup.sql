-- =========================================================
-- WHY DIDN'T THIS EMAIL REGISTER?
--
-- Put the address in the line marked below, then run the whole file.
-- It changes nothing, and reports every stage of sign-up separately so
-- you can see exactly which one failed.
-- =========================================================

with target as (
  select lower(trim(

    'someone@adaniinternational.edu.in'   -- <<< PUT THE EMAIL HERE

  )) as email
),
usr as (
  select u.* from auth.users u, target t where lower(trim(u.email)) = t.email
),
prof as (
  select p.* from public.profiles p, target t where lower(trim(p.email)) = t.email
),
allow as (
  select a.* from public.admin_allowlist a, target t where lower(trim(a.email)) = t.email
),
checks as (
  select 1 as ord,
         'Address ends with the school domain' as item,
         (select email like '%@adaniinternational.edu.in' from target) as ok,
         'Sign-ups from any other domain are rejected by the auth hook.' as note

  union all
  select 2,
         'On the staff allowlist',
         exists (select 1 from allow),
         'Not on the list -> the account is created as an ordinary student. '
         || 'Add it in add-staff.sql STEP 2 and run that file.'

  union all
  select 3,
         'Account exists in Supabase Auth',
         exists (select 1 from usr),
         'No account was ever created. The sign-up itself failed — most often '
         || 'because the confirmation email could not be sent (see the note below).'

  union all
  select 4,
         'Email verified with the OTP code',
         coalesce((select email_confirmed_at is not null from usr), false),
         'The account exists but the code was never entered. Unverified accounts '
         || 'cannot log in. Ask them to sign up again and enter the emailed code.'

  union all
  select 5,
         'Profile row created',
         exists (select 1 from prof),
         'The auth account exists but no profile was created — unexpected; tell Claude.'

  union all
  select 6,
         'Profile is an approved admin',
         coalesce((select role = 'admin' and status = 'approved' from prof), false),
         'Run add-staff.sql with this address: it promotes an account that already exists.'
)
select ord as "#",
       item as "Check",
       case when ok then 'OK' else 'NO' end as "Result",
       case when ok then '' else note end as "What it means"
from checks
order by ord;

-- ---------------------------------------------------------
-- If check 3 says NO, the usual cause is Supabase's own email limit
-- rather than anything in this app. The built-in mail service allows
-- only a couple of messages per hour, shared across the whole project,
-- so the second or third sign-up you test in a session simply cannot
-- send its code and the sign-up fails.
--
-- Confirm it under Authentication -> Logs, or Project Settings -> Logs
-- -> Auth: a rate-limited attempt is recorded there. Either wait an
-- hour, or connect your school's own SMTP under
-- Project Settings -> Authentication -> SMTP Settings, which removes the
-- limit and is what you want before students start signing up anyway.
-- ---------------------------------------------------------
