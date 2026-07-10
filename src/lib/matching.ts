// Helpers for detecting duplicate people across differently-formatted input.
// Phone numbers in the database exist as "08071668236", "+2348185506510" and
// "2347037179392", so raw string comparison is not enough.

export function escapeRegExp(value: string) {
  if (!value) return "";
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Collapses Nigerian phone formats to a single comparable form: 0XXXXXXXXXX. */
export function normalizePhone(phone: string | undefined | null) {
  const digits = (phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("234")) return "0" + digits.slice(3);
  if (digits.startsWith("0")) return digits;
  return "0" + digits;
}

/** Case-insensitive, whitespace-tolerant exact match on a name. */
export function nameRegex(value: string) {
  return new RegExp(`^${escapeRegExp((value || "").trim())}$`, "i");
}

/** True when two dates fall on the same calendar day (ignores time component). */
export function isSameDay(a: Date | string | undefined, b: Date | string | undefined) {
  if (!a || !b) return false;
  const d1 = new Date(a);
  const d2 = new Date(b);
  if (Number.isNaN(d1.getTime()) || Number.isNaN(d2.getTime())) return false;
  return d1.toISOString().slice(0, 10) === d2.toISOString().slice(0, 10);
}
