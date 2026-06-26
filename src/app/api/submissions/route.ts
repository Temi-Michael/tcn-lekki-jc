import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Submission from "@/models/Submission";
import Form from "@/models/Form";

function escapeRegExp(val: string) {
  if (!val) return "";
  return val.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { formId, firstName, lastName, age, data } = body;

    const form = await Form.findById(formId);
    if (!form) return NextResponse.json({ error: "Form not found" }, { status: 404 });
    if (form.status === "disabled") return NextResponse.json({ error: "Form is no longer active" }, { status: 403 });

    const safeFirstName = escapeRegExp(firstName || "");
    const safeLastName = escapeRegExp(lastName || "");

    // Server-side duplicate check
    let isDuplicateSuspected = false;
    const exactMatch = await Submission.findOne({
      formId,
      firstName: { $regex: new RegExp(`^${safeFirstName}$`, 'i') },
      lastName: { $regex: new RegExp(`^${safeLastName}$`, 'i') },
      age
    });

    if (exactMatch) {
      isDuplicateSuspected = true;
    } else {
      const fullNameMatch = await Submission.findOne({
        formId,
        firstName: { $regex: new RegExp(`^${safeFirstName}$`, 'i') },
        lastName: { $regex: new RegExp(`^${safeLastName}$`, 'i') }
      });
      if (fullNameMatch) {
        isDuplicateSuspected = true;
      }
    }

    const submission = await Submission.create({
      formId,
      firstName,
      lastName,
      age,
      data,
      status: isDuplicateSuspected ? "needs_review" : "approved"
    });

    return NextResponse.json(submission);
  } catch (error) {
    return NextResponse.json({ error: "Failed to submit form" }, { status: 500 });
  }
}
