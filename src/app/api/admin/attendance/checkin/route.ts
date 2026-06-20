import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import AttendanceRecord from "@/models/AttendanceRecord";
import AttendanceSession from "@/models/AttendanceSession";

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { sessionId, childId, teacherId, status, checkedInBy } = body;

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 });
    }

    if (!childId && !teacherId) {
      return NextResponse.json({ error: "Either childId or teacherId is required" }, { status: 400 });
    }

    // Verify session exists and is active
    const session = await AttendanceSession.findById(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Attendance session not found" }, { status: 404 });
    }

    if (session.status !== "active") {
      return NextResponse.json(
        { error: "Attendance check is closed. Checking in is not permitted for closed sessions." },
        { status: 400 }
      );
    }

    const recordType = childId ? "child" : "teacher";
    const query: any = { sessionId, recordType };
    if (childId) query.childId = childId;
    if (teacherId) query.teacherId = teacherId;

    if (status === "absent") {
      // Mark absent = remove record from database
      await AttendanceRecord.deleteOne(query);
      return NextResponse.json({ success: true, status: "absent" });
    } else {
      // Mark present = upsert record
      const update = {
        ...query,
        status: "present",
        checkInTime: new Date(),
        checkedInBy: checkedInBy || "self",
      };

      const record = await AttendanceRecord.findOneAndUpdate(
        query,
        { $set: update },
        { upsert: true, new: true }
      );

      return NextResponse.json({ success: true, status: "present", record });
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to process check-in" },
      { status: 500 }
    );
  }
}
