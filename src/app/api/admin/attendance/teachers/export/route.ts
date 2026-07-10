import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Teacher from "@/models/Teacher";

export async function GET() {
  try {
    await dbConnect();
    const teachers = await Teacher.find({ status: "active" }).sort({ firstName: 1, lastName: 1 });

    const csvRows: string[] = [];
    csvRows.push(`"TCN Lekki - Mentors Directory"`);
    csvRows.push(`"Exported","${new Date().toLocaleDateString()}"`);
    csvRows.push(`"Total","${teachers.length}"`);
    csvRows.push("");
    csvRows.push(
      `"First Name","Last Name","Phone","Email","Date of Birth","Wedding Anniversary","Address","Profession","Company","Subunit","Registered"`
    );

    teachers.forEach((t) => {
      const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      csvRows.push(
        [
          esc(t.firstName),
          esc(t.lastName),
          esc(t.phone),
          esc(t.email),
          t.dob ? esc(new Date(t.dob).toLocaleDateString()) : '""',
          t.weddingAnniversary ? esc(new Date(t.weddingAnniversary).toLocaleDateString()) : '""',
          esc(t.address),
          esc(t.profession),
          esc(t.company),
          esc(t.subunit),
          esc(new Date(t.createdAt).toLocaleDateString()),
        ].join(",")
      );
    });

    return new Response(csvRows.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="mentors_directory_${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error: any) {
    console.error("API error:", error);
    return new Response("Failed to export mentors directory", { status: 500 });
  }
}
