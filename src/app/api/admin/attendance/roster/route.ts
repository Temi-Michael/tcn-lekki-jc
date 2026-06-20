import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Child from "@/models/Child";
import Teacher from "@/models/Teacher";
import AttendanceRecord from "@/models/AttendanceRecord";

export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    // Fetch active children and active teachers
    const children = await Child.find({ status: "active" }).sort({ firstName: 1, lastName: 1 });
    const teachers = await Teacher.find({ status: "active" }).sort({ firstName: 1, lastName: 1 });

    if (!sessionId) {
      return NextResponse.json({
        children: children.map(c => ({ ...c.toObject(), isPresent: false })),
        teachers: teachers.map(t => ({ ...t.toObject(), isPresent: false })),
      });
    }

    // Fetch attendance records for the given session
    const records = await AttendanceRecord.find({ sessionId });

    // Map records by childId and teacherId for fast lookup
    const childRecordsMap = new Map();
    const teacherRecordsMap = new Map();

    records.forEach((rec) => {
      if (rec.recordType === "child" && rec.childId) {
        childRecordsMap.set(rec.childId.toString(), rec);
      } else if (rec.recordType === "teacher" && rec.teacherId) {
        teacherRecordsMap.set(rec.teacherId.toString(), rec);
      }
    });

    const childrenWithStatus = children.map((c) => {
      const record = childRecordsMap.get(c._id.toString());
      return {
        ...c.toObject(),
        isPresent: record ? record.status === "present" : false,
        record: record ? {
          _id: record._id,
          checkInTime: record.checkInTime,
          checkedInBy: record.checkedInBy,
        } : null,
      };
    });

    const teachersWithStatus = teachers.map((t) => {
      const record = teacherRecordsMap.get(t._id.toString());
      return {
        ...t.toObject(),
        isPresent: record ? record.status === "present" : false,
        record: record ? {
          _id: record._id,
          checkInTime: record.checkInTime,
          checkedInBy: record.checkedInBy,
        } : null,
      };
    });

    return NextResponse.json({
      children: childrenWithStatus,
      teachers: teachersWithStatus,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch roster with attendance status" },
      { status: 500 }
    );
  }
}
