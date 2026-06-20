import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import AttendanceSession from "@/models/AttendanceSession";
import Child from "@/models/Child";
import Teacher from "@/models/Teacher";
import AttendanceRecord from "@/models/AttendanceRecord";

export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return new Response("Session ID is required", { status: 400 });
    }

    const session = await AttendanceSession.findById(sessionId).populate("teachersAvailable");
    if (!session) {
      return new Response("Attendance Session not found", { status: 404 });
    }

    // Fetch children and teachers
    const children = await Child.find({ status: "active" }).sort({ firstName: 1, lastName: 1 });
    const teachers = await Teacher.find({ status: "active" }).sort({ firstName: 1, lastName: 1 });

    // Fetch records
    const records = await AttendanceRecord.find({ sessionId });
    const childRecordsMap = new Map();
    const teacherRecordsMap = new Map();

    records.forEach((rec) => {
      if (rec.recordType === "child" && rec.childId) {
        childRecordsMap.set(rec.childId.toString(), rec);
      } else if (rec.recordType === "teacher" && rec.teacherId) {
        teacherRecordsMap.set(rec.teacherId.toString(), rec);
      }
    });

    // Generate CSV contents
    const csvRows = [];

    // Session Info Header
    csvRows.push(`"TCN Lekki Attendance Session Report"`);
    csvRows.push(`"Session Title","${session.title.replace(/"/g, '""')}"`);
    csvRows.push(`"Date","${new Date(session.date).toLocaleDateString()}"`);
    csvRows.push(`"Service Type","${session.serviceType}"`);
    csvRows.push(`"Notes","${(session.notes || "").replace(/"/g, '""')}"`);
    csvRows.push(""); // blank line

    // Column Headers
    csvRows.push(`"First Name","Last Name","Role","Age","Gender","Status","Check-In Time","Checked-In By","Parent/Contact Name","Phone Number"`);

    // Process Teachers
    teachers.forEach((t) => {
      const record = teacherRecordsMap.get(t._id.toString());
      const isPresent = record ? "Present" : "Absent";
      const checkInTime = record ? new Date(record.checkInTime).toLocaleTimeString() : "";
      const checkedInBy = record ? record.checkedInBy : "";
      csvRows.push(
        `"${t.firstName.replace(/"/g, '""')}","${t.lastName.replace(/"/g, '""')}","Teacher","N/A","N/A","${isPresent}","${checkInTime}","${checkedInBy}","N/A","${(t.phone || "").replace(/"/g, '""')}"`
      );
    });

    // Process Children
    children.forEach((c) => {
      const record = childRecordsMap.get(c._id.toString());
      const isPresent = record ? "Present" : "Absent";
      const checkInTime = record ? new Date(record.checkInTime).toLocaleTimeString() : "";
      const checkedInBy = record ? record.checkedInBy : "";
      csvRows.push(
        `"${c.firstName.replace(/"/g, '""')}","${c.lastName.replace(/"/g, '""')}","Child","${c.age}","${c.gender}","${isPresent}","${checkInTime}","${checkedInBy}","${(c.parentName || "").replace(/"/g, '""')}","${(c.parentPhone || "").replace(/"/g, '""')}"`
      );
    });

    const csvContent = csvRows.join("\n");

    // Sanitized file name
    const filename = `${session.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_attendance.csv`;

    return new Response(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    return new Response(error.message || "Failed to export attendance report", { status: 500 });
  }
}
