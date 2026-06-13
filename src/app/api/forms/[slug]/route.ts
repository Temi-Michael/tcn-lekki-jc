import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Form from "@/models/Form";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await dbConnect();
    const { slug } = await params;
    
    const form = await Form.findOne({ slug });
    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }


    
    return NextResponse.json(form);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
