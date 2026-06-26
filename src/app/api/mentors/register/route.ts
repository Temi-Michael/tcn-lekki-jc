import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Teacher from "@/models/Teacher";

function escapeRegExp(val: string) {
  if (!val) return "";
  return val.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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

    const safeFirstName = escapeRegExp(firstName.trim());
    const safeLastName = escapeRegExp(lastName.trim());

    // Check duplicate name or phone (case-insensitive for names)
    const existingMentor = await Teacher.findOne({
      $or: [
        {
          firstName: { $regex: new RegExp(`^${safeFirstName}$`, "i") },
          lastName: { $regex: new RegExp(`^${safeLastName}$`, "i") },
        },
        { phone: phone.trim() },
      ],
    });

    if (existingMentor) {
      return NextResponse.json(
        { error: "A mentor with this name or phone number is already registered" },
        { status: 409 }
      );
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
    return NextResponse.json(
      { error: error.message || "Failed to register mentor" },
      { status: 500 }
    );
  }
}
