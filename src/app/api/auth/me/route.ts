import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

// Returns the current session identity so the client can render role-aware UI
// (e.g. show the Access tab only to a super_admin). Not under /api/admin, so it
// verifies the cookie itself.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    username: user.username,
    role: user.role,
    name: user.name || user.username,
    teacherId: user.teacherId || null,
  });
}
