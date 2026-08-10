"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

import {
  OFFLINE_MESSAGE,
  isAvailabilityAnswer,
  type AvailabilityAnswer,
} from "@/lib/api/answer";
import { prefersReducedMotion } from "@/components/motion/prefers-reduced";
import type { AvailabilityResponse } from "@/lib/api/contracts";
import { nextDay, nightCount, rangesOverlap } from "@/lib/dates";
import {
  bedroomsWord,
  capitalise,
  formatPriceEur,
  formatShortDay,
  nightsWord,
  numberWord,
} from "@/lib/format";

import s from "./booking-panel.module.css";

/* ==================================================================== *
 *  THE BOOKING PANEL.
 *
 *  Two dates and a number of people, answered by the engine — never by
 *  this file. Nothing here multiplies a rate by a count: the nightly
 *  breakdown, the subtotal and the total all arrive as integer cents and
 *  are only ever formatted. The browser is not allowed to do arithmetic
 *  on money, and a rounding error introduced here is the one nobody
 *  would think to look for.
 *
 *  Four honest states and no fifth:
 *
 *    resting   no dates yet — the base rate, and what it does not include
 *    free      the nights, each at its own rate, then subtotal and total
 *    refused   the specific reason, one sentence per reason
 *    offline   the engine did not answer, and this panel will not guess
 *
 *  The reserve control is disabled in all four. Checkout is the next
 *  phase; until it exists nothing here may imply a date can be held —
 *  least of all on the screen where a visitor most wants to believe
 *  otherwise.
 * ==================================================================== */

/** ~a quarter second: long enough that typing a date is one request, not four. */
const SETTLE_MS = 260;

export interface Closure {
  /** Half-open `[startsOn, endsOn)`, the same range the block is stored as. */
  startsOn: string;
  endsOn: string;
  /**
   * Already in the brand's voice, composed on the server where the rest of the
   * page's copy lives — the dates, the reason, and the owner's own note.
   *
   * This is why the panel takes closures at all. The engine answers "blocked",
   * a machine word covering six different situations; the page already knows
   * that this house is shut because the road is not cleared until April.
   * Printing "unavailable" over the top of that throws away the only sentence a
   * guest can act on.
   */
  sentence: string;
}

export interface BookingPanelProps {
  /** The database id — the engine keys on it, not on the slug. */
  propertyId: string;
  basePriceCents: number;
  /** The house's own minimum. A season can raise it; only the engine knows that. */
  minNights: number;
  capacity: number;
  bedrooms: number;
  closures: readonly Closure[];
  /** Applied to the panel's own shell, so the page keeps control of placement. */
  className?: string;
}

/** An answer, tagged with the question it answers. See the effect below. */
interface Result {
  key: string;
  answer: AvailabilityAnswer;
}

