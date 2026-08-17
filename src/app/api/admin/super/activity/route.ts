import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import ActivityLog from "@/models/ActivityLog";
import { getCurrentUser } from "@/lib/auth";
import { escapeRegExp } from "@/lib/matching";

const PAGE_SIZE = 20;

// Lives under /api/admin/super (middleware restricts to super_admin); re-checked
// here as defense-in-depth.
export async function GET(request: Request) {
  try {
    const session = await getCurrentUser();
    if (!session || session.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const action = searchParams.get("action") || "";
    const q = escapeRegExp((searchParams.get("q") || "").trim().slice(0, 100));
    const from = searchParams.get("from"); // YYYY-MM-DD
    const to = searchParams.get("to");

    const filter: any = {};
    if (action) filter.action = action;
    if (q) {
      const rx = { $regex: q, $options: "i" };
      filter.$or = [{ actorName: rx }, { summary: rx }];
    }
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(`${from}T00:00:00.000Z`);
      if (to) filter.createdAt.$lte = new Date(`${to}T23:59:59.999Z`);
    }

    const [logs, total, actions] = await Promise.all([
      ActivityLog.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE),
      ActivityLog.countDocuments(filter),
      ActivityLog.distinct("action"),
    ]);

    return NextResponse.json({
      logs,
      total,
      page,
      pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
      actions: (actions as string[]).sort(),
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Failed to load activity" }, { status: 500 });
  }
}
