import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import Admin from "@/models/Admin";
import { hashPassword, verifySession } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    // Only super_admins count toward the bootstrap gate/cap — mentor logins are
    // provisioned separately from the Access tab and are unlimited.
    const adminCount = await Admin.countDocuments({ role: "super_admin" });

    // Bootstrap: the very first admin can be created without a session.
    // Once any admin exists, only a logged-in admin may create another.
    if (adminCount > 0) {
      const token = request.cookies.get("admin_session")?.value;
      const session = token ? await verifySession(token) : null;
      if (!session) {
        return NextResponse.json(
          { error: "Unauthorized", code: "AUTH_REQUIRED" },
          { status: 401 }
        );
      }
    }

    // Cap of 2 admins. Details stay in the server logs; the response says
    // nothing about how the cap works or how to re-enable setup.
    if (adminCount >= 2) {
      console.warn("Setup attempt rejected: admin cap (2) already reached.");
      return NextResponse.json(
        { error: "Setup is not available", code: "SETUP_CLOSED" },
        { status: 403 }
      );
    }

    const { username, password } = await request.json();

    if (!username || !password || password.length < 6) {
      return NextResponse.json({ error: "Invalid username or password too short" }, { status: 400 });
    }

    const hashedPassword = await hashPassword(password);

    const admin = await Admin.create({
      username,
      password: hashedPassword,
      role: "super_admin",
      status: "active",
    });

    await logActivity(
      {
        action: "admin.setup",
        summary: `Created super admin account "${username}"`,
        actor: { id: admin._id.toString(), name: username, role: "super_admin" },
        targetType: "Admin",
        targetId: admin._id,
      },
      request
    );

    return NextResponse.json({ success: true, message: "Admin created successfully. Please login." });
  } catch (error) {
    console.error("Setup Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
