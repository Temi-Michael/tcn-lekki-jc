import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Teacher from "@/models/Teacher";

export async function GET() {
  try {
    await dbConnect();
    const teachers = await Teacher.find({}).sort({ firstName: 1, lastName: 1 });
    return NextResponse.json(teachers);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch teachers" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { firstName, lastName, phone, email } = body;

    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: "First name and last name are required" },
        { status: 400 }
      );
    }

    const newTeacher = await Teacher.create({
      firstName,
      lastName,
      phone,
      email,
    });

    return NextResponse.json(newTeacher, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create teacher" },
      { status: 500 }
    );
  }
}
