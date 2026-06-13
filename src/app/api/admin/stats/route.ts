import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Form from "@/models/Form";
import Submission from "@/models/Submission";

export async function GET() {
  try {
    await dbConnect();
    
    const totalEvents = await Form.countDocuments();
    const activeEvents = await Form.countDocuments({ status: "active" });
    const totalSubmissions = await Submission.countDocuments({ status: "approved" });
    const pendingReviews = await Submission.countDocuments({ status: "needs_review" });

    return NextResponse.json({
      totalEvents,
      activeEvents,
      totalSubmissions,
      pendingReviews
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
