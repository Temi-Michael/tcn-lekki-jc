import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Child from "@/models/Child";
import Teacher from "@/models/Teacher";
import AttendanceSession from "@/models/AttendanceSession";
import AttendanceRecord from "@/models/AttendanceRecord";

// A "Sunday" is a calendar date (sessions store a date-only value, so grouping
// by the ISO day is exact). Attendance is rolled up per date; a person present
// in more than one service that day is counted once in the distinct totals.

const DEFAULT_LIMIT = 6;
const STREAK_LOOKBACK = 12; // how many recent Sundays the streak walks back
const FOLLOWUP_THRESHOLD = 3; // consecutive Sundays missed before flagging

const dayKey = (d: Date | string) => new Date(d).toISOString().slice(0, 10);

export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date"); // optional YYYY-MM-DD
    const rawLimit = parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT), 10);
    const limit = Math.min(Math.max(Number.isNaN(rawLimit) ? DEFAULT_LIMIT : rawLimit, 1), 52);

    // Small dataset: load once, aggregate in memory (avoids per-session queries).
    const [sessions, children, teachers] = await Promise.all([
      AttendanceSession.find({}).sort({ date: -1 }),
      Child.find({ status: "active" }),
      Teacher.find({ status: "active" }),
    ]);

    const childMap = new Map(children.map((c) => [c._id.toString(), c]));

    const presentRecords = await AttendanceRecord.find({
      sessionId: { $in: sessions.map((s) => s._id) },
      status: "present",
    }).select("sessionId childId teacherId recordType");

    // sessionId -> present child/teacher id sets
    const bySession = new Map<string, { childIds: Set<string>; teacherIds: Set<string> }>();
    for (const s of sessions) {
      bySession.set(s._id.toString(), { childIds: new Set(), teacherIds: new Set() });
    }
    for (const rec of presentRecords) {
      const bucket = bySession.get(rec.sessionId.toString());
      if (!bucket) continue;
      if (rec.recordType === "child" && rec.childId) bucket.childIds.add(rec.childId.toString());
      else if (rec.recordType === "teacher" && rec.teacherId) bucket.teacherIds.add(rec.teacherId.toString());
    }

    // day -> sessions on that day
    const dayGroups = new Map<string, typeof sessions>();
    for (const s of sessions) {
      const k = dayKey(s.date);
      if (!dayGroups.has(k)) dayGroups.set(k, []);
      dayGroups.get(k)!.push(s);
    }
    const allDayKeys = [...dayGroups.keys()].sort().reverse(); // newest first

    const genderSplit = (ids: Iterable<string>) => {
      let boys = 0;
      let girls = 0;
      for (const id of ids) {
        const g = childMap.get(id)?.gender;
        if (g === "Male") boys++;
        else if (g === "Female") girls++;
      }
      return { boys, girls };
    };

    const buildSunday = (k: string) => {
      const daySessions = dayGroups.get(k) || [];
      const distinctChildren = new Set<string>();
      const distinctMentors = new Set<string>();

      const services = daySessions.map((s) => {
        const b = bySession.get(s._id.toString())!;
        b.childIds.forEach((id) => distinctChildren.add(id));
        b.teacherIds.forEach((id) => distinctMentors.add(id));
        const { boys, girls } = genderSplit(b.childIds);
        return {
          sessionId: s._id,
          title: s.title,
          serviceType: s.serviceType,
          status: s.status,
          presentChildren: b.childIds.size,
          boys,
          girls,
          presentMentors: b.teacherIds.size,
        };
      });
      services.sort((a, b) => a.serviceType.localeCompare(b.serviceType));

      // Denominator = children who were already registered by this Sunday.
      const dayEnd = new Date(`${k}T23:59:59.999Z`);
      const expected = children.filter((c) => new Date(c.createdAt) <= dayEnd).length;
      const distinct = genderSplit(distinctChildren);

      return {
        date: k,
        services,
        distinct: {
          children: distinctChildren.size,
          boys: distinct.boys,
          girls: distinct.girls,
          mentors: distinctMentors.size,
        },
        expectedChildren: expected,
        rate: expected > 0 ? Math.round((distinctChildren.size / expected) * 100) : 0,
      };
    };

    // Which Sundays to return in the display
    let reportDays: string[];
    if (dateParam) {
      reportDays = dayGroups.has(dateParam) ? [dateParam] : [];
    } else {
      reportDays = allDayKeys.slice(0, limit);
    }
    const sundays = reportDays.map(buildSunday);

    // ---- Follow-up (Sunday-based consecutive-miss streak) ----
    // A Sunday counts for the streak only if it has a regular service AND all its
    // sessions are closed (attendance finished) — so an in-progress Sunday never
    // flags anyone mid-service.
    const todayKey = dayKey(new Date());
    const streakDays = allDayKeys
      .filter((k) => {
        const ds = dayGroups.get(k)!;
        const hasRegular = ds.some((s) => s.serviceType !== "Special Event");
        const allClosed = ds.every((s) => s.status === "closed");
        return hasRegular && allClosed && k !== todayKey;
      })
      .slice(0, STREAK_LOOKBACK);

    const presentByDay = new Map<string, Set<string>>();
    for (const k of streakDays) {
      const set = new Set<string>();
      for (const s of dayGroups.get(k)!) {
        bySession.get(s._id.toString())!.childIds.forEach((id) => set.add(id));
      }
      presentByDay.set(k, set);
    }

    const followUp: any[] = [];
    for (const c of children) {
      const cid = c._id.toString();
      const createdKey = dayKey(c.createdAt);
      let missed = 0;
      let lastSeen: string | null = null;
      let mostRecentMissedDay: string | null = null;

      for (const k of streakDays) {
        if (k < createdKey) break; // not registered yet on this Sunday
        if (presentByDay.get(k)!.has(cid)) {
          lastSeen = k;
          break;
        }
        missed++;
        if (!mostRecentMissedDay) mostRecentMissedDay = k;
      }

      if (missed >= FOLLOWUP_THRESHOLD && mostRecentMissedDay) {
        const contacted = !!c.lastContactedAt && dayKey(c.lastContactedAt) >= mostRecentMissedDay;
        followUp.push({
          childId: c._id,
          firstName: c.firstName,
          lastName: c.lastName,
          age: c.age,
          gender: c.gender,
          parentName: c.parentName,
          parentPhone: c.parentPhone,
          missedSundays: missed,
          lastSeen,
          contacted,
        });
      }
    }
    followUp.sort((a, b) => b.missedSundays - a.missedSundays);

    // ---- Summary ----
    const latest = sundays[0] || (allDayKeys[0] ? buildSunday(allDayKeys[0]) : null);
    const recentRegular = allDayKeys
      .filter((k) => dayGroups.get(k)!.some((s) => s.serviceType !== "Special Event"))
      .slice(0, DEFAULT_LIMIT)
      .map(buildSunday);
    const averageRate = recentRegular.length
      ? Math.round(recentRegular.reduce((sum, s) => sum + s.rate, 0) / recentRegular.length)
      : 0;

    return NextResponse.json({
      summary: {
        totalChildren: children.length,
        totalMentors: teachers.length,
        latestSunday: latest
          ? { date: latest.date, distinctChildren: latest.distinct.children, distinctMentors: latest.distinct.mentors }
          : null,
        averageRate,
        followUpCount: followUp.filter((f) => !f.contacted).length,
      },
      sundays,
      followUp,
      availableDates: allDayKeys,
    });
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Failed to compile Sunday reports" }, { status: 500 });
  }
}