export function BookingPanel({
  propertyId,
  basePriceCents,
  minNights,
  capacity,
  bedrooms,
  closures,
  className,
}: BookingPanelProps): ReactNode {
  const id = useId();
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(1);
  const [result, setResult] = useState<Result | null>(null);

  const today = useSyncExternalStore(neverChanges, browserToday, noServerToday);

  /* The question, as one string. Every piece of what is rendered below is
     derived from it rather than stored: "we are checking" is simply "the answer
     we hold is not the answer to this question". That makes a stale reply
     structurally unable to land on a newer question — the class of bug where a
     slow response for last week's dates overwrites this week's price. */
  const asked = Boolean(checkIn && checkOut);
  const key = `${checkIn}|${checkOut}|${guests}`;
  const answer = result?.key === key ? result.answer : null;
  const checking = asked && answer === null;

  useEffect(() => {
    if (!asked) return;

    const controller = new AbortController();

    const timer = setTimeout(() => {
      void (async () => {
        let received: AvailabilityAnswer = { state: "offline", message: OFFLINE_MESSAGE };

        try {
          const response = await fetch("/api/availability", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              property_id: propertyId,
              check_in: checkIn,
              check_out: checkOut,
              guests,
            }),
            signal: controller.signal,
          });

          const body: unknown = await response.json();
          /* An answer we cannot read is the same situation as no answer — which
             is what `received` already holds. Anything looser risks rendering
             `undefined` in the place a price goes. */
          if (isAvailabilityAnswer(body)) received = body;
        } catch {
          // network refused, or a body that was not JSON: offline, as above.
        }

        if (controller.signal.aborted) return;
        setResult({ key, answer: received });
      })();
    }, SETTLE_MS);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [asked, key, propertyId, checkIn, checkOut, guests]);

  const nightsAsked = asked ? nightCount(checkIn, checkOut) : 0;

  /* ---------------------------- the motion ----------------------------
     Two jobs, and the first one is not decoration.

     1. NOTHING JUMPS. Every state this panel can be in is a different
        height — three lines of resting copy, one line of "checking", a
        month of nights — and each swap moved everything below the answer
        by up to a couple of hundred pixels in a single frame. The controls
        themselves sit ABOVE the answer and so never move; the reserve
        control below it did, and a control that teleports out from under a
        cursor mid-click is a bug, not a polish item. The region is measured
        before and after each change and tweened between the two, so the
        panel opens and closes instead of snapping.

     2. THE ANSWER IS NOTICED. When a date changes and the engine returns a
        different price, the figures used to be replaced in place — the same
        panel, quietly holding different numbers. The nightly rows and the
        totals come in on a short stagger so a changed answer registers as
        having changed, and it is over well before anyone could read it.

     The whole thing is keyed on what is rendered, not on the fetch, so a
     stale reply that never lands on screen never animates either. --------- */
  const panelRef = useRef<HTMLElement>(null);
  const answerRef = useRef<HTMLDivElement>(null);
  const answerHeight = useRef<number | null>(null);

  /* The panel's own arrival, done from inside rather than by wrapping it in
     <Reveal> on the page: this element is `position: sticky`, and a wrapper
     no taller than the panel would leave sticky nothing to travel inside. */
  useGSAP(
    () => {
      const el = panelRef.current;
      if (!el) return;
      if (prefersReducedMotion()) return;

      gsap.from(el, {
        opacity: 0,
        y: 18,
        duration: 0.9,
        ease: "power2.out",
        scrollTrigger: { trigger: el, start: "top 88%", once: true },
      });
    },
    { dependencies: [] },
  );

  useGSAP(
    () => {
      const el = answerRef.current;
      if (!el) return;
      if (prefersReducedMotion()) return;

      const previous = answerHeight.current;

      /* Measure the new state at its NATURAL height, with any height tween
         from the previous answer killed first — otherwise a fast second
         change measures a frame of the first animation and the error
         compounds until the panel is the wrong size. */
      gsap.killTweensOf(el);
      gsap.set(el, { clearProps: "height,overflow" });
      const height = el.offsetHeight;
      answerHeight.current = height;

      /* WHILE CHECKING, THE PANEL HOLDS ITS SHAPE.

         "Checking those dates…" is one short line where three lines of copy
         used to be, so the honest measurement says shrink — and then the
         answer lands a quarter of a second later and says grow, by twice as
         much. Everything below reversed direction mid-flight for no reason
         the visitor could see. The region keeps the height it already had
         until there is something to show, and then moves once. */
      if (checking && previous !== null && height < previous) {
        gsap.set(el, { height: previous, overflow: "hidden" });
        answerHeight.current = previous;
        return;
      }

      const timeline = gsap.timeline();

      // First render has nothing to travel from: it is simply the panel.
      if (previous !== null && Math.abs(previous - height) > 2) {
        timeline.fromTo(
          el,
          { height: previous, overflow: "hidden" },
          {
            height,
            duration: 0.34,
            ease: "power2.out",
            clearProps: "height,overflow",
          },
          0,
        );
      }

      const rows = gsap.utils.toArray<HTMLElement>(
        [`.${s.night}`, `.${s.totals} > div`, `.${s.reasons} li`].join(", "),
        el,
      );

      if (rows.length > 0) {
        timeline.from(
          rows,
          {
            opacity: 0,
            y: 6,
            duration: 0.3,
            ease: "power2.out",
            /* `amount` caps the whole cascade rather than the step: a month
               in deep winter is thirty rows, and thirty times a per-row
               delay would still be arriving after the reader got there. */
            stagger: { each: 0.03, amount: 0.24 },
          },
          0.04,
        );
      }
    },
    { dependencies: [asked, checking, answer] },
  );

  return (
    <aside
      ref={panelRef}
      className={className ? `${s.panel} ${className}` : s.panel}
      id="reserve"
      aria-labelledby={`${id}-heading`}
    >
      <h3 className={s.head} id={`${id}-heading`}>
        Reserve
      </h3>

      <p className={s.price}>
        {formatPriceEur(basePriceCents)}
        <i>&nbsp;/ night</i>
      </p>

      <dl className={s.facts}>
        <div>
          <dt>Minimum stay</dt>
          <dd>{capitalise(nightsWord(minNights))}</dd>
        </div>
        <div>
          <dt>Sleeps</dt>
          <dd>
            {capitalise(numberWord(capacity))} · {bedroomsWord(bedrooms)}
          </dd>
        </div>
      </dl>

      {/* ------------------------------ the ask ------------------------------ */}
      <div className={s.form}>
        <div className={s.dates}>
          <p className={s.field}>
            <label className={s.label} htmlFor={`${id}-in`}>
              Arrive
            </label>
            <input
              className={s.control}
              id={`${id}-in`}
              type="date"
              value={checkIn}
              min={today ?? undefined}
              onChange={(event) => setCheckIn(event.target.value)}
            />
          </p>

          <p className={s.field}>
            <label className={s.label} htmlFor={`${id}-out`}>
              Leave
            </label>
            <input
              className={s.control}
              id={`${id}-out`}
              type="date"
              value={checkOut}
              min={checkIn ? nextDay(checkIn) : (today ?? undefined)}
              onChange={(event) => setCheckOut(event.target.value)}
            />
          </p>
        </div>

        <p className={s.field}>
          <label className={s.label} htmlFor={`${id}-guests`}>
            People
          </label>
          <select
            className={s.control}
            id={`${id}-guests`}
            value={guests}
            onChange={(event) => setGuests(Number(event.target.value))}
          >
            {Array.from({ length: capacity }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n === 1 ? "One person" : `${capitalise(numberWord(n))} people`}
              </option>
            ))}
          </select>
        </p>
      </div>

      {/* --------------------------- what came back ---------------------------
          One region, always present, announced on change: a screen reader hears
          the answer arrive instead of discovering it by exploring. */}
      <div className={s.answer} ref={answerRef} aria-live="polite" aria-busy={checking}>
        {!asked ? (
          <p className={s.resting}>
            Pick two dates. The rate above is the base rate — a season can raise it,
            and this panel prices the stay night by night rather than averaging it.
          </p>
        ) : null}

        {checking ? <p className={s.checking}>Checking those dates…</p> : null}

        {answer?.state === "ok" ? (
          answer.quote.available ? (
            <Free quote={answer.quote} />
          ) : (
            <Refused
              quote={answer.quote}
              sentences={refusals(
                answer.quote,
                nightsAsked,
                checkIn,
                checkOut,
                capacity,
                closures,
              )}
            />
          )
        ) : null}

        {answer?.state === "invalid" ? (
          <p className={s.resting}>{answer.message}</p>
        ) : null}

        {answer?.state === "offline" ? (
          <div className={s.offline}>
            <p className={s.offlineHead}>Availability is offline</p>
            <p className={s.offlineBody}>{answer.message}</p>
          </div>
        ) : null}
      </div>

      <button className={s.reserve} type="button" disabled aria-describedby={`${id}-note`}>
        Reserve — not open
      </button>

      <p className={s.note} id={`${id}-note`}>
        Reserve is wired to nothing. Checkout comes next; until it does, no button on
        this page can take a night off the calendar.
      </p>

      <p className={s.fine}>
        And plainly: Stillnest is a concept project — this house is fictional, nothing
        here can be booked, and no money moves anywhere.
      </p>
    </aside>
  );
}

