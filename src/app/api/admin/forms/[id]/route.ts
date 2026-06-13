import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Form from "@/models/Form";
import Submission from "@/models/Submission";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    
    await Form.findByIdAndDelete(id);
    await Submission.deleteMany({ formId: id });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const form = await Form.findById(id);
    return NextResponse.json(form);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch form" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();
    const { title, slug, status, fields } = body;

    const form = await Form.findByIdAndUpdate(
      id,
      { title, slug, status, fields },
      { new: true, runValidators: true }
    );
    return NextResponse.json(form);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update form" }, { status: 500 });
  }
}
