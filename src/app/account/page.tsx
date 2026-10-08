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
import { savedStaysFor, staysFor } from "@/lib/db/queries";
import { todayIso } from "@/lib/dates";
import { formatPriceUsd, formatShortDay, nightsWord, numberWord } from "@/lib/format";

import { cancelStay, signOutAction } from "./actions";
import s from "./account.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your account — Stillnest",
  robots: { index: false },
};

/* ==================================================================== *
 *  ACCOUNT — who you are, what you kept, where you are going.
 *
 *  "Your stays" lists what the Reserve button wrote — real rows, no
 *  payment behind them, and the guest can cancel anything still ahead.
 * ==================================================================== */

export default async function AccountPage(): Promise<ReactNode> {
  const session = await auth();
  if (!session?.user) redirect("/signin?callbackUrl=/account");

  const [saved, stays] = await Promise.all([
    savedStaysFor(session.user.id),
    staysFor(session.user.id),
  ]);
  const today = todayIso();
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
          {stays.length > 0 ? (
            <ul className={s.stays}>
              {stays.map((st) => {
                const ahead = st.checkIn > today && st.status === "confirmed";
                return (
                  <li key={st.id} className={s.stay} data-cancelled={st.status === "cancelled" ? "" : undefined}>
                    <div>
                      <Link className={s.stayHouse} href={`/stays/${st.slug}`}>
                        {st.house}
                      </Link>
                      <p className={s.stayWhere}>
                        {st.region}, {st.country}
                      </p>
                    </div>
                    <p className={s.stayDates}>
                      {formatShortDay(st.checkIn)} – {formatShortDay(st.checkOut)}
                      <span>
                        {nightsWord(st.nights)} · {numberWord(st.guests)}{" "}
                        {st.guests === 1 ? "person" : "people"}
                      </span>
                    </p>
                    <p className={s.stayTotal}>
                      {formatPriceUsd(st.totalCents)}
                      <span>{st.status === "cancelled" ? "cancelled" : "not charged"}</span>
                    </p>
                    {ahead ? (
                      <form action={cancelStay}>
                        <input type="hidden" name="id" value={st.id} />
                        <button type="submit" className={s.signOut}>
                          Cancel
                        </button>
                      </form>
                    ) : (
                      <span />
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className={s.empty}>
              None yet. Pick dates on any house and press Reserve — no payment is taken, this is
              a concept, but the stay is written to the calendar for real.
            </p>
          )}
        </section>
      </div>

      <SiteFooter />
    </main>
  );
}
