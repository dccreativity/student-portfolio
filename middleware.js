import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

// Deny by default: every route needs a session except the handful below,
// which are the only pages someone must be able to reach in order to get
// an account in the first place. Anything new added to the app is
// therefore private unless it is deliberately listed here.
const PUBLIC_PATHS = new Set([
  "/", // landing page — carries both login doors
  "/choose", // student vs staff chooser
  "/login",
  "/signup",
  "/verify",
  "/forgot-password",
  "/admin/login",
  "/admin/signup",
]);

// Staff pages that must stay reachable while logged out.
const PUBLIC_ADMIN_PATHS = ["/admin/login", "/admin/signup"];

function isPublic(path) {
  if (PUBLIC_PATHS.has(path)) return true;
  // Tolerate a trailing slash without opening up anything deeper.
  if (path.endsWith("/") && PUBLIC_PATHS.has(path.slice(0, -1))) return true;
  return false;
}

export async function middleware(request) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value;
        },
        set(name, value, options) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name, options) {
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const publicPath = isPublic(path);
  const adminArea =
    path.startsWith("/admin") && !PUBLIC_ADMIN_PATHS.some((p) => path === p);

  // Not signed in and asking for anything private: send them to the right
  // front door and remember where they were headed.
  if (!user && !publicPath) {
    const target = new URL(adminArea ? "/admin/login" : "/login", request.url);
    if (!adminArea) target.searchParams.set("next", path);
    return NextResponse.redirect(target);
  }

  if (!user) return response;

  // One profile lookup serves both guards below.
  let profile = null;
  if (adminArea || path.startsWith("/dashboard")) {
    const { data } = await supabase
      .from("profiles")
      .select("role, status")
      .eq("id", user.id)
      .single();
    profile = data;
  }

  // Students can never reach the staff side, whatever URL they type.
  if (adminArea && (!profile || profile.role !== "admin" || profile.status !== "approved")) {
    return NextResponse.redirect(new URL("/admin/login?denied=1", request.url));
  }

  // A staff account has no portfolio of its own to edit.
  if (
    path.startsWith("/dashboard") &&
    profile?.role === "admin" &&
    profile?.status === "approved"
  ) {
    return NextResponse.redirect(new URL("/admin/dashboard", request.url));
  }

  return response;
}

export const config = {
  // Everything except Next's own build output, the favicon and the logo
  // files in /public (logo.png, logo-color.png, logo-white.png). Those
  // carry no student data, and excluding them keeps the auth check off
  // every image request.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|logo|robots.txt|sitemap.xml).*)",
  ],
};
