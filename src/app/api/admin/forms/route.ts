import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Form from "@/models/Form";

export async function GET() {
  try {
    await dbConnect();
    const forms = await Form.find({}).sort({ createdAt: -1 });
    return NextResponse.json(forms);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch forms" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { title, slug, status, fields } = body;

    const form = await Form.create({
      title,
      slug,
      status: status || "disabled",
      fields,
    });

    return NextResponse.json(form);
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ error: "A form with this link already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || "Failed to create form" }, { status: 500 });
  }
}
