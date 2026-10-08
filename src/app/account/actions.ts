"use server";

import { revalidatePath } from "next/cache";

import { auth, signOut } from "@/auth";
import { cancelBooking, isStaySaved, setStaySaved } from "@/lib/db/queries";

/**
 * Whether the visitor has saved this house. `null` means nobody is signed in —
 * the button then offers to sign in rather than pretending to save.
 */
export async function savedState(slug: string): Promise<boolean | null> {
  const session = await auth();
  if (!session?.user) return null;
  return isStaySaved(session.user.id, slug);
}

/** Save or unsave a house for the signed-in visitor. Returns the new state. */
export async function toggleSaved(slug: string, saved: boolean): Promise<boolean | null> {
  const session = await auth();
  if (!session?.user) return null;
  await setStaySaved(session.user.id, slug, saved);
  revalidatePath("/account");
  return saved;
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}

/** Cancel one of the visitor's own upcoming stays; the nights reopen at once. */
export async function cancelStay(form: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) return;
  const id = String(form.get("id") ?? "");
  if (!id) return;
  await cancelBooking(session.user.id, id);
  revalidatePath("/account");
  revalidatePath("/admin");
}
