import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Child from "@/models/Child";
import Teacher from "@/models/Teacher";
import AttendanceSession from "@/models/AttendanceSession";
import AttendanceRecord from "@/models/AttendanceRecord";

export async function GET() {
  try {
    await dbConnect();

    // 1. Core Roster Counts
    const totalChildren = await Child.countDocuments({ status: "active" });
    const totalTeachers = await Teacher.countDocuments({ status: "active" });

    // 2. Fetch recent sessions to compute attendance trends
    const recentSessions = await AttendanceSession.find({})
      .sort({ date: -1 })
      .limit(5);

    const sessionStats = [];
    let totalPresentRateSum = 0;

    for (const session of recentSessions) {
      const presentCount = await AttendanceRecord.countDocuments({
        sessionId: session._id,
        recordType: "child",
        status: "present",
      });

      const attendanceRate = totalChildren > 0 ? (presentCount / totalChildren) * 100 : 0;
      totalPresentRateSum += attendanceRate;

      sessionStats.push({
        sessionId: session._id,
        title: session.title,
        date: session.date,
        serviceType: session.serviceType,
        presentCount,
        attendanceRate: Math.round(attendanceRate),
      });
    }

    const averageAttendanceRate = recentSessions.length > 0
      ? Math.round(totalPresentRateSum / recentSessions.length)
      : 0;

    // 3. Identify Children for Follow-up (Absent for 2 or more consecutive sessions)
    const followUpList: any[] = [];
    if (recentSessions.length >= 2) {
      const mostRecentSession = recentSessions[0];
      const secondRecentSession = recentSessions[1];

      // Fetch present children IDs for both sessions
      const presentRecs1 = await AttendanceRecord.find({
        sessionId: mostRecentSession._id,
        recordType: "child",
        status: "present",
      }).select("childId");

      const presentRecs2 = await AttendanceRecord.find({
        sessionId: secondRecentSession._id,
        recordType: "child",
        status: "present",
      }).select("childId");

      const presentSet1 = new Set(presentRecs1.map(r => r.childId?.toString()));
      const presentSet2 = new Set(presentRecs2.map(r => r.childId?.toString()));

      // Active children who are absent in BOTH sessions
      const allActiveChildren = await Child.find({ status: "active" });

      allActiveChildren.forEach((child) => {
        const childIdStr = child._id.toString();
        const missedSession1 = !presentSet1.has(childIdStr);
        const missedSession2 = !presentSet2.has(childIdStr);

        if (missedSession1 && missedSession2) {
          // Count total consecutive absences (can look back further if needed)
          let consecutiveAbsences = 2;
          // Check session 3
          if (recentSessions.length >= 3 && childIdStr) {
            // We can do a quick check later or just list them as "Absent >= 2 weeks"
          }

          followUpList.push({
            childId: child._id,
            firstName: child.firstName,
            lastName: child.lastName,
            age: child.age,
            gender: child.gender,
            parentName: child.parentName,
            parentPhone: child.parentPhone,
            consecutiveAbsences,
            lastSeen: secondRecentSession.date,
          });
        }
      });
    }

    return NextResponse.json({
      totalChildren,
      totalTeachers,
      averageAttendanceRate,
      recentSessions: sessionStats,
      followUpList,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to compile attendance statistics" },
      { status: 500 }
    );
  }
}
