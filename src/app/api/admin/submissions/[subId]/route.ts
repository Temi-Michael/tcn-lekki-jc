import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Submission from "@/models/Submission";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ subId: string }> }
) {
  try {
    await dbConnect();
    const { subId } = await params;
    const { status } = await request.json();
    
    await Submission.findByIdAndUpdate(subId, { status });
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
    await Submission.findByIdAndDelete(subId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete submission" }, { status: 500 });
  }
}
