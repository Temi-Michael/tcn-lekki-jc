import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Teacher from "@/models/Teacher";
import { isDuplicateMentor, DUPLICATE_MENTOR_MESSAGE } from "@/lib/mentorDuplicate";

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const {
      firstName,
      lastName,
      phone,
      email,
      dob,
      weddingAnniversary,
      address,
      profession,
      company,
      subunit,
    } = body;

    // Check required fields
    if (!firstName || !lastName || !phone || !dob || !address || !profession || !company || !subunit) {
      return NextResponse.json(
        { error: "Please fill in all required fields" },
        { status: 400 }
      );
    }

    if (await isDuplicateMentor(firstName, lastName, phone)) {
      return NextResponse.json({ error: DUPLICATE_MENTOR_MESSAGE }, { status: 409 });
    }

    const newMentor = await Teacher.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      email: email ? email.trim() : undefined,
      dob: new Date(dob),
      weddingAnniversary: weddingAnniversary ? new Date(weddingAnniversary) : undefined,
      address: address.trim(),
      profession: profession.trim(),
      company: company.trim(),
      subunit,
      status: "active",
    });

    return NextResponse.json(newMentor, { status: 201 });
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Failed to register mentor" },
      { status: 500 }
    );
  }
}
