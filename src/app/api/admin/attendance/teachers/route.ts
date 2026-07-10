import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Teacher from "@/models/Teacher";
import { isDuplicateMentor, DUPLICATE_MENTOR_MESSAGE } from "@/lib/mentorDuplicate";

export async function GET() {
  try {
    await dbConnect();
    const teachers = await Teacher.find({}).sort({ firstName: 1, lastName: 1 });
    return NextResponse.json(teachers);
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch teachers" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { firstName, lastName, phone, email, dob, weddingAnniversary, address, profession, company, subunit } = body;

    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: "First name and last name are required" },
        { status: 400 }
      );
    }

    if (await isDuplicateMentor(firstName, lastName, phone)) {
      return NextResponse.json({ error: DUPLICATE_MENTOR_MESSAGE }, { status: 409 });
    }

    const newTeacher = await Teacher.create({
      firstName,
      lastName,
      phone,
      email,
      dob: dob ? new Date(dob) : undefined,
      weddingAnniversary: weddingAnniversary ? new Date(weddingAnniversary) : undefined,
      address,
      profession,
      company,
      subunit,
    });

    return NextResponse.json(newTeacher, { status: 201 });
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Failed to create teacher" },
      { status: 500 }
    );
  }
}
