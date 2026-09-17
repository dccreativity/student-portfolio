-- Removing a student's account outright.
--
-- Different from erasing a portfolio: that keeps the account and leaves
-- the student with blank sections, this takes the account away entirely
-- so the name disappears from the lists.
--
-- Everything about a student hangs off auth.users by a foreign key that
-- cascades -- their profile, every saved section, every media row -- so
-- deleting that one row takes the rest with it. Uploaded files are the
-- exception: storage keeps no such link, so the site deletes those first
-- and only then calls this.
--
-- auth.users is owned by Supabase's own auth role and is not reachable
-- from the API, so the deletion has to happen inside a function that runs
-- as its owner. That makes the checks below the only thing standing
-- between a signed-in account and every other account, so they are strict:
--
--   * only the super admin may call it at all;
--   * only rows whose profile says role = 'student' are deleted, so no
--     admin, and no super admin, can be removed this way;
--   * the caller cannot pass their own id, which would lock the school
--     out of its own super admin account.
--
-- An ordinary admin calling this by hand gets an error, not a silent no-op,
-- because unlike a refused DELETE there is nothing on screen to show them
-- that nothing happened.

create or replace function public.remove_students(targets uuid[])
returns integer
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  removed integer;
begin
  if not public.is_super_admin() then
    raise exception 'Only the super admin can remove a student profile.'
      using errcode = '42501';
  end if;

  if targets is null or array_length(targets, 1) is null then
    return 0;
  end if;

  if auth.uid() = any (targets) then
    raise exception 'You cannot remove your own account.'
      using errcode = '42501';
  end if;

  delete from auth.users u
  where u.id = any (targets)
    and exists (
      select 1
      from public.profiles p
      where p.id = u.id
        and p.role = 'student'
    );

  get diagnostics removed = row_count;
  return removed;
end;
$$;

-- Reachable only by someone signed in, and even then the body decides.
revoke all on function public.remove_students(uuid[]) from public;
revoke all on function public.remove_students(uuid[]) from anon;
grant execute on function public.remove_students(uuid[]) to authenticated;
