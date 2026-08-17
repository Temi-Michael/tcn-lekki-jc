import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Submission from "@/models/Submission";
import { logActivity } from "@/lib/activity";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ subId: string }> }
) {
  try {
    await dbConnect();
    const { subId } = await params;
    const { status } = await request.json();

    const sub = await Submission.findByIdAndUpdate(subId, { status }, { new: true });
    await logActivity(
      {
        action: "submission.moderate",
        summary: `Set submission ${sub ? `for ${sub.firstName} ${sub.lastName}` : ""} to ${status}`.trim(),
        targetType: "Submission",
        targetId: subId,
      },
      request
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update submission" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ subId: string }> }
) {
  try {
    await dbConnect();
    const { subId } = await params;
    const sub = await Submission.findByIdAndDelete(subId);
    await logActivity(
      {
        action: "submission.delete",
        summary: `Deleted a submission${sub ? ` for ${sub.firstName} ${sub.lastName}` : ""}`,
        targetType: "Submission",
        targetId: subId,
      },
      request
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete submission" }, { status: 500 });
  }
}
