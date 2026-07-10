import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Child from "@/models/Child";
import AttendanceSession from "@/models/AttendanceSession";
import AttendanceRecord from "@/models/AttendanceRecord";
import { sendChildRegistrationEmail } from "@/lib/mail";
import { isSameDay, nameRegex, normalizePhone } from "@/lib/matching";

const DUPLICATE_CHILD_MESSAGE =
  "This child is already registered. Please check the Registered Children list before adding.";

export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query") || "";

    let filter: any = {};
    if (query) {
      const searchRegex = new RegExp(query, "i");
      filter = {
        $or: [
          { firstName: searchRegex },
          { lastName: searchRegex },
          { parentPhone: searchRegex },
        ],
      };
    }

    const children = await Child.find(filter).sort({ firstName: 1, lastName: 1 });
    return NextResponse.json(children);
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch children" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const {
      firstName,
      lastName,
      age,
      gender,
      dob,
      parentName,
      parentPhone,
      parentEmail,
      phone,
      email,
      schoolClass,
      dayOrBoarding,
      sundayService,
      customData,
      markPresentToday,
    } = body;

    if (
      !firstName ||
      !lastName ||
      age === undefined ||
      age === null ||
      age === "" ||
      !gender ||
      !dob ||
      !schoolClass ||
      !dayOrBoarding ||
      !sundayService ||
      !parentName ||
      !parentPhone
    ) {
      return NextResponse.json(
        {
          error:
            "First Name, Last Name, Age, Gender, Date of Birth, Class, Day/Boarding, Sunday Service, Parent's Name, and Parent's Phone are required",
        },
        { status: 400 }
      );
    }

    // A child is a duplicate only when name, parent phone AND date of birth all
    // match. Siblings share a parent phone, so phone alone must never block.
    // Candidates are fetched by the indexed name fields, then phone is compared
    // in normalized form because stored formats vary (+234.../234.../0...).
    const sameNameChildren = await Child.find({
      firstName: nameRegex(firstName),
      lastName: nameRegex(lastName),
    });

    const incomingPhone = normalizePhone(parentPhone);
    const isDuplicate = sameNameChildren.some(
      (existing) =>
        normalizePhone(existing.parentPhone) === incomingPhone && isSameDay(existing.dob, dob)
    );

    if (isDuplicate) {
      return NextResponse.json({ error: DUPLICATE_CHILD_MESSAGE }, { status: 409 });
    }

    // 1. Create Child Record
    const child = await Child.create({
      firstName,
      lastName,
      age,
      gender,
      dob: dob ? new Date(dob) : undefined,
      parentName: parentName || "",
      parentPhone: parentPhone || "",
      parentEmail: parentEmail || "",
      phone: phone || "",
      email: email || "",
      schoolClass: schoolClass || "",
      dayOrBoarding: dayOrBoarding || undefined,
      sundayService: sundayService || undefined,
      customData: customData || {},
      status: "active",
    });

    // 2. If toggle is enabled, automatically check in for the active session
    let checkedIn = false;
    if (markPresentToday) {
      const activeSession = await AttendanceSession.findOne({ status: "active" });
      if (activeSession) {
        await AttendanceRecord.create({
          sessionId: activeSession._id,
          childId: child._id,
          recordType: "child",
          status: "present",
          checkedInBy: "admin",
          checkInTime: new Date(),
        });
        checkedIn = true;
      }
    }

    // 3. Send confirmation email if email is provided
    if (parentEmail && parentEmail.trim()) {
      sendChildRegistrationEmail(parentEmail.trim(), parentName || "", `${firstName} ${lastName}`)
        .catch(err => console.error("Error sending registration email in background:", err));
    }

    return NextResponse.json({ child, checkedIn }, { status: 201 });
  } catch (error: any) {
    // The unique index rejected a concurrent write that raced past the check above.
    if (error.code === 11000) {
      return NextResponse.json({ error: DUPLICATE_CHILD_MESSAGE }, { status: 409 });
    }
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Failed to create child record" },
      { status: 500 }
    );
  }
}
