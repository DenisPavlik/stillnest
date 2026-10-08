import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { auth } from "@/auth";

export const metadata: Metadata = {
  title: "The ledger — Stillnest",
  robots: { index: false, follow: false },
};

/**
 * The one gate in front of everything under /admin.
 *
 * Anyone who is not an admin gets the site's ordinary 404 — not a sign-in
 * prompt, not "forbidden". A page that announces it exists and refuses you
 * has already told you something.
 */
export default async function AdminLayout({ children }: LayoutProps<"/admin">): Promise<ReactNode> {
  const session = await auth();
  if (session?.user.role !== "admin") notFound();
  return children;
}
