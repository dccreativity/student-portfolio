import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";
import { ALLOWED_EMAIL_DOMAIN, isAllowedSchoolEmail, isStaffRole } from "@/lib/constants";

// Where Google sends people back to.
//
// Google returns a one-time code; this exchanges it for a session and then
// decides where the person belongs. Staff go to the staff dashboard and
// students to their own, whichever door they happened to start from — the
// allowlist decides that, not the button they pressed.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fail(origin, reason) {
  return NextResponse.redirect(`${origin}/login?authError=${encodeURIComponent(reason)}`);
}

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);

  // Google reports a refusal — a cancelled consent screen, most often — in
  // the query string rather than by failing the request.
  const denied = searchParams.get("error_description") || searchParams.get("error");
  if (denied) return fail(origin, denied);

  const code = searchParams.get("code");
  if (!code) return fail(origin, "Google didn't send anything back. Please try again.");

  const rawNext = searchParams.get("next") || "/dashboard";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";

  const supabase = createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data?.user) {
    // The hook in supabase/auth-hook.sql refuses to create an account for
    // an address outside the school domain, and that refusal surfaces here.
    const message = error?.message || "";
    return fail(
      origin,
      /domain|restricted/i.test(message)
        ? `That Google account isn't a school account. Please sign in with your @${ALLOWED_EMAIL_DOMAIN} address.`
        : message || "Google sign-in didn't complete. Please try again."
    );
  }

  // Belt and braces. The hook above is the gate that cannot be bypassed;
  // this catches an account that predates the hook being switched on.
  if (!isAllowedSchoolEmail(data.user.email)) {
    await supabase.auth.signOut();
    return fail(
      origin,
      `Only @${ALLOWED_EMAIL_DOMAIN} accounts can use this site. You signed in as ${data.user.email}.`
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", data.user.id)
    .single();

  const staff = isStaffRole(profile?.role) && profile?.status === "approved";

  // A staff account has no portfolio of its own, so sending them to a
  // student page only for the middleware to bounce them is pointless.
  return NextResponse.redirect(`${origin}${staff ? "/admin/dashboard" : next}`);
}
