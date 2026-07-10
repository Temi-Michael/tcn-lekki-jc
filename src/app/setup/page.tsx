import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import dbConnect from "@/lib/db";
import Admin from "@/models/Admin";
import { verifySession } from "@/lib/auth";
import SetupForm from "./SetupForm";

export const dynamic = "force-dynamic";

// Mirrors the /api/auth/setup rule: the very first admin can be created
// without a session (bootstrap); once any admin exists, only a logged-in
// admin may open this page to create another.
export default async function SetupPage() {
  await dbConnect();
  const adminCount = await Admin.countDocuments();
  const token = (await cookies()).get("admin_session")?.value;
  const session = token ? await verifySession(token) : null;

  // Admin cap (2) reached: the page is closed for everyone, logged in or not.
  if (adminCount >= 2) {
    redirect(session ? "/admin" : "/admin/login");
  }

  // Admins exist but below cap: only a logged-in admin may add another.
  if (adminCount > 0 && !session) {
    redirect("/admin/login");
  }

  return <SetupForm />;
}
