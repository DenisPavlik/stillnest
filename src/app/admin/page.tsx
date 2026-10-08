import type { CSSProperties, ReactNode } from "react";

import { FilmGrain } from "@/components/film-grain";
import { Reveal } from "@/components/motion/reveal";
import { SiteNav } from "@/components/site-nav";
import { LIVE, blocks, houses, ledger, type LedgerRow } from "@/lib/db/admin";
import { addDays, nightCount, rangesOverlap, todayIso } from "@/lib/dates";
import { formatClosedRange, formatPriceUsd, formatShortDay } from "@/lib/format";

import { reopen } from "./actions";
import s from "./admin.module.css";
import { CloseForm } from "./close-form";

/* ==================================================================== *
 *  THE LEDGER — who is where, and when.
 *
 *  One page, read top to bottom the way an owner checks in on the
 *  houses: four numbers, the season as a picture, the names, and the
 *  dates nobody can have. Every figure is computed from the same rows
 *  the table prints, so the summary and the detail cannot disagree.
 *
 *  The bookings are a demonstration set (scripts/demo_bookings.py) —
 *  priced by the real engine, guarded by the real constraint, for guests
 *  who do not exist. The page says so, once, at the top.
 * ==================================================================== */

export const dynamic = "force-dynamic";

const BEFORE = 7;
const SPAN = 63;

const REASON: Record<string, string> = {
  maintenance: "Work",
  owner: "Owner",
  hold: "Hold",
};

const STATUS: Record<LedgerRow["status"], string> = {
  confirmed: "Confirmed",
  pending: "Held",
  cancelled: "Cancelled",
  expired: "Expired",
};

function surname(name: string | null): string {
  return name?.split(" ").slice(-1)[0] ?? "Guest";
}

/** Nights of `[a, b)` that fall inside `[from, to)`. */
function nightsWithin(a: string, b: string, from: string, to: string): number {
  const start = a > from ? a : from;
  const end = b < to ? b : to;
  return Math.max(0, nightCount(start, end));
}

