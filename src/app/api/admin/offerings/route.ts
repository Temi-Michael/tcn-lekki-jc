import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Offering from "@/models/Offering";
import { logActivity } from "@/lib/activity";

// Naira notes, high to low. The offering total is always computed from these on
// the server so a tampered client total can never be persisted.
const DENOMINATIONS = [1000, 500, 200, 100, 50, 20, 10, 5];
const SERVICE_TYPES = ["1st Service", "2nd Service", "Special Event"];

const dayKey = (d: Date | string) => new Date(d).toISOString().slice(0, 10);
const monthKey = (d: Date | string) => new Date(d).toISOString().slice(0, 7);

// Keeps only allowed denominations with positive integer counts, and returns the
// computed total (Σ note value × count).
const sanitizeDenominations = (input: any) => {
  const clean: Record<string, number> = {};
  let total = 0;
  for (const note of DENOMINATIONS) {
    const raw = Number(input?.[note] ?? input?.[String(note)]);
    const count = Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 0;
    if (count > 0) {
      clean[String(note)] = count;
      total += note * count;
    }
  }
  return { clean, total };
};

export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const monthParam = searchParams.get("month"); // YYYY-MM

    // Small dataset: load once, aggregate in memory.
    const all = await Offering.find({}).sort({ date: -1 });
    const availableMonths = [...new Set(all.map((o) => monthKey(o.date)))]; // newest first

    const month = monthParam || availableMonths[0] || monthKey(new Date());
    const monthOfferings = all.filter((o) => monthKey(o.date) === month);

    // Group the month's offerings by Sunday (date).
    const byDay = new Map<string, typeof monthOfferings>();
    for (const o of monthOfferings) {
      const k = dayKey(o.date);
      if (!byDay.has(k)) byDay.set(k, []);
      byDay.get(k)!.push(o);
    }

    const sundays = [...byDay.entries()]
      .sort((a, b) => (a[0] < b[0] ? 1 : -1)) // newest Sunday first
      .map(([date, list]) => {
        const services = list
          .slice()
          .sort((a, b) => a.serviceType.localeCompare(b.serviceType))
          .map((o) => ({
            _id: o._id,
            serviceType: o.serviceType,
            total: o.total,
            denominations: Object.fromEntries(o.denominations || new Map()),
            notes: o.notes || "",
          }));
        return { date, services, sundayTotal: services.reduce((s, x) => s + x.total, 0) };
      });

    const monthTotal = monthOfferings.reduce((s, o) => s + o.total, 0);
    const serviceTotals: Record<string, number> = {};
    for (const t of SERVICE_TYPES) serviceTotals[t] = 0;
    for (const o of monthOfferings) serviceTotals[o.serviceType] = (serviceTotals[o.serviceType] || 0) + o.total;

    return NextResponse.json({
      month,
      sundays,
      summary: {
        monthTotal,
        latestSunday: sundays[0] ? { date: sundays[0].date, total: sundays[0].sundayTotal } : null,
        serviceTotals,
        sundaysRecorded: sundays.length,
      },
      availableMonths,
      denominations: DENOMINATIONS,
    });
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Failed to load offerings" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { date, serviceType, denominations, notes } = body;

    if (!date || !serviceType || !SERVICE_TYPES.includes(serviceType)) {
      return NextResponse.json({ error: "A valid date and service type are required" }, { status: 400 });
    }

    const { clean, total } = sanitizeDenominations(denominations);
    if (total <= 0) {
      return NextResponse.json({ error: "Enter at least one denomination count" }, { status: 400 });
    }

    try {
      const offering = await Offering.create({
        date: new Date(date),
        serviceType,
        denominations: clean,
        total,
        notes: notes?.trim() || undefined,
      });
      await logActivity(
        {
          action: "offering.record",
          summary: `Recorded ${serviceType} offering ₦${total.toLocaleString()} for ${date}`,
          targetType: "Offering",
          targetId: offering._id,
        },
        request
      );
      return NextResponse.json(offering, { status: 201 });
    } catch (err: any) {
      if (err.code === 11000) {
        return NextResponse.json(
          { error: `An offering for the ${serviceType} on this date already exists. Edit it instead.` },
          { status: 409 }
        );
      }
      throw err;
    }
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Failed to record offering" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    await dbConnect();
    const { offeringId, denominations, notes } = await request.json();

    if (!offeringId || !mongoose.Types.ObjectId.isValid(offeringId)) {
      return NextResponse.json({ error: "A valid offeringId is required" }, { status: 400 });
    }

    const { clean, total } = sanitizeDenominations(denominations);
    if (total <= 0) {
      return NextResponse.json({ error: "Enter at least one denomination count" }, { status: 400 });
    }

    const offering = await Offering.findByIdAndUpdate(
      offeringId,
      { $set: { denominations: clean, total, notes: notes?.trim() || undefined } },
      { new: true }
    );
    if (!offering) {
      return NextResponse.json({ error: "Offering not found" }, { status: 404 });
    }
    await logActivity(
      {
        action: "offering.edit",
        summary: `Edited ${offering.serviceType} offering to ₦${total.toLocaleString()}`,
        targetType: "Offering",
        targetId: offering._id,
      },
      request
    );
    return NextResponse.json(offering);
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Failed to update offering" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    let offeringId = searchParams.get("offeringId");
    if (!offeringId) {
      const body = await request.json().catch(() => ({}));
      offeringId = body.offeringId;
    }

    if (!offeringId || !mongoose.Types.ObjectId.isValid(offeringId)) {
      return NextResponse.json({ error: "A valid offeringId is required" }, { status: 400 });
    }

    const deleted = await Offering.findByIdAndDelete(offeringId);
    if (!deleted) {
      return NextResponse.json({ error: "Offering not found" }, { status: 404 });
    }
    await logActivity(
      {
        action: "offering.delete",
        summary: `Deleted ${deleted.serviceType} offering of ₦${(deleted.total || 0).toLocaleString()}`,
        targetType: "Offering",
        targetId: deleted._id,
      },
      request
    );
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Failed to delete offering" }, { status: 500 });
  }
}
