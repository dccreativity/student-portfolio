import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

// Pages under /admin that must stay reachable while logged out, otherwise
// staff can never create an account in the first place.
const PUBLIC_ADMIN_PATHS = ["/admin/login", "/admin/signup"];

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
  const isPublicAdminPath = PUBLIC_ADMIN_PATHS.some(
    (p) => path === p || path.startsWith(`${p}/`)
  );
  const isDashboard = path.startsWith("/dashboard");
  const isAdmin = path.startsWith("/admin") && !isPublicAdminPath;

  if ((isDashboard || isAdmin) && !user) {
    const redirectUrl = isAdmin ? "/admin/login" : "/login";
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  }

  // One profile lookup serves both guards below.
  let profile = null;
  if ((isAdmin || isDashboard) && user) {
    const { data } = await supabase
      .from("profiles")
      .select("role, status")
      .eq("id", user.id)
      .single();
    profile = data;
  }

  if (isAdmin && user) {
    if (!profile || profile.role !== "admin" || profile.status !== "approved") {
      return NextResponse.redirect(new URL("/admin/login?denied=1", request.url));
    }
  }

  // A student who somehow reaches the admin area is bounced out above.
  // The reverse guard: a staff account has no portfolio of its own to
  // edit, so send it to the admin dashboard instead of an empty one.
  if (isDashboard && profile?.role === "admin" && profile?.status === "approved") {
    return NextResponse.redirect(new URL("/admin/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