export default async function AdminPage(): Promise<ReactNode> {
  const [rows, houseList, closures] = await Promise.all([ledger(), houses(), blocks()]);

  const today = todayIso();
  const from = addDays(today, -BEFORE);
  const to = addDays(from, SPAN);
  const month = addDays(today, 30);

  const live = rows.filter((r) => (LIVE as readonly string[]).includes(r.status));

  /* ---- the four numbers ---- */
  const bookedNights = live.reduce((n, r) => n + nightsWithin(r.checkIn, r.checkOut, today, month), 0);
  const occupancy = Math.round((bookedNights / (houseList.length * 30)) * 100);
  const inResidence = live.filter((r) => r.checkIn <= today && today < r.checkOut);
  const arriving = live.filter((r) => r.checkIn >= today && r.checkIn < addDays(today, 7));
  const ahead = live
    .filter((r) => r.status === "confirmed" && r.checkIn >= today && r.checkIn < month)
    .reduce((c, r) => c + r.totalCents, 0);

  /* ---- the calendar ---- */
  const days = Array.from({ length: SPAN }, (_, i) => addDays(from, i));
  const at = (iso: string) => Math.max(0, Math.min(SPAN, nightCount(from, iso)));

  const upcoming = rows.filter((r) => r.checkOut > today).slice(0, 24);
  const departed = rows.filter((r) => r.checkOut <= today).reverse().slice(0, 12);

  return (
    <main className={s.page}>
      <FilmGrain />
      <SiteNav variant="bar" />

      <div className={s.shell}>
        <Reveal as="header" className={s.head} stagger={0.08} distance={14}>
          <p className={s.eyebrow}>The ledger · admin</p>
          <h1 className={s.title}>Who is where, and when.</h1>
          <p className={s.lede}>
            Twelve houses, the next nine weeks, and everyone in them. The guests here are a
            demonstration set — priced by the same engine as the booking panel and held to the same
            database constraint, for people who do not exist.
          </p>
        </Reveal>

        {/* ============================ NUMBERS ============================ */}
        <Reveal as="dl" className={s.stats} stagger={0.07} distance={12}>
          <div className={s.stat}>
            <dt>Occupancy</dt>
            <dd>
              {occupancy}
              <small>%</small>
            </dd>
            <span>next 30 nights, all houses</span>
          </div>
          <div className={s.stat}>
            <dt>In residence</dt>
            <dd>{inResidence.length}</dd>
            <span>
              {inResidence.length === 0
                ? "every house empty tonight"
                : inResidence.map((r) => r.house.split(" ")[0]).join(" · ")}
            </span>
          </div>
          <div className={s.stat}>
            <dt>Arriving</dt>
            <dd>{arriving.length}</dd>
            <span>in the next seven days</span>
          </div>
          <div className={s.stat}>
            <dt>Ahead</dt>
            <dd className={s.money}>{formatPriceUsd(ahead)}</dd>
            <span>confirmed, arriving within 30 days</span>
          </div>
        </Reveal>

        {/* ============================ CALENDAR =========================== */}
        <section className={s.block}>
          <div className={s.blockHead}>
            <h2 className={s.blockTitle}>The season</h2>
            <p className={s.legend}>
              <span className={s.keyStay} /> stay <span className={s.keyClosed} /> closed
              <span className={s.keyToday} /> today
            </p>
          </div>

          <div className={s.calendarScroll}>
            <div className={s.calendar} style={{ "--days": SPAN } as CSSProperties}>
              <div className={s.calHead}>
                <span className={s.calCorner} />
                <div className={s.calDays}>
                  {days.map((d) => {
                    const [, , dd] = d.split("-");
                    const weekday = new Date(`${d}T00:00:00Z`).getUTCDay();
                    const first = dd === "01" || d === from;
                    return (
                      <span
                        key={d}
                        className={s.calDay}
                        data-weekend={weekday === 0 || weekday === 6 ? "" : undefined}
                        data-today={d === today ? "" : undefined}
                      >
                        {first ? <em>{formatShortDay(d).split(" ")[2]}</em> : null}
                        {Number(dd)}
                      </span>
                    );
                  })}
                </div>
              </div>

              {houseList.map((h) => {
                const stays = live.filter(
                  (r) => r.slug === h.slug && rangesOverlap(r.checkIn, r.checkOut, from, to),
                );
                const shut = closures.filter(
                  (c) => c.slug === h.slug && rangesOverlap(c.startsOn, c.endsOn, from, to),
                );
                return (
                  <div key={h.slug} className={s.calRow}>
                    <a className={s.calHouse} href={`/stays/${h.slug}`}>
                      {h.name}
                    </a>
                    <div className={s.calTrack}>
                      {shut.map((c) => (
                        <span
                          key={c.id}
                          className={s.calClosed}
                          style={{
                            left: `${(at(c.startsOn) / SPAN) * 100}%`,
                            width: `${((at(c.endsOn) - at(c.startsOn)) / SPAN) * 100}%`,
                          }}
                          title={`${REASON[c.reason]}: ${formatClosedRange(c.startsOn, c.endsOn)}`}
                        />
                      ))}
                      {stays.map((r) => {
                        const left = at(r.checkIn);
                        const width = at(r.checkOut) - left;
                        return (
                          <span
                            key={r.id}
                            className={s.calStay}
                            data-held={r.status === "pending" ? "" : undefined}
                            data-cut-left={r.checkIn < from ? "" : undefined}
                            style={{
                              left: `${(left / SPAN) * 100}%`,
                              width: `${(width / SPAN) * 100}%`,
                            }}
                            title={`${r.guest ?? "Guest"} · ${formatShortDay(r.checkIn)} – ${formatShortDay(r.checkOut)} · ${formatPriceUsd(r.totalCents)}`}
                          >
                            {width >= 3 ? <b>{surname(r.guest)}</b> : null}
                          </span>
                        );
                      })}
                      <span
                        className={s.calNow}
                        style={{ left: `${((BEFORE + 0.5) / SPAN) * 100}%` }}
                        aria-hidden="true"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ============================= LEDGER ============================ */}
        <section className={s.block}>
          <div className={s.blockHead}>
            <h2 className={s.blockTitle}>Bookings</h2>
            <span className={s.count}>{live.length} live · {rows.length - live.length} cancelled</span>
          </div>

          <div className={s.tableScroll}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>Guest</th>
                  <th>House</th>
                  <th>Stay</th>
                  <th className={s.num}>Nights</th>
                  <th className={s.num}>Party</th>
                  <th className={s.num}>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr className={s.group}>
                  <td colSpan={7}>In residence and arriving</td>
                </tr>
                {upcoming.map((r) => (
                  <LedgerLine key={r.id} row={r} today={today} />
                ))}
                <tr className={s.group}>
                  <td colSpan={7}>Departed</td>
                </tr>
                {departed.map((r) => (
                  <LedgerLine key={r.id} row={r} today={today} />
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ============================ CLOSURES =========================== */}
        <section className={s.block}>
          <div className={s.blockHead}>
            <h2 className={s.blockTitle}>Closed dates</h2>
            <span className={s.count}>{closures.length} on the calendar</span>
          </div>

          <div className={s.closures}>
            <ul className={s.closureList}>
              {closures.map((c) => (
                <li key={c.id} className={s.closure}>
                  <div>
                    <p className={s.closureHouse}>{c.house}</p>
                    <p className={s.closureWhen}>{formatClosedRange(c.startsOn, c.endsOn)}</p>
                    {c.note ? <p className={s.closureNote}>{c.note}</p> : null}
                  </div>
                  <span className={s.reason}>{REASON[c.reason]}</span>
                  <form action={reopen}>
                    <input type="hidden" name="id" value={c.id} />
                    <button type="submit" className={s.ghost}>
                      Reopen
                    </button>
                  </form>
                </li>
              ))}
            </ul>

            <div className={s.closePanel}>
              <p className={s.panelHead}>Close a house</p>
              <CloseForm houses={houseList} today={today} />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function LedgerLine({ row, today }: { row: LedgerRow; today: string }): ReactNode {
  const here = row.checkIn <= today && today < row.checkOut && row.status !== "cancelled";
  return (
    <tr data-cancelled={row.status === "cancelled" ? "" : undefined}>
      <td>
        <span className={s.guest}>{row.guest ?? "Guest"}</span>
        <span className={s.email}>{row.email}</span>
      </td>
      <td>
        <a className={s.houseLink} href={`/stays/${row.slug}`}>
          {row.house}
        </a>
      </td>
      <td className={s.dates}>
        {formatShortDay(row.checkIn)} – {formatShortDay(row.checkOut)}
      </td>
      <td className={s.num}>{row.nights}</td>
      <td className={s.num}>{row.guests}</td>
      <td className={`${s.num} ${s.total}`}>{formatPriceUsd(row.totalCents)}</td>
      <td>
        <span className={s.status} data-status={here ? "here" : row.status}>
          {here ? "In residence" : STATUS[row.status]}
        </span>
      </td>
    </tr>
  );
}
