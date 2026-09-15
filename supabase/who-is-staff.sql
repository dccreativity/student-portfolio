-- =========================================================
-- WHO CAN LOG IN AS STAFF, AND WHY NOT
--
-- Paste into Supabase → SQL Editor → Run. Changes nothing.
-- Shows every account that is staff, is trying to be, or is on the
-- staff list — and says exactly what is blocking each one.
-- =========================================================

select
  coalesce(p.email, a.email)                       as "Email",
  coalesce(p.role, '(no account yet)')             as "Role",
  coalesce(p.status, '-')                          as "Status",
  case when a.email is null then 'no' else 'yes' end as "On staff list",
  case
    when p.id is null
      then 'Not signed up yet — they become staff automatically when they '
           || 'create an account at /admin/signup with this exact address.'
    when p.role = 'admin' and p.status = 'approved'
      then 'OK — can log in at /admin/login right now.'
    when p.role = 'admin' and a.email is null
      then 'BLOCKED: status is "' || p.status || '" and this address is NOT on '
           || 'the staff list. Add it in add-staff.sql STEP 2 and run that file.'
    when p.role = 'admin'
      then 'BLOCKED: status is "' || p.status || '". Run add-staff.sql — '
           || 'STEP 3 sets it to approved.'
    when a.email is not null
      then 'On the staff list but the account is still a student. '
           || 'Run add-staff.sql — STEP 3 promotes it.'
    else 'Ordinary student account.'
  end                                              as "What is happening"
from public.profiles p
full outer join public.admin_allowlist a
  on a.email = lower(p.email)
where p.role = 'admin'
   or p.status is distinct from 'approved'
   or a.email is not null
order by 1;
