import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import mongoose from "mongoose";
import Child from "@/models/Child";
import Teacher from "@/models/Teacher";

const testTeachers = [
  { firstName: "Kelechi", lastName: "Okafor", phone: "+234 803 111 2222", email: "kelechi.o@tcnlekki.org" },
  { firstName: "Funmi", lastName: "Adebayo", phone: "+234 802 333 4444", email: "funmi.a@tcnlekki.org" },
  { firstName: "Chioma", lastName: "Nwachukwu", phone: "+234 812 555 6666", email: "chioma.n@tcnlekki.org" },
  { firstName: "Tunde", lastName: "Bakare", phone: "+234 703 777 8888", email: "tunde.b@tcnlekki.org" },
  { firstName: "Yetunde", lastName: "Olatunji", phone: "+234 809 999 0000", email: "yetunde.o@tcnlekki.org" },
];

const testChildren = [
  { firstName: "Temi", lastName: "Michael", age: 12, gender: "Male", parentName: "Kelechi Michael", parentPhone: "+234 803 000 0001", parentEmail: "k.michael@example.com" },
  { firstName: "Ayobami", lastName: "Sanmi", age: 12, gender: "Male", parentName: "Ayo Sanmi", parentPhone: "+234 803 000 0002", parentEmail: "a.sanmi@example.com" },
  { firstName: "Ayomide", lastName: "Williams", age: 11, gender: "Female", parentName: "Wale Williams", parentPhone: "+234 803 000 0003", parentEmail: "w.williams@example.com" },
  { firstName: "Daniel", lastName: "Adebayo", age: 13, gender: "Male", parentName: "Funmi Adebayo", parentPhone: "+234 802 333 4444", parentEmail: "funmi.a@tcnlekki.org" },
  { firstName: "Chidi", lastName: "Okafor", age: 10, gender: "Male", parentName: "Kelechi Okafor", parentPhone: "+234 803 111 2222", parentEmail: "kelechi.o@tcnlekki.org" },
  { firstName: "Blessing", lastName: "Egwu", age: 9, gender: "Female", parentName: "John Egwu", parentPhone: "+234 803 000 0004", parentEmail: "j.egwu@example.com" },
  { firstName: "Praise", lastName: "Nwachukwu", age: 8, gender: "Female", parentName: "Chioma Nwachukwu", parentPhone: "+234 812 555 6666", parentEmail: "chioma.n@tcnlekki.org" },
  { firstName: "Oluwaseun", lastName: "Bakare", age: 12, gender: "Male", parentName: "Tunde Bakare", parentPhone: "+234 703 777 8888", parentEmail: "tunde.b@tcnlekki.org" },
  { firstName: "Favour", lastName: "Olatunji", age: 11, gender: "Female", parentName: "Yetunde Olatunji", parentPhone: "+234 809 999 0000", parentEmail: "yetunde.o@tcnlekki.org" },
  { firstName: "Tobi", lastName: "Alabi", age: 10, gender: "Male", parentName: "Sade Alabi", parentPhone: "+234 803 000 0005", parentEmail: "s.alabi@example.com" },
  { firstName: "Emeka", lastName: "Johnson", age: 13, gender: "Male", parentName: "Peter Johnson", parentPhone: "+234 803 000 0006", parentEmail: "p.johnson@example.com" },
  { firstName: "Amaka", lastName: "Johnson", age: 11, gender: "Female", parentName: "Peter Johnson", parentPhone: "+234 803 000 0006", parentEmail: "p.johnson@example.com" },
  { firstName: "Damilola", lastName: "Davies", age: 12, gender: "Female", parentName: "Toyin Davies", parentPhone: "+234 803 000 0007", parentEmail: "t.davies@example.com" },
  { firstName: "Samuel", lastName: "Ojo", age: 10, gender: "Male", parentName: "Bunmi Ojo", parentPhone: "+234 803 000 0008", parentEmail: "b.ojo@example.com" },
  { firstName: "Esther", lastName: "Ojo", age: 9, gender: "Female", parentName: "Bunmi Ojo", parentPhone: "+234 803 000 0008", parentEmail: "b.ojo@example.com" },
  { firstName: "David", lastName: "Okeke", age: 13, gender: "Male", parentName: "Chinedu Okeke", parentPhone: "+234 803 000 0009", parentEmail: "c.okeke@example.com" },
  { firstName: "Victoria", lastName: "Okeke", age: 11, gender: "Female", parentName: "Chinedu Okeke", parentPhone: "+234 803 000 0009", parentEmail: "c.okeke@example.com" },
  { firstName: "Joy", lastName: "Benson", age: 10, gender: "Female", parentName: "Frank Benson", parentPhone: "+234 803 000 0010", parentEmail: "f.benson@example.com" },
  { firstName: "Victor", lastName: "Benson", age: 12, gender: "Male", parentName: "Frank Benson", parentPhone: "+234 803 000 0010", parentEmail: "f.benson@example.com" },
];

export async function POST() {
  try {
    await dbConnect();

    // Clear existing data to avoid duplicates/ensure consistency
    await Child.deleteMany({});
    await Teacher.deleteMany({});

    // Drop old attendance records to clear old indexes
    try {
      const db = mongoose.connection.db;
      if (db) {
        await db.collection("attendancerecords").drop();
      }
    } catch (e) {
      // Ignore if collection doesn't exist
    }

    // Seed Teachers
    const seededTeachers = await Teacher.insertMany(testTeachers);

    // Seed Children
    const seededChildren = await Child.insertMany(testChildren);

    return NextResponse.json({
      success: true,
      message: "Seeding completed successfully",
      teachersCount: seededTeachers.length,
      childrenCount: seededChildren.length,
    });
  } catch (error: any) {
    console.error("Seeding failed:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to seed database" },
      { status: 500 }
    );
  }
}
