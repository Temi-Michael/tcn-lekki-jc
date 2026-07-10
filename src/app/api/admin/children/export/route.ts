import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Child from "@/models/Child";

export async function GET() {
  try {
    await dbConnect();
    const children = await Child.find({ status: "active" }).sort({ firstName: 1, lastName: 1 });

    const csvRows: string[] = [];
    csvRows.push(`"TCN Lekki - Children Directory"`);
    csvRows.push(`"Exported","${new Date().toLocaleDateString()}"`);
    csvRows.push(`"Total","${children.length}"`);
    csvRows.push("");
    csvRows.push(
      `"First Name","Last Name","Age","Gender","Date of Birth","Class/Grade","Day/Boarding","Sunday Service","Child Phone","Child Email","Parent Name","Parent Phone","Parent Email","Registered"`
    );

    children.forEach((c) => {
      const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      csvRows.push(
        [
          esc(c.firstName),
          esc(c.lastName),
          esc(c.age),
          esc(c.gender),
          c.dob ? esc(new Date(c.dob).toLocaleDateString()) : '""',
          esc(c.schoolClass),
          esc(c.dayOrBoarding),
          esc(c.sundayService),
          esc(c.phone),
          esc(c.email),
          esc(c.parentName),
          esc(c.parentPhone),
          esc(c.parentEmail),
          esc(new Date(c.createdAt).toLocaleDateString()),
        ].join(",")
      );
    });

    return new Response(csvRows.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="children_directory_${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error: any) {
    console.error("API error:", error);
    return new Response("Failed to export children directory", { status: 500 });
  }
}
