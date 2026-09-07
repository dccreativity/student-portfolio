-- =========================================================
-- WHAT IS ACTUALLY APPLIED TO THIS PROJECT?
--
-- Paste this whole file into Supabase → SQL Editor → Run. It changes
-- nothing. Every row comes back either OK or NEEDS ACTION, and the last
-- column names the file to run for anything missing.
--
-- Note for anyone editing this file: every check must read only the
-- system catalogues (information_schema, pg_policies, storage.buckets,
-- to_regclass). Postgres resolves column references when it parses a
-- statement, not when it runs it — so naming a column that does not
-- exist yet fails the whole query instead of reporting that column as
-- missing, which is exactly what this file is for.
-- =========================================================

with checks as (

  select 1 as ord,
         'Student grade field' as item,
         exists (
           select 1 from information_schema.columns
           where table_schema = 'public'
             and table_name = 'profiles'
             and column_name = 'grade'
         ) as ok,
         'Run supabase/migration-grade.sql' as fix

  union all
  select 2,
         'Staff allowlist table',
         to_regclass('public.admin_allowlist') is not null,
         'Run supabase/migration-admin-allowlist.sql'

  union all
  select 3,
         'Gallery storage_path column',
         exists (
           select 1 from information_schema.columns
           where table_schema = 'public'
             and table_name = 'portfolio_media'
             and column_name = 'storage_path'
         ),
         'Run supabase/migration-readonly-admin.sql'

  union all
  -- Admins should appear in SELECT policies only. Any INSERT / UPDATE /
  -- DELETE policy still mentioning is_admin() means staff can still write
  -- to student data.
  select 4,
         'Admins are read-only on student data',
         not exists (
           select 1 from pg_policies
           where schemaname = 'public'
             and tablename in ('portfolio_data', 'portfolio_media', 'profiles')
             and cmd <> 'SELECT'
             and coalesce(qual, '') || coalesce(with_check, '') like '%is_admin%'
         ),
         'Run supabase/migration-readonly-admin.sql'

  union all
  select 5,
         'File bucket exists',
         exists (select 1 from storage.buckets where id = 'portfolio-media'),
         'Run supabase/media.sql'

  union all
  select 6,
         'File bucket is private',
         coalesce(
           (select not public from storage.buckets where id = 'portfolio-media'),
           false
         ),
         'Run supabase/migration-private-files.sql'

  union all
  select 7,
         'File reads limited to owner or staff',
         exists (
           select 1 from pg_policies
           where schemaname = 'storage'
             and tablename = 'objects'
             and policyname = 'media_read_own_or_admin'
         )
         and not exists (
           select 1 from pg_policies
           where schemaname = 'storage'
             and tablename = 'objects'
             and policyname = 'media_read_all'
         ),
         'Run supabase/migration-private-files.sql'

  union all
  select 8,
         'Sign-ups restricted to the school domain',
         to_regprocedure('public.restrict_signup_domain(jsonb)') is not null,
         'Run supabase/auth-hook.sql, then enable it under Authentication → Hooks'
)

select ord                                            as "#",
       item                                           as "Check",
       case when ok then 'OK' else 'NEEDS ACTION' end as "Status",
       case when ok then '' else fix end              as "What to do"
from checks
order by ord;

-- ---------------------------------------------------------
-- Once check 2 says OK, this shows which staff emails can reach the
-- admin dashboard. Run it on its own (select the lines and hit Run):
--
--   select email from public.admin_allowlist order by email;
--
-- It is kept out of the checklist above on purpose: naming that table
-- directly would break the whole query on a project where it does not
-- exist yet.
-- ---------------------------------------------------------
