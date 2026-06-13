import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback_super_secret_key_change_me"
);

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("admin_session")?.value;

  if (request.nextUrl.pathname.startsWith("/admin")) {
    // If going to login page, allow it unless already logged in
    if (request.nextUrl.pathname === "/admin/login") {
      if (token) {
        try {
          await jwtVerify(token, JWT_SECRET);
          return NextResponse.redirect(new URL("/admin", request.url));
        } catch (error) {
          return NextResponse.next();
        }
      }
      return NextResponse.next();
    }

    // Protect all other /admin routes
    if (!token) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    try {
      await jwtVerify(token, JWT_SECRET);
      return NextResponse.next();
    } catch (error) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
