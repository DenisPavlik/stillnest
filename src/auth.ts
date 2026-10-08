import "server-only";

import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import NextAuth, { type DefaultSession } from "next-auth";
import Google from "next-auth/providers/google";

import { db } from "@/lib/db";
import { accounts, profiles, sessions, users, verificationTokens } from "@/lib/db/schema";

/* ==================================================================== *
 *  AUTH — Google, and nothing else.
 *
 *  One provider on purpose: a visitor who wants to save a house should
 *  be one click from it, and a password form on a site that cannot take
 *  a booking would be ceremony. Magic-link email was cut on 2026-10-08
 *  with the rest of the scope that does not show in a portfolio.
 *
 *  Database sessions, not JWT: the adapter's tables already exist, a
 *  session can be revoked by deleting a row, and the role — which lives
 *  on `profiles`, never on the token — is read fresh on every request.
 * ==================================================================== */

declare module "next-auth" {
  interface Session {
    user: { id: string; role: "guest" | "admin" } & DefaultSession["user"];
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [Google],
  session: { strategy: "database" },
  pages: { signIn: "/signin" },
  events: {
    // The adapter owns `users`; everything that is ours about a person goes on
    // `profiles`, created here so no other code ever has to ask whether it exists.
    // Role defaults to guest. Admin is promoted by hand, in SQL, on purpose.
    async createUser({ user }) {
      if (!user.id) return;
      await db
        .insert(profiles)
        .values({ userId: user.id, fullName: user.name ?? null })
        .onConflictDoNothing();
    },
  },
  callbacks: {
    async session({ session, user }) {
      const [profile] = await db
        .select({ role: profiles.role })
        .from(profiles)
        .where(eq(profiles.userId, user.id));
      session.user.id = user.id;
      session.user.role = profile?.role ?? "guest";
      return session;
    },
  },
});
