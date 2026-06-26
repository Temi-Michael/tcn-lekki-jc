import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Submission from "@/models/Submission";

function escapeRegExp(val: string) {
  if (!val) return "";
  return val.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const { formId, firstName, lastName, age } = await request.json();

    const safeFirstName = escapeRegExp(firstName || "");
    const safeLastName = escapeRegExp(lastName || "");

    // Check level 1: First name matches
    const firstNameMatch = await Submission.findOne({ 
      formId, 
      firstName: { $regex: new RegExp(`^${safeFirstName}$`, 'i') } 
    });

    if (!firstNameMatch) return NextResponse.json({ level: 0 });

    if (!lastName) return NextResponse.json({ level: 1 });

    // Check level 2: First + Last name matches
    const fullNameMatch = await Submission.findOne({
      formId,
      firstName: { $regex: new RegExp(`^${safeFirstName}$`, 'i') },
      lastName: { $regex: new RegExp(`^${safeLastName}$`, 'i') }
    });

    if (!fullNameMatch) return NextResponse.json({ level: 1 });

    if (!age) return NextResponse.json({ level: 2 });

    // Check level 3: Full match
    const exactMatch = await Submission.findOne({
      formId,
      firstName: { $regex: new RegExp(`^${safeFirstName}$`, 'i') },
      lastName: { $regex: new RegExp(`^${safeLastName}$`, 'i') },
      age
    });

    if (exactMatch) return NextResponse.json({ level: 3 });

    return NextResponse.json({ level: 2 });

  } catch (error) {
    return NextResponse.json({ error: "Failed to check duplicate" }, { status: 500 });
  }
}
