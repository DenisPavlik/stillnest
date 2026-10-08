"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { bookingsInside, deleteBlock, houses, insertBlock } from "@/lib/db/admin";
import { isCalendarDate } from "@/lib/dates";
import { formatShortDay } from "@/lib/format";

/* Every action re-checks the role. The layout hides the page; it does not
   stop a POST, and a server action is a POST anyone can make. */
async function requireAdmin(): Promise<void> {
  const session = await auth();
  if (session?.user.role !== "admin") throw new Error("Not found");
}

export interface CloseState {
  ok: boolean;
  message: string | null;
}

const REASONS = ["maintenance", "owner", "hold"] as const;

export async function closeDates(_: CloseState, form: FormData): Promise<CloseState> {
  await requireAdmin();

  const slug = String(form.get("house") ?? "");
  const startsOn = String(form.get("from") ?? "");
  const endsOn = String(form.get("reopens") ?? "");
  const reason = String(form.get("reason") ?? "");
  const note = String(form.get("note") ?? "").trim() || null;

  const house = (await houses()).find((h) => h.slug === slug);
  if (!house) return { ok: false, message: "Pick a house." };
  if (!isCalendarDate(startsOn) || !isCalendarDate(endsOn)) {
    return { ok: false, message: "Both dates are needed." };
  }
  if (endsOn <= startsOn) {
    return { ok: false, message: "It has to reopen after the first closed night." };
  }
  if (!REASONS.includes(reason as (typeof REASONS)[number])) {
    return { ok: false, message: "Pick a reason." };
  }

  // Half-open, like every range here: reopening on the day a guest arrives
  // is not a clash, and the overlap test says so.
  const clash = await bookingsInside(house.id, startsOn, endsOn);
  if (clash.length > 0) {
    const who = clash
      .map((b) => `${b.guest ?? "a guest"} (${formatShortDay(b.checkIn)} – ${formatShortDay(b.checkOut)})`)
      .join(", ");
    return {
      ok: false,
      message: `${house.name} has ${clash.length === 1 ? "a stay" : "stays"} in those dates: ${who}. Move or cancel ${clash.length === 1 ? "it" : "them"} first.`,
    };
  }

  await insertBlock({
    propertyId: house.id,
    startsOn,
    endsOn,
    reason: reason as (typeof REASONS)[number],
    note,
  });
  revalidatePath("/admin");
  revalidatePath(`/stays/${house.slug}`);
  return { ok: true, message: `${house.name} closed.` };
}

export async function reopen(form: FormData): Promise<void> {
  await requireAdmin();
  const id = String(form.get("id") ?? "");
  if (!id) return;
  await deleteBlock(id);
  revalidatePath("/admin");
}
