import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

// No insecure fallback: if JWT_SECRET is missing, every token is treated as
// invalid, so all admin pages and APIs fail closed instead of becoming forgeable.
const JWT_SECRET = process.env.JWT_SECRET
  ? new TextEncoder().encode(process.env.JWT_SECRET)
  : null;

// Returns the verified JWT payload, or null when missing/invalid.
async function getPayload(token: string | undefined) {
  if (!token) return null;
  if (!JWT_SECRET) {
    console.error("JWT_SECRET is not set — rejecting all admin sessions.");
    return null;
  }
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as { role?: string; username?: string };
  } catch (error) {
    return null;
  }
}

// The public check-in kiosks (/attendance/child/*, /attendance/teacher/*) run on
// devices without an admin session and depend on exactly these three calls.
// Everything else under /api/admin requires a valid session.
function isPublicKioskRequest(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  if (request.method === "POST" && pathname === "/api/admin/attendance/checkin") {
    return true;
  }
  if (
    request.method === "GET" &&
    (pathname === "/api/admin/attendance/roster" || pathname === "/api/admin/attendance/sessions") &&
    searchParams.has("sessionId")
  ) {
    return true;
  }
  return false;
}

// Pages only a super_admin may open.
const SUPER_ADMIN_PAGES = ["/admin/access", "/admin/activity"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("admin_session")?.value;
  const payload = await getPayload(token);
  const isAuthed = !!payload;
  const isSuperAdmin = payload?.role === "super_admin";

  if (pathname.startsWith("/api/admin")) {
    if (isAuthed) {
      // Escalated endpoints require super_admin (defense-in-depth is also in the
      // route handlers).
      if (pathname.startsWith("/api/admin/super") && !isSuperAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.next();
    }
    if (isPublicKioskRequest(request)) {
      return NextResponse.next();
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (pathname.startsWith("/admin")) {
    // If going to login page, allow it unless already logged in
    if (pathname === "/admin/login") {
      if (isAuthed) {
        return NextResponse.redirect(new URL("/admin", request.url));
      }
      return NextResponse.next();
    }

    if (!isAuthed) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    // Super-admin-only pages: a signed-in mentor is sent back to the dashboard.
    if (SUPER_ADMIN_PAGES.some((p) => pathname === p || pathname.startsWith(p + "/")) && !isSuperAdmin) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
