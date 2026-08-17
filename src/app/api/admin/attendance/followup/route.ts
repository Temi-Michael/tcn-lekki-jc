import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Child from "@/models/Child";
import { logActivity } from "@/lib/activity";

// Marks an absent child as contacted (or undoes it). "contact" stamps now;
// the reports endpoint then hides the child until they miss another Sunday.
export async function POST(request: Request) {
  try {
    await dbConnect();
    const { childId, action } = await request.json();

    if (!childId || !mongoose.Types.ObjectId.isValid(childId) || !["contact", "undo"].includes(action)) {
      return NextResponse.json(
        { error: "A valid childId and action ('contact' or 'undo') are required" },
        { status: 400 }
      );
    }

    const update =
      action === "contact"
        ? { $set: { lastContactedAt: new Date() } }
        : { $unset: { lastContactedAt: 1 } };

    const child = await Child.findByIdAndUpdate(childId, update, { new: true }).select(
      "lastContactedAt firstName lastName"
    );

    if (!child) {
      return NextResponse.json({ error: "Child not found" }, { status: 404 });
    }

    await logActivity(
      {
        action: "child.followup",
        summary:
          action === "contact"
            ? `Marked ${child.firstName} ${child.lastName} as contacted`
            : `Reopened follow-up for ${child.firstName} ${child.lastName}`,
        targetType: "Child",
        targetId: child._id,
      },
      request
    );

    return NextResponse.json({ success: true, lastContactedAt: child.lastContactedAt || null });
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Failed to update follow-up status" }, { status: 500 });
  }
}
