import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { auth } from "@/auth";
import { FilmGrain } from "@/components/film-grain";
import { Reveal } from "@/components/motion/reveal";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { StayCard } from "@/components/stay-card";
import { savedStaysFor } from "@/lib/db/queries";
import { numberWord } from "@/lib/format";

import { signOutAction } from "./actions";
import s from "./account.module.css";

export const metadata: Metadata = {
  title: "Your account — Stillnest",
  robots: { index: false },
};

/* ==================================================================== *
 *  ACCOUNT — who you are, what you kept, where you are going.
 *
 *  "Your stays" is honest about being empty: checkout is the phase that
 *  fills it, and until then a placeholder list would be the site
 *  inventing bookings for the one person who would know they are fake.
 * ==================================================================== */

export default async function AccountPage(): Promise<ReactNode> {
  const session = await auth();
  if (!session?.user) redirect("/signin?callbackUrl=/account");

  const saved = await savedStaysFor(session.user.id);
  const first = session.user.name?.split(" ")[0];

  return (
    <main className={s.page}>
      <FilmGrain />
      <SiteNav variant="bar" />

      <div className={s.shell}>
        <Reveal as="header" className={s.head} distance={14}>
          <div className={s.who}>
            {session.user.image ? (
              <span className={s.portrait}>
                {/* eslint-disable-next-line @next/next/no-img-element -- a remote avatar at 64 px */}
                <img src={session.user.image} alt="" width={58} height={58} referrerPolicy="no-referrer" />
              </span>
            ) : null}
            <div>
              <p className={s.eyebrow}>Your account</p>
              <h1 className={s.title}>{first ? `Welcome back, ${first}.` : "Welcome back."}</h1>
            </div>
          </div>
          <div className={s.actions}>
            {session.user.role === "admin" ? (
              <Link href="/admin" className={s.ledgerLink}>
                Open the ledger →
              </Link>
            ) : null}
            <form action={signOutAction}>
              <button type="submit" className={s.signOut}>
                Sign out
              </button>
            </form>
          </div>
        </Reveal>

        <section className={s.block}>
          <div className={s.blockHead}>
            <h2 className={s.blockTitle}>Saved houses</h2>
            {saved.length > 0 ? (
              <span className={s.count}>
                {numberWord(saved.length)} kept
              </span>
            ) : null}
          </div>

          {saved.length > 0 ? (
            <Reveal as="ul" className={s.cards} stagger={0.08}>
              {saved.map((stay) => (
                <StayCard key={stay.slug} stay={stay} />
              ))}
            </Reveal>
          ) : (
            <p className={s.empty}>
              Nothing kept yet. Every house has a <em>Save</em> beside its name — the ones you
              would actually go to will collect here. <Link href="/stays">Start with the houses.</Link>
            </p>
          )}
        </section>

        <section className={s.block}>
          <div className={s.blockHead}>
            <h2 className={s.blockTitle}>Your stays</h2>
          </div>
          <p className={s.empty}>
            None yet. Reservations open with checkout — and even then, this is a concept: no
            house here can really be booked, and no money moves.
          </p>
        </section>
      </div>

      <SiteFooter />
    </main>
  );
}
