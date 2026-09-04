-- =========================================================
-- SERVER-SIDE EMAIL DOMAIN RESTRICTION
-- This is the layer that actually can't be bypassed (the client-side
-- check in lib/constants.js is just a nicer error message).
--
-- After running this file, go to:
--   Supabase Dashboard > Authentication > Hooks (Auth Hooks)
--   > "Before User Created" > choose this Postgres function:
--   public.restrict_signup_domain
-- =========================================================

create or replace function public.restrict_signup_domain(event jsonb)
returns jsonb
language plpgsql
as $$
declare
  user_email text;
  allowed_domain text := '@adaniinternational.edu.in';
begin
  user_email := lower(event->'user'->>'email');

  if user_email is null or right(user_email, length(allowed_domain)) <> allowed_domain then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'http_code', 400,
        'message', 'Sign-ups are restricted to @adaniinternational.edu.in email addresses.'
      )
    );
  end if;

  return jsonb_build_object();
end;
$$;

-- Only Supabase Auth itself may call this hook.
revoke execute on function public.restrict_signup_domain from public, anon, authenticated;
grant execute on function public.restrict_signup_domain to supabase_auth_admin;
