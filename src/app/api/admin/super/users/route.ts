import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Admin from "@/models/Admin";
import Teacher from "@/models/Teacher";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

// This route lives under /api/admin/super, which middleware already restricts to
// super_admin. We re-check here as defense-in-depth.
const PIN_RE = /^\d{6}$/;

async function requireSuperAdmin() {
  const session = await getCurrentUser();
  if (!session || session.role !== "super_admin") return null;
  return session;
}

const countActiveSuperAdmins = () =>
  Admin.countDocuments({ role: "super_admin", status: "active" });

export async function GET() {
  try {
    if (!(await requireSuperAdmin())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await dbConnect();
    // Credentials are select:false, so they are never returned here.
    const users = await Admin.find({})
      .populate("teacherId", "firstName lastName")
      .sort({ role: 1, username: 1 });
    return NextResponse.json(users);
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Failed to load users" }, { status: 500 });
  }
}

// Create a mentor login for a registered mentor.
export async function POST(request: Request) {
  try {
    if (!(await requireSuperAdmin())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await dbConnect();
    const { teacherId, username, pin } = await request.json();

    if (!teacherId || !mongoose.Types.ObjectId.isValid(teacherId)) {
      return NextResponse.json({ error: "A valid mentor is required" }, { status: 400 });
    }
    if (!username || !username.trim()) {
      return NextResponse.json({ error: "A username is required" }, { status: 400 });
    }
    if (!PIN_RE.test(String(pin || ""))) {
      return NextResponse.json({ error: "PIN must be exactly 6 digits" }, { status: 400 });
    }

    const teacher = await Teacher.findById(teacherId).select("_id");
    if (!teacher) {
      return NextResponse.json({ error: "Mentor not found" }, { status: 404 });
    }

    try {
      const created = await Admin.create({
        username: username.trim(),
        pinHash: await hashPassword(String(pin)),
        role: "mentor",
        teacherId,
        status: "active",
      });
      const populated = await Admin.findById(created._id).populate("teacherId", "firstName lastName");
      await logActivity(
        { action: "user.create", summary: `Created a mentor login "${username.trim()}"`, targetType: "Admin", targetId: created._id },
        request
      );
      return NextResponse.json(populated, { status: 201 });
    } catch (err: any) {
      if (err.code === 11000) {
        // Either the username is taken or this mentor already has a login.
        return NextResponse.json(
          { error: "That username is taken, or this mentor already has a login." },
          { status: 409 }
        );
      }
      throw err;
    }
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Failed to create login" }, { status: 500 });
  }
}

// Reset PIN / change role / enable-disable.
export async function PATCH(request: Request) {
  try {
    const session = await requireSuperAdmin();
    if (!session) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await dbConnect();
    const { userId, action, pin, role, status } = await request.json();

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "A valid userId is required" }, { status: 400 });
    }
    const target = await Admin.findById(userId);
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Never leave the system without an active super_admin.
    const wouldRemoveLastSuper =
      target.role === "super_admin" &&
      target.status === "active" &&
      (await countActiveSuperAdmins()) <= 1;

    if (action === "resetPin") {
      if (!PIN_RE.test(String(pin || ""))) {
        return NextResponse.json({ error: "PIN must be exactly 6 digits" }, { status: 400 });
      }
      target.pinHash = await hashPassword(String(pin));
      // A password-based account resetting to a PIN becomes PIN-based.
      target.password = undefined;
      await target.save();
      await logActivity(
        { action: "user.reset_pin", summary: `Reset the PIN for "${target.username}"`, targetType: "Admin", targetId: target._id },
        request
      );
    } else if (action === "setRole") {
      if (!["super_admin", "mentor"].includes(role)) {
        return NextResponse.json({ error: "Invalid role" }, { status: 400 });
      }
      if (role === "mentor" && wouldRemoveLastSuper) {
        return NextResponse.json({ error: "You cannot demote the last super admin." }, { status: 409 });
      }
      target.role = role;
      await target.save();
      await logActivity(
        { action: "user.set_role", summary: `Set "${target.username}" role to ${role}`, targetType: "Admin", targetId: target._id },
        request
      );
    } else if (action === "setStatus") {
      if (!["active", "disabled"].includes(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      if (status === "disabled" && wouldRemoveLastSuper) {
        return NextResponse.json({ error: "You cannot disable the last super admin." }, { status: 409 });
      }
      target.status = status;
      await target.save();
      await logActivity(
        {
          action: "user.set_status",
          summary: `${status === "disabled" ? "Disabled" : "Enabled"} the login "${target.username}"`,
          targetType: "Admin",
          targetId: target._id,
        },
        request
      );
    } else {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    const populated = await Admin.findById(target._id).populate("teacherId", "firstName lastName");
    return NextResponse.json(populated);
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    if (!(await requireSuperAdmin())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "A valid userId is required" }, { status: 400 });
    }

    const target = await Admin.findById(userId);
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (
      target.role === "super_admin" &&
      target.status === "active" &&
      (await countActiveSuperAdmins()) <= 1
    ) {
      return NextResponse.json({ error: "You cannot delete the last super admin." }, { status: 409 });
    }

    await Admin.findByIdAndDelete(userId);
    await logActivity(
      { action: "user.delete", summary: `Deleted the login "${target.username}"`, targetType: "Admin", targetId: target._id },
      request
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
