import Teacher from "@/models/Teacher";
import { nameRegex, normalizePhone } from "@/lib/matching";

export const DUPLICATE_MENTOR_MESSAGE =
  "This mentor is already registered. Please check the Mentors Directory before adding.";

/**
 * A mentor is a duplicate only when the name AND the phone number both match.
 * Two people sharing one phone (e.g. a couple) have different names, so they
 * both register fine. Phone is compared in normalized form because stored
 * values vary between "0803...", "234803..." and "+234803...".
 */
export async function isDuplicateMentor(
  firstName: string,
  lastName: string,
  phone: string | undefined
) {
  const sameNameMentors = await Teacher.find({
    firstName: nameRegex(firstName),
    lastName: nameRegex(lastName),
  });

  const incomingPhone = normalizePhone(phone);
  return sameNameMentors.some(
    (existing) => normalizePhone(existing.phone) === incomingPhone
  );
}
