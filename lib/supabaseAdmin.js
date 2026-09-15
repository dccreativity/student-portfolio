import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// The service-role client. It bypasses row-level security completely, so
// it must never be imported into anything that reaches the browser: the
// key is read from SUPABASE_SERVICE_ROLE_KEY, which has no NEXT_PUBLIC_
// prefix and so is never bundled into client code.
//
// Only app/api/admin/account/route.js uses it, and only after checking
// that the caller is the super admin.
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Add it in Vercel → Settings → " +
        "Environment Variables, then redeploy."
    );
  }

  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
