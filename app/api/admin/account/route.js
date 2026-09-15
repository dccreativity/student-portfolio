import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";
import { createAdminClient } from "@/lib/supabaseAdmin";

// Account repairs only the super admin may perform, done in the app
// rather than through email.
//
// The school's mail server has been refusing to send, which leaves a
// forgotten password unrecoverable and an unconfirmed account unable to
// log in at all. Neither of those should depend on email working, so this
// route lets the super admin set a password or confirm an address
// directly.
//
// It runs on the server with the service-role key, which ignores
// row-level security, so the first thing it does is establish who is
// asking. A student or an ordinary admin calling it gets 403.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIN_PASSWORD_LENGTH = 8;

async function requireSuperAdmin() {
  const supabase = createClient();

  // getUser() verifies the token with the auth server; getSession() would
  // trust whatever happens to be in the cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { denied: NextResponse.json({ error: "Not signed in." }, { status: 401 }) };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "superadmin") {
    return {
      denied: NextResponse.json(
        { error: "Only the super admin can do this." },
        { status: 403 }
      ),
    };
  }

  return { user };
}

// Whether this account can actually log in. `profiles` cannot answer that
// — confirmation lives in auth.users, which no browser client may read —
// so the panel asks here instead of guessing.
export async function GET(request) {
  const { denied } = await requireSuperAdmin();
  if (denied) return denied;

  const userId = new URL(request.url).searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "No account was named." }, { status: 400 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }

  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({
    confirmed: Boolean(data.user?.email_confirmed_at),
    hasLoggedIn: Boolean(data.user?.last_sign_in_at),
  });
}

export async function POST(request) {
  const { denied } = await requireSuperAdmin();
  if (denied) return denied;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const { action, userId, password } = body || {};
  if (!userId) {
    return NextResponse.json({ error: "No account was named." }, { status: 400 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (err) {
    // A missing key is a deployment problem, and saying so plainly beats a
    // generic 500 that looks like the feature itself is broken.
    return NextResponse.json({ error: err.message }, { status: 500 });
  }

  if (action === "set_password") {
    if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `The password must be at least ${MIN_PASSWORD_LENGTH} characters.` },
        { status: 400 }
      );
    }

    // Confirming the address at the same time matters: an account that
    // never confirmed cannot log in however good its password is.
    const { error } = await admin.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({
      ok: true,
      message: "Password set. They can log in with it now.",
    });
  }

  if (action === "confirm_email") {
    const { error } = await admin.auth.admin.updateUserById(userId, {
      email_confirm: true,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true, message: "Email address confirmed." });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
