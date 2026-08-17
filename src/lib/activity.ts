import dbConnect from "@/lib/db";
import ActivityLog from "@/models/ActivityLog";
import { getCurrentUser } from "@/lib/auth";

type LogEntry = {
  action: string;
  summary: string;
  targetType?: string;
  targetId?: any;
  metadata?: any;
  // Override the actor when the session cookie isn't available yet (e.g. the
  // login route sets the cookie in the response, so the request has none).
  actor?: { id?: string; name?: string; role?: string };
};

// Records an audit-log entry. Best-effort: a logging failure is swallowed so it
// can never break the action the user actually performed.
export async function logActivity(entry: LogEntry, request?: Request) {
  try {
    const sessionUser = entry.actor ? null : await getCurrentUser();

    let ip: string | undefined;
    if (request) {
      const fwd = request.headers.get("x-forwarded-for");
      ip = fwd ? fwd.split(",")[0].trim() : request.headers.get("x-real-ip") || undefined;
    }

    await dbConnect();
    await ActivityLog.create({
      actorId: entry.actor?.id ?? sessionUser?.userId,
      actorName: entry.actor?.name ?? sessionUser?.name ?? sessionUser?.username ?? "system",
      actorRole: entry.actor?.role ?? sessionUser?.role,
      action: entry.action,
      summary: entry.summary,
      targetType: entry.targetType,
      targetId: entry.targetId,
      metadata: entry.metadata,
      ip,
    });
  } catch (error) {
    console.error("Activity log failed:", error);
  }
}
