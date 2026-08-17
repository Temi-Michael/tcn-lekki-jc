import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Offering from "@/models/Offering";
import { logActivity } from "@/lib/activity";

const DENOMINATIONS = [1000, 500, 200, 100, 50, 20, 10, 5];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Neutralizes CSV/formula injection (a note like "=cmd|..." must not execute in a
// spreadsheet) and quotes fields containing commas, quotes, or newlines.
const csvCell = (value: unknown) => {
  let s = value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  if (/[",\n\r]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
  return s;
};

export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from") || "";
    const to = searchParams.get("to") || "";

    if (!DATE_RE.test(from) || !DATE_RE.test(to)) {
      return NextResponse.json({ error: "Valid from and to dates (YYYY-MM-DD) are required" }, { status: 400 });
    }
    if (from > to) {
      return NextResponse.json({ error: "The start date must be on or before the end date" }, { status: 400 });
    }

    const start = new Date(`${from}T00:00:00.000Z`);
    const end = new Date(`${to}T23:59:59.999Z`);

    const offerings = await Offering.find({ date: { $gte: start, $lte: end } }).sort({
      date: 1,
      serviceType: 1,
    });

    const header = [
      "Date",
      "Service",
      ...DENOMINATIONS.map((d) => `N${d}`),
      "Total",
      "Notes",
    ];

    const rows = offerings.map((o) => {
      const denoms = o.denominations || new Map();
      return [
        new Date(o.date).toISOString().slice(0, 10),
        o.serviceType,
        ...DENOMINATIONS.map((d) => denoms.get(String(d)) || 0),
        o.total,
        o.notes || "",
      ];
    });

    const grandTotal = offerings.reduce((s, o) => s + o.total, 0);

    await logActivity(
      { action: "export.offerings", summary: `Exported offerings ${from} to ${to} (₦${grandTotal.toLocaleString()})` },
      request
    );
    const totalRow = ["TOTAL", "", ...DENOMINATIONS.map(() => ""), grandTotal, ""];

    const csv = [header, ...rows, totalRow]
      .map((row) => row.map(csvCell).join(","))
      .join("\r\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="offerings_${from}_to_${to}.csv"`,
      },
    });
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Failed to export offerings" }, { status: 500 });
  }
}
