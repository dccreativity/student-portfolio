-- =========================================================
-- WHAT IS ACTUALLY APPLIED TO THIS PROJECT?
--
-- Paste this whole file into Supabase → SQL Editor → Run. It changes
-- nothing. Every row comes back either OK or NEEDS ACTION, and the
-- action column tells you which file to run.
-- =========================================================

with checks as (

  select 1 as ord,
         'Student grade field' as item,
         exists (
           select 1 from information_schema.columns
           where table_schema = 'public' and table_name = 'profiles' and column_name = 'grade'
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
           where table_schema = 'public' and table_name = 'portfolio_media'
             and column_name = 'storage_path'
         ),
         'Run supabase/migration-readonly-admin.sql'

  union all
  -- Admins must appear in SELECT policies only. Any INSERT/UPDATE/DELETE
  -- policy still mentioning is_admin() means staff can still write.
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
         'File bucket is private',
         coalesce((select not public from storage.buckets where id = 'portfolio-media'), false),
         'Run supabase/migration-private-files.sql (or media.sql if the bucket is missing entirely)'

  union all
  select 6,
         'File reads limited to owner or staff',
         exists (
           select 1 from pg_policies
           where schemaname = 'storage' and tablename = 'objects'
             and policyname = 'media_read_own_or_admin'
         )
         and not exists (
           select 1 from pg_policies
           where schemaname = 'storage' and tablename = 'objects'
             and policyname = 'media_read_all'
         ),
         'Run supabase/migration-private-files.sql'

  union all
  select 7,
         'Old gallery files have a storage path',
         not exists (
           select 1 from public.portfolio_media
           where storage_path is null
             and file_url like '%/storage/v1/object/public/portfolio-media/%'
         ),
         'Run supabase/migration-private-files.sql (it backfills these)'

  union all
  select 8,
         'At least one staff email is allowlisted',
         coalesce((select count(*) > 0 from public.admin_allowlist), false),
         'Insert your staff emails — see the bottom of migration-admin-allowlist.sql'
)

select ord as "#",
       item as "Check",
       case when ok then 'OK' else 'NEEDS ACTION' end as "Status",
       case when ok then '' else fix end as "What to do"
from checks
order by ord;
