import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Admin from "@/models/Admin";
import Teacher from "@/models/Teacher";
import LoginAttempt from "@/models/LoginAttempt";
import { comparePasswords, createSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

// Two throttles: per-IP (a shared device / brute-force from one source) and
// per-account (brute-forcing one mentor's 6-digit PIN). Either being over the
// limit blocks the attempt; a success clears both.
const MAX_FAILED_ATTEMPTS = 10; // per IP
const MAX_ACCOUNT_ATTEMPTS = 8; // per username
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function getClientKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

async function isOverLimit(key: string, now: number, max: number) {
  const attempt = await LoginAttempt.findOne({ key });
  const active = attempt && attempt.expiresAt.getTime() > now;
  return !!(active && attempt.count >= max);
}

async function recordFailure(key: string, now: number) {
  const attempt = await LoginAttempt.findOne({ key });
  const active = attempt && attempt.expiresAt.getTime() > now;
  if (active) {
    await LoginAttempt.updateOne({ key }, { $inc: { count: 1 } });
  } else {
    await LoginAttempt.updateOne(
      { key },
      { $set: { count: 1, expiresAt: new Date(now + WINDOW_MS) } },
      { upsert: true }
    );
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const { username, password } = await request.json();
    const secret = password; // may be a password (super_admin) or a PIN (mentor)

    if (!username || !secret) {
      return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
    }

    const ipKey = getClientKey(request);
    const acctKey = `acct:${String(username).toLowerCase()}`;
    const now = Date.now();

    if ((await isOverLimit(ipKey, now, MAX_FAILED_ATTEMPTS)) || (await isOverLimit(acctKey, now, MAX_ACCOUNT_ATTEMPTS))) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        { status: 429 }
      );
    }

    const user = await Admin.findOne({ username }).select("+password +pinHash");
    const active = user && user.status !== "disabled";
    const hash = user?.password || user?.pinHash || null;
    const isValid = active && hash ? await comparePasswords(secret, hash) : false;

    if (!isValid || !user) {
      await recordFailure(ipKey, now);
      await recordFailure(acctKey, now);
      await logActivity(
        { action: "login.fail", summary: `Failed sign-in for "${username}"`, actor: { name: String(username) } },
        request
      );
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Success clears both counters.
    await LoginAttempt.deleteOne({ key: ipKey });
    await LoginAttempt.deleteOne({ key: acctKey });

    // Resolve a display name (a mentor's real name, from their Teacher record).
    let name = user.username;
    if (user.teacherId) {
      const teacher = await Teacher.findById(user.teacherId).select("firstName lastName");
      if (teacher) name = `${teacher.firstName} ${teacher.lastName}`.trim();
    }

    const token = await createSession({
      userId: user._id.toString(),
      username: user.username,
      role: user.role,
      teacherId: user.teacherId ? user.teacherId.toString() : null,
      name,
    });

    await logActivity(
      {
        action: "login.success",
        summary: `${name} signed in`,
        actor: { id: user._id.toString(), name, role: user.role },
      },
      request
    );

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
