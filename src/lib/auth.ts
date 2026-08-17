import { jwtVerify, SignJWT } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

if (!process.env.JWT_SECRET) {
  // Fail closed: a missing secret must never silently fall back to a
  // publicly known string, or every admin session becomes forgeable.
  throw new Error("JWT_SECRET environment variable is not set. Set it before starting the app.");
}
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export type SessionUser = {
  userId: string;
  username: string;
  role: "super_admin" | "mentor";
  teacherId?: string | null;
  name?: string;
};

// bcrypt hash/compare — used for both admin passwords and mentor PINs.
export async function hashPassword(password: string) {
  return await bcrypt.hash(password, 10);
}

export async function comparePasswords(password: string, hash: string) {
  return await bcrypt.compare(password, hash);
}

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({
    userId: user.userId,
    username: user.username,
    role: user.role,
    teacherId: user.teacherId ?? null,
    name: user.name ?? user.username,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);

  return token;
}

export async function verifySession(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch (error) {
    return null;
  }
}

// Reads and verifies the current admin_session cookie in a route handler /
// server component. Returns the session payload, or null when not signed in.
export async function getCurrentUser() {
  const token = (await cookies()).get("admin_session")?.value;
  if (!token) return null;
  return (await verifySession(token)) as (SessionUser & { iat: number; exp: number }) | null;
}
