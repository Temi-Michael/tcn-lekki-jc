import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import AttendanceSession from "@/models/AttendanceSession";

const slugify = (text: string) => {
  return text
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
};

export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("active") === "true";
    const sessionId = searchParams.get("sessionId") || searchParams.get("id");

    if (sessionId) {
      const isObjectId = mongoose.Types.ObjectId.isValid(sessionId);
      const query = isObjectId ? { _id: sessionId } : { slug: sessionId };
      
      const session = await AttendanceSession.findOne(query)
        .populate("teachersAvailable")
        .exec();
      if (!session) {
        return NextResponse.json({ error: "Session not found" }, { status: 404 });
      }
      return NextResponse.json(session);
    }

    if (activeOnly) {
      const activeSession = await AttendanceSession.findOne({ status: "active" })
        .populate("teachersAvailable")
        .exec();
      return NextResponse.json(activeSession || null);
    }

    const sessions = await AttendanceSession.find({})
      .populate("teachersAvailable")
      .sort({ date: -1, createdAt: -1 });

    return NextResponse.json(sessions);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch sessions" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { title, date, serviceType, teachersAvailable, notes, status } = body;

    if (!title || !date || !serviceType) {
      return NextResponse.json(
        { error: "Title, date, and service type are required" },
        { status: 400 }
      );
    }

    // If setting this session as active, close any other active sessions
    const sessionStatus = status || "active";
    if (sessionStatus === "active") {
      await AttendanceSession.updateMany(
        { status: "active" },
        { $set: { status: "closed" } }
      );
    }

    const slugBase = slugify(title);
    
    // Ensure slug is unique
    let finalSlug = slugBase;
    let counter = 1;
    while (await AttendanceSession.findOne({ slug: finalSlug })) {
      finalSlug = `${slugBase}-${counter}`;
      counter++;
    }

    const newSession = await AttendanceSession.create({
      title,
      slug: finalSlug,
      date: new Date(date),
      serviceType,
      teachersAvailable: teachersAvailable || [],
      notes: notes || "",
      status: sessionStatus,
    });

    // Populate teachers details before returning
    const populatedSession = await AttendanceSession.findById(newSession._id)
      .populate("teachersAvailable")
      .exec();

    return NextResponse.json(populatedSession, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create session" },
      { status: 500 }
    );
  }
}

// Support updating a session (e.g., closing it) via PUT/PATCH on the same route or a sub-route.
// Let's add a PATCH handler for updating status or other details.
export async function PATCH(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { sessionId, status, title, teachersAvailable, notes } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required for update" },
        { status: 400 }
      );
    }

    const updateFields: any = {};
    if (status) {
      updateFields.status = status;
      // If setting this session as active, close all others
      if (status === "active") {
        await AttendanceSession.updateMany(
          { _id: { $ne: sessionId }, status: "active" },
          { $set: { status: "closed" } }
        );
      }
    }
    if (title) updateFields.title = title;
    if (teachersAvailable) updateFields.teachersAvailable = teachersAvailable;
    if (notes !== undefined) updateFields.notes = notes;

    const updatedSession = await AttendanceSession.findByIdAndUpdate(
      sessionId,
      { $set: updateFields },
      { new: true }
    ).populate("teachersAvailable");

    if (!updatedSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json(updatedSession);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update session" },
      { status: 500 }
    );
  }
}
