"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { PythonApiError, checkAvailability } from "@/lib/api/client";
import { createBooking } from "@/lib/db/queries";
import { isCalendarDate } from "@/lib/dates";

/* ==================================================================== *
 *  RESERVE — a stay written to the calendar, with no money in it.
 *
 *  Stillnest is a concept; there is no checkout. What is real is the
 *  part a portfolio should show: the engine prices the stay again on
 *  the server — the number the browser displayed is never trusted —
 *  and the database decides whether the nights are free. Two people
 *  pressing Reserve on the same nights in the same second is settled by
 *  the EXCLUDE constraint, not by anything in this file.
 * ==================================================================== */

export type ReserveResult =
  | { state: "confirmed"; nights: number; totalCents: number }
  | { state: "signin" }
  | { state: "refused"; message: string }
  | { state: "taken" }
  | { state: "offline" };

/** Postgres SQLSTATE for an exclusion-constraint violation. */
const EXCLUSION_VIOLATION = "23P01";

function sqlState(error: unknown): string | undefined {
  for (let e: unknown = error; e && typeof e === "object"; e = (e as { cause?: unknown }).cause) {
    const code = (e as { code?: unknown }).code;
    if (typeof code === "string") return code;
  }
  return undefined;
}

export async function reserve(input: {
  propertyId: string;
  slug: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  acknowledged: boolean;
}): Promise<ReserveResult> {
  const session = await auth();
  if (!session?.user) return { state: "signin" };

  const { propertyId, slug, checkIn, checkOut, guests } = input;
  if (!input.acknowledged) {
    return { state: "refused", message: "Tick the box first — it is the whole agreement." };
  }
  if (!isCalendarDate(checkIn) || !isCalendarDate(checkOut) || checkOut <= checkIn) {
    return { state: "refused", message: "Those dates do not describe a stay." };
  }
  if (!Number.isInteger(guests) || guests < 1) {
    return { state: "refused", message: "At least one person has to go." };
  }

  let quote;
  try {
    quote = await checkAvailability({
      property_id: propertyId,
      check_in: checkIn,
      check_out: checkOut,
      guests,
    });
  } catch (error) {
    if (error instanceof PythonApiError) return { state: "offline" };
    throw error;
  }
  if (!quote.available) {
    return {
      state: "refused",
      message: "Those nights are no longer open. Pick the dates again and the panel will say why.",
    };
  }

  try {
    await createBooking({
      propertyId,
      userId: session.user.id,
      checkIn,
      checkOut,
      guests,
      subtotalCents: quote.subtotal_cents,
      feesCents: quote.fees_cents,
    });
  } catch (error) {
    if (sqlState(error) === EXCLUSION_VIOLATION) return { state: "taken" };
    throw error;
  }

  revalidatePath("/account");
  revalidatePath("/admin");
  revalidatePath(`/stays/${slug}`);
  return { state: "confirmed", nights: quote.nights.length, totalCents: quote.total_cents };
}
