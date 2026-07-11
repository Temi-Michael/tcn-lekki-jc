import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import dbConnect from "@/lib/db";
import mongoose from "mongoose";
import Child from "@/models/Child";
import Teacher from "@/models/Teacher";
import AttendanceSession from "@/models/AttendanceSession";
import AttendanceRecord from "@/models/AttendanceRecord";
import { verifySession } from "@/lib/auth";

function shapeRecord(record: any) {
  return record
    ? { _id: record._id, checkInTime: record.checkInTime, checkedInBy: record.checkedInBy }
    : null;
}

// The public check-in kiosks are unauthenticated, so they receive ONLY the
// fields the board renders. Parent PII (phone, name, email, address, dob) is
// never sent to a client without a valid admin session. Authenticated admins
// get the full record.
function shapeChild(doc: any, record: any, isAdmin: boolean) {
  const c = doc.toObject();
  const base = isAdmin
    ? c
    : { _id: c._id, firstName: c.firstName, lastName: c.lastName, age: c.age, gender: c.gender };
  return { ...base, isPresent: record ? record.status === "present" : false, record: shapeRecord(record) };
}

function shapeTeacher(doc: any, record: any, isAdmin: boolean) {
  const t = doc.toObject();
  const base = isAdmin
    ? t
    : { _id: t._id, firstName: t.firstName, lastName: t.lastName };
  return { ...base, isPresent: record ? record.status === "present" : false, record: shapeRecord(record) };
}

export async function GET(request: Request) {
  try {
    await dbConnect();

    const token = (await cookies()).get("admin_session")?.value;
    const isAdmin = token ? !!(await verifySession(token)) : false;

    const sessionId = new URL(request.url).searchParams.get("sessionId");

    const children = await Child.find({ status: "active" }).sort({ firstName: 1, lastName: 1 });
    const teachers = await Teacher.find({ status: "active" }).sort({ firstName: 1, lastName: 1 });

    // Resolve the session by id or slug. If it is missing or not found, everyone
    // is simply reported absent (no attendance records to map).
    let sessionObj = null;
    if (sessionId) {
      const byId = mongoose.Types.ObjectId.isValid(sessionId);
      sessionObj = await AttendanceSession.findOne(byId ? { _id: sessionId } : { slug: sessionId });
    }

    const childRecords = new Map();
    const teacherRecords = new Map();
    if (sessionObj) {
      const records = await AttendanceRecord.find({ sessionId: sessionObj._id });
      records.forEach((rec) => {
        if (rec.recordType === "child" && rec.childId) {
          childRecords.set(rec.childId.toString(), rec);
        } else if (rec.recordType === "teacher" && rec.teacherId) {
          teacherRecords.set(rec.teacherId.toString(), rec);
        }
      });
    }

    return NextResponse.json({
      children: children.map((c) => shapeChild(c, childRecords.get(c._id.toString()), isAdmin)),
      teachers: teachers.map((t) => shapeTeacher(t, teacherRecords.get(t._id.toString()), isAdmin)),
    });
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch roster with attendance status" },
      { status: 500 }
    );
  }
}
