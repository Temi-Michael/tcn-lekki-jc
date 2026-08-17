import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Admin from "@/models/Admin";
import { getCurrentUser, comparePasswords, hashPassword } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

const PIN_RE = /^\d{6}$/;

// Lets a signed-in mentor change their own 6-digit PIN.
export async function POST(request: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { currentPin, newPin } = await request.json();
    if (!PIN_RE.test(String(newPin || ""))) {
      return NextResponse.json({ error: "New PIN must be exactly 6 digits" }, { status: 400 });
    }

    await dbConnect();
    const user = await Admin.findById(session.userId).select("+pinHash");
    if (!user || !user.pinHash) {
      return NextResponse.json({ error: "This account does not use a PIN" }, { status: 400 });
    }

    const ok = await comparePasswords(String(currentPin || ""), user.pinHash);
    if (!ok) {
      return NextResponse.json({ error: "Your current PIN is incorrect" }, { status: 401 });
    }

    user.pinHash = await hashPassword(String(newPin));
    await user.save();
    await logActivity({ action: "pin.change", summary: `${session.name || session.username} changed their own PIN` }, request);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Failed to change PIN" }, { status: 500 });
  }
}
