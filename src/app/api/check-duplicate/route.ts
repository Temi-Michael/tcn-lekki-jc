import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Submission from "@/models/Submission";

export async function POST(request: Request) {
  try {
    await dbConnect();
    const { formId, firstName, lastName, age } = await request.json();

    // Check level 1: First name matches
    const firstNameMatch = await Submission.findOne({ 
      formId, 
      firstName: { $regex: new RegExp(`^${firstName}$`, 'i') } 
    });

    if (!firstNameMatch) return NextResponse.json({ level: 0 });

    if (!lastName) return NextResponse.json({ level: 1 });

    // Check level 2: First + Last name matches
    const fullNameMatch = await Submission.findOne({
      formId,
      firstName: { $regex: new RegExp(`^${firstName}$`, 'i') },
      lastName: { $regex: new RegExp(`^${lastName}$`, 'i') }
    });

    if (!fullNameMatch) return NextResponse.json({ level: 1 });

    if (!age) return NextResponse.json({ level: 2 });

    // Check level 3: Full match
    const exactMatch = await Submission.findOne({
      formId,
      firstName: { $regex: new RegExp(`^${firstName}$`, 'i') },
      lastName: { $regex: new RegExp(`^${lastName}$`, 'i') },
      age
    });

    if (exactMatch) return NextResponse.json({ level: 3 });

    return NextResponse.json({ level: 2 });

  } catch (error) {
    return NextResponse.json({ error: "Failed to check duplicate" }, { status: 500 });
  }
}
