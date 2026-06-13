import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Submission from "@/models/Submission";
import Form from "@/models/Form";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    
    const form = await Form.findById(id);
    const submissions = await Submission.find({ formId: id, status: "approved" }).sort({ firstName: 1, lastName: 1 }).lean();

    if (!form) return new NextResponse("Form not found", { status: 404 });

    // Build CSV headers
    const customHeaders = form.fields.map((f: any) => f.label);
    const headers = ["First Name", "Last Name", "Age", "Date Submitted", ...customHeaders];
    
    // Build CSV rows
    const rows = submissions.map((sub: any) => {
      const row = [
        sub.firstName,
        sub.lastName,
        sub.age,
        new Date(sub.createdAt).toLocaleDateString(),
      ];
      
      form.fields.forEach((f: any) => {
        row.push(sub.data && sub.data[f.name] ? sub.data[f.name] : "");
      });
      
      return row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${form.slug}-submissions.csv"`,
      },
    });
  } catch (error) {
    return new NextResponse("Failed to export", { status: 500 });
  }
}