/* ------------------------------- today ------------------------------- *
 *  Read from the browser, never from the server.
 *
 *  This page is prerendered, so a `today` computed on the server would be the
 *  day of the BUILD — a floor that drifts further from the truth the longer a
 *  deploy stands. It is a convenience on the date inputs and nothing more: the
 *  engine takes its own `today` and remains the authority on what is past, which
 *  is why "past" still has a sentence of its own below.
 * --------------------------------------------------------------------- */

function neverChanges(): () => void {
  return () => {};
}

function browserToday(): string {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  return `${now.getFullYear()}-${month < 10 ? `0${month}` : month}-${day < 10 ? `0${day}` : day}`;
}

/** No floor during server render and hydration — then the real one. */
function noServerToday(): null {
  return null;
}

/* ----------------------------- the good answer ----------------------------- */

function Free({ quote }: { quote: AvailabilityResponse }): ReactNode {
  return (
    <div>
      <p className={s.freeHead}>Free · {nightsWord(quote.nights.length)}</p>
      <Breakdown quote={quote} lit />
    </div>
  );
}

/* ------------------------------ the refusals ------------------------------ */

function Refused({
  quote,
  sentences,
}: {
  quote: AvailabilityResponse;
  sentences: string[];
}): ReactNode {
  return (
    <div>
      <p className={s.refusedHead}>Not these dates</p>
      <ul className={s.reasons}>
        {sentences.map((sentence) => (
          <li key={sentence}>{sentence}</li>
        ))}
      </ul>

      {/* The engine prices a refused range anyway — someone a night short of the
          minimum should see what the stay costs once they fix it. It is shown
          UNLIT: the total keeps its figures but loses the ember, because ember
          on this site means live, and this price is not one anybody can act on. */}
      {quote.nights.length > 0 ? (
        <div className={s.wouldCost}>
          <p className={s.wouldCostHead}>What it would cost</p>
          <Breakdown quote={quote} lit={false} />
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------ the numbers ------------------------------ */

function Breakdown({
  quote,
  lit,
}: {
  quote: AvailabilityResponse;
  lit: boolean;
}): ReactNode {
  return (
    <>
      {/* Capped and scrollable: a month in deep winter is thirty rows, and a
          sticky panel that grows past the viewport stops being sticky and
          buries its own total. tabIndex makes the region reachable without a
          mouse, which a scroll container otherwise is not. */}
      <ul className={s.nights} tabIndex={0} aria-label="Each night and its rate">
        {quote.nights.map((night) => (
          <li key={night.night} className={s.night}>
            <span className={s.nightDay}>{formatShortDay(night.night)}</span>
            <span className={s.nightRule}>{night.rule_label ?? ""}</span>
            <span className={s.nightRate}>{formatPriceEur(night.price_cents)}</span>
          </li>
        ))}
      </ul>

      <dl className={s.totals}>
        <div>
          <dt>{capitalise(nightsWord(quote.nights.length))}</dt>
          <dd>{formatPriceEur(quote.subtotal_cents)}</dd>
        </div>
        {quote.fees_cents > 0 ? (
          <div>
            <dt>Fees</dt>
            <dd>{formatPriceEur(quote.fees_cents)}</dd>
          </div>
        ) : null}
        <div className={s.totalRow}>
          <dt>Total</dt>
          <dd className={lit ? `${s.total} ${s.totalLit}` : s.total}>
            {formatPriceEur(quote.total_cents)}
          </dd>
        </div>
      </dl>
    </>
  );
}

/**
 * A sentence for every machine reason the engine sent back.
 *
 * The engine collects ALL the reasons rather than stopping at the first, so a
 * guest is not told "too short", fixes it, and only then hears "already booked".
 * This keeps that promise: every reason gets its own line, in the order the
 * engine detected them, and none of them is collapsed into a shrug.
 */
function refusals(
  quote: AvailabilityResponse,
  nightsAsked: number,
  checkIn: string,
  checkOut: string,
  capacity: number,
  closures: readonly Closure[],
): string[] {
  const sentences: string[] = [];

  for (const reason of quote.reasons) {
    switch (reason) {
      case "inverted":
        sentences.push(
          "Leaving has to come after arriving — a stay needs at least one night in it.",
        );
        break;

      case "past":
        sentences.push(
          "That arrival has already gone. The calendar only opens from today onward.",
        );
        break;

      case "min_nights":
        sentences.push(
          `These dates ask for ${nightsWord(quote.min_nights)} and you have chosen ${nightsWord(nightsAsked)}. Anything shorter is a drive, not a stay.`,
        );
        break;

      case "capacity":
        sentences.push(
          `The house sleeps ${numberWord(capacity)}. There is no spare mattress out here, and nowhere to put one.`,
        );
        break;

      case "booked":
        sentences.push(
          "Someone already has these nights. One booking at a time is the whole point of the place.",
        );
        break;

      case "blocked": {
        /* "Blocked" is the engine's word for six different situations, and this
           page already knows which one this is. Print the owner's own reason. */
        const hit = closures.filter((closure) =>
          rangesOverlap(checkIn, checkOut, closure.startsOn, closure.endsOn),
        );
        if (hit.length > 0) {
          for (const closure of hit) sentences.push(closure.sentence);
        } else {
          sentences.push("The house is shut for part of these dates.");
        }
        break;
      }

      default:
        /* A newer Python deploy can send a reason this build has never heard of.
           Saying something true and vague beats failing to render the answer. */
        sentences.push("These dates are not available.");
    }
  }

  if (sentences.length === 0) sentences.push("These dates are not available.");

  return sentences;
}
