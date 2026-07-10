import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

// No insecure fallback: if JWT_SECRET is missing, every token is treated as
// invalid, so all admin pages and APIs fail closed instead of becoming forgeable.
const JWT_SECRET = process.env.JWT_SECRET
  ? new TextEncoder().encode(process.env.JWT_SECRET)
  : null;

async function isValidToken(token: string | undefined) {
  if (!token) return false;
  if (!JWT_SECRET) {
    console.error("JWT_SECRET is not set — rejecting all admin sessions.");
    return false;
  }
  try {
    await jwtVerify(token, JWT_SECRET);
    return true;
  } catch (error) {
    return false;
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

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("admin_session")?.value;

  if (request.nextUrl.pathname.startsWith("/api/admin")) {
    if (await isValidToken(token)) {
      return NextResponse.next();
    }
    if (isPublicKioskRequest(request)) {
      return NextResponse.next();
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (request.nextUrl.pathname.startsWith("/admin")) {
    // If going to login page, allow it unless already logged in
    if (request.nextUrl.pathname === "/admin/login") {
      if (await isValidToken(token)) {
        return NextResponse.redirect(new URL("/admin", request.url));
      }
      return NextResponse.next();
    }

    // Protect all other /admin routes
    if (await isValidToken(token)) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
