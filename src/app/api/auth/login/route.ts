import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Admin from "@/models/Admin";
import LoginAttempt from "@/models/LoginAttempt";
import { comparePasswords, createSession } from "@/lib/auth";

// Rate limiting is keyed by IP (not username) because mentors share one login,
// so an account-based lockout would let one fumbling mentor lock out everyone.
// A successful login clears the counter, so normal shared use keeps it near zero.
const MAX_FAILED_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function getClientKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
    }

    const key = getClientKey(request);
    const now = Date.now();

    // Block before checking the password if this client is over the limit within
    // an active window. This is what actually stops brute-forcing.
    const attempt = await LoginAttempt.findOne({ key });
    const windowActive = attempt && attempt.expiresAt.getTime() > now;
    if (windowActive && attempt.count >= MAX_FAILED_ATTEMPTS) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        { status: 429 }
      );
    }

    const admin = await Admin.findOne({ username });
    const isValid = admin ? await comparePasswords(password, admin.password) : false;

    if (!admin || !isValid) {
      // Count the failure: start a fresh window, or increment the active one.
      if (windowActive) {
        await LoginAttempt.updateOne({ key }, { $inc: { count: 1 } });
      } else {
        await LoginAttempt.updateOne(
          { key },
          { $set: { count: 1, expiresAt: new Date(now + WINDOW_MS) } },
          { upsert: true }
        );
      }
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Success clears the counter for this client.
    await LoginAttempt.deleteOne({ key });

    const token = await createSession(admin._id.toString(), admin.username);

    const response = NextResponse.json({ success: true });
    response.cookies.set({
      name: "admin_session",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
