import { jwtVerify, SignJWT } from "jose";
import bcrypt from "bcryptjs";

if (!process.env.JWT_SECRET) {
  // Fail closed: a missing secret must never silently fall back to a
  // publicly known string, or every admin session becomes forgeable.
  throw new Error("JWT_SECRET environment variable is not set. Set it before starting the app.");
}
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export async function hashPassword(password: string) {
  return await bcrypt.hash(password, 10);
}

export async function comparePasswords(password: string, hash: string) {
  return await bcrypt.compare(password, hash);
}

export async function createSession(adminId: string, username: string) {
  const token = await new SignJWT({ adminId, username })
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
