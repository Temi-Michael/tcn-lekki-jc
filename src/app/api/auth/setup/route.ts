import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Admin from "@/models/Admin";
import { hashPassword } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    await dbConnect();

    // Allow up to 2 admins so that if one forgets a password, the other can be created, 
    // or an admin can be manually deleted from the DB to re-enable setup.
    const adminCount = await Admin.countDocuments();
    if (adminCount >= 2) {
      return NextResponse.json({ error: "Maximum number of admins (2) reached. Delete an admin from the database to create a new one." }, { status: 403 });
    }

    const { username, password } = await request.json();

    if (!username || !password || password.length < 6) {
      return NextResponse.json({ error: "Invalid username or password too short" }, { status: 400 });
    }

    const hashedPassword = await hashPassword(password);

    const admin = await Admin.create({
      username,
      password: hashedPassword,
    });

    return NextResponse.json({ success: true, message: "Admin created successfully. Please login." });
  } catch (error) {
    console.error("Setup Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
