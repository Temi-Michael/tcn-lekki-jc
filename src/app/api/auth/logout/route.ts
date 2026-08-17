import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (user) {
    await logActivity({ action: "logout", summary: `${user.name || user.username} signed out` }, request);
  }
  const response = NextResponse.json({ success: true });
  response.cookies.delete("admin_session");
  return response;
}
