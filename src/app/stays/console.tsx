"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type CSSProperties,
  type ReactNode,
} from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

import { prefersReducedMotion } from "@/components/motion/prefers-reduced";
import { f1, seeded } from "@/components/scene/geometry";
import { BIOME_LABEL, bortleFill } from "@/components/solitude/readings";
import { formatKm } from "@/lib/format";

import {
  BIOME_VALUES,
  SIGNAL_LABEL,
  SIGNAL_VALUES,
  SORT_LABEL,
  SORT_VALUES,
  isFiltered,
  stayHref,
  toQuery,
  type SearchState,
  type SolitudeBounds,
  type StayQuery,
} from "./search-params";
import { SearchField } from "./search-field";
import { softLink } from "./soft-link";
import s from "./console.module.css";

/* ==================================================================== *
 *  THE CONSOLE — you do not tick boxes to find a house here. You set an
 *  instrument to how alone you want to be, and the catalog answers.
 *
 *  Every control is shaped like the readout that reports the same metric
 *  on the Solitude Index, so setting the console and reading the survey
 *  are visibly the same act: a distance line with kilometre ticks, a
 *  sixty-second ambient trace, the nine cells of the Bortle scale, four
 *  signal bars with a slash through them.
 *
 *  ONE RULE HOLDS BOTH SLIDERS: the lit stretch to the RIGHT of the thumb
 *  is what you would accept. Dragging right always means further from
 *  everyone — further out on the distance line, quieter on the trace.
 *  The dark-sky picker is the one instrument that cannot follow it, since
 *  its scale is fixed by convention with the darkest sky on the left; it
 *  says so at both ends instead.
 *
 *  The URL is the state. Discrete controls are real links — middle-click
 *  them, copy them, bookmark them — intercepted for a soft navigation.
 *  The two sliders hold a local draft while a thumb is moving and push it
 *  once the hand settles, so a drag leaves one history entry, not forty.
 * ==================================================================== */

const PUSH_DELAY_MS = 260;

export interface StaysConsoleProps {
  bounds: SolitudeBounds;
  /** The state the server rendered these results from. */
  query: StayQuery;
  /** Canonical query string for `query` — the console's own change detector. */
  signature: string;
  biomeCounts: Record<string, number>;
  resultCount: number;
  total: number;
  /** The current filter, written out as a sentence. Composed on the server. */
  reading: string;
  /** null when no sentence was asked; otherwise how the search service answered. */
  search: SearchState | null;
}

interface Draft {
  km: number;
  db: number;
}

function draftOf(query: StayQuery, bounds: SolitudeBounds): Draft {
  return {
    km: query.minSolitudeKm ?? bounds.minKm,
    db: query.maxNoiseDb ?? bounds.maxDb,
  };
}

export function StaysConsole({
  bounds,
  query,
  signature,
  biomeCounts,
  resultCount,
  total,
  reading,
  search,
}: StaysConsoleProps): ReactNode {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [draft, setDraft] = useState<Draft>(() => draftOf(query, bounds));
  const [seenSignature, setSeenSignature] = useState(signature);
  const [pushedSignature, setPushedSignature] = useState<string | null>(null);

  /* The server is the source of truth. When the URL changes for a reason
     that is not our own push — the back button, a pasted link, a click on
     one of the discrete controls — the draft adopts it. When it changes
     because we pushed it, the draft is already ahead and must not be
     rewound to a value the hand has since moved past. */
  if (signature !== seenSignature) {
    setSeenSignature(signature);
    if (pushedSignature !== signature) setDraft(draftOf(query, bounds));
  }

  useEffect(() => {
    const next = toQuery(
      { ...query, minSolitudeKm: draft.km, maxNoiseDb: draft.db },
      bounds,
    );
    if (next === signature) return;

    const timer = setTimeout(() => {
      setPushedSignature(next);
      startTransition(() => {
        router.push(next ? `/stays?${next}` : "/stays", { scroll: false });
      });
    }, PUSH_DELAY_MS);

    return () => clearTimeout(timer);
  }, [draft, query, bounds, signature, router]);

  /* The one animated thing on the console, and it is a readout rather than a
     control: the house count drops onto its new value the way a needle settles.
     Nothing a hand is touching moves — a control that animates is a control
     that feels slow, and this instrument has to answer the moment it is moved.

     It runs only when the number actually changes, so dragging a slider across
     a stretch that filters nothing out leaves the readout perfectly still. */
  const countRef = useRef<HTMLSpanElement>(null);
  const shownCount = useRef(resultCount);

  useGSAP(
    () => {
      const el = countRef.current;
      const changed = shownCount.current !== resultCount;
      shownCount.current = resultCount;

      if (!el || !changed) return;
      if (prefersReducedMotion()) return;

      gsap.fromTo(
        el,
        { opacity: 0.2, y: -4 },
        { opacity: 1, y: 0, duration: 0.34, ease: "power2.out", overwrite: true },
      );
    },
    { dependencies: [resultCount] },
  );

  function navigate(href: string) {
    startTransition(() => router.push(href, { scroll: false }));
  }

  const link = (href: string) => softLink(href, navigate);

  const kmSpan = Math.max(1, bounds.maxKm - bounds.minKm);
  const dbSpan = Math.max(1, bounds.maxDb - bounds.minDb);

  /* The quiet slider runs the other way round: its right-hand end is the
     lowest reading we have. The input carries the mirrored number so the
     track stays left-to-right; the label always shows real decibels. */
  const dbInput = bounds.minDb + bounds.maxDb - draft.db;

  const kmPos = ((draft.km - bounds.minKm) / kmSpan) * 100;
  const dbPos = ((dbInput - bounds.minDb) / dbSpan) * 100;

  const sky = query.maxBortle ?? bounds.maxBortle;
  const sleeps = query.guests ?? 1;

  /* The one condition under which the grid is NOT in the order the "Ranked by"
     control says: a sentence was asked and the search answered it. If search is
     offline the ordinary sort is back in charge, so the control is too. */
  const byMeaning = query.q !== undefined && search === "ok";

  return (
    <section
      className={s.console}
      aria-label="Search the catalog, and filter it by how alone you want to be"
      data-pending={pending ? "" : undefined}
    >
      {/* ------------------------------ sentence ----------------------------- */}
      <SearchField query={query} bounds={bounds} search={search} navigate={navigate} />

      {/* ------------------------------ ground ------------------------------ */}
      <div className={s.ground}>
        <p className={s.groundLabel}>Ground</p>
        <ul className={s.tabs}>
          <li>
            <a
              className={query.biome ? s.tab : `${s.tab} ${s.tabOn}`}
              aria-current={query.biome ? undefined : "true"}
              {...link(stayHref(query, { biome: undefined }, bounds))}
            >
              Anywhere
              <i className={s.tabCount}>{total}</i>
            </a>
          </li>
          {BIOME_VALUES.map((biome) => {
            const n = biomeCounts[biome] ?? 0;
            const on = query.biome === biome;

            if (n === 0) {
              return (
                <li key={biome}>
                  <span className={`${s.tab} ${s.tabDead}`} aria-disabled="true">
                    {BIOME_LABEL[biome]}
                    <i className={s.tabCount}>0</i>
                  </span>
                </li>
              );
            }

            return (
              <li key={biome}>
                <a
                  className={on ? `${s.tab} ${s.tabOn}` : s.tab}
                  aria-current={on ? "true" : undefined}
                  {...link(stayHref(query, { biome: on ? undefined : biome }, bounds))}
                >
                  {BIOME_LABEL[biome]}
                  <i className={s.tabCount}>{n}</i>
                </a>
              </li>
            );
          })}
        </ul>
      </div>

      <div className={s.grid}>
        {/* --------------------------- how far ---------------------------- */}
        <div className={s.cell}>
          <div className={s.cellHead}>
            <label className={s.question} htmlFor="dial-km">
              How far from people?
            </label>
            <p className={s.readout}>
              <span className={s.readoutOp}>at least</span> {formatKm(draft.km)}
              <i>km</i>
            </p>
          </div>

          <div
            className={s.track}
            style={
              {
                "--pos": `${kmPos}%`,
                "--minor": `calc(100% / ${kmSpan})`,
                "--major": `calc(100% * 10 / ${kmSpan})`,
              } as CSSProperties
            }
          >
            <span className={s.rule} aria-hidden="true">
              <span className={s.ruleDim} />
              <span className={s.ruleLit} />
            </span>
            <input
              id="dial-km"
              className={`${s.input} ${s.inputDot}`}
              type="range"
              min={bounds.minKm}
              max={bounds.maxKm}
              step={1}
              value={draft.km}
              aria-valuetext={`at least ${formatKm(draft.km)} kilometres from the nearest dwelling`}
              onChange={(event) =>
                setDraft((current) => ({ ...current, km: Number(event.target.value) }))
              }
            />
          </div>

          <p className={s.ends}>
            <span>{formatKm(bounds.minKm)} km · everything we keep</span>
            <span>{formatKm(bounds.maxKm)} km · the furthest</span>
          </p>
          <p className={s.caption}>to the nearest permanent dwelling</p>
        </div>

        {/* --------------------------- how quiet --------------------------- */}
        <div className={s.cell}>
          <div className={s.cellHead}>
            <label className={s.question} htmlFor="dial-db">
              How quiet?
            </label>
            <p className={s.readout}>
              <span className={s.readoutOp}>under</span> {draft.db}
              <i>dB</i>
            </p>
          </div>

          <div className={s.track} style={{ "--pos": `${dbPos}%` } as CSSProperties}>
            <span className={s.trace} aria-hidden="true">
              <Trace className={s.traceDim} />
              <Trace className={s.traceLit} />
            </span>
            <input
              id="dial-db"
              className={`${s.input} ${s.inputBar}`}
              type="range"
              min={bounds.minDb}
              max={bounds.maxDb}
              step={1}
              value={dbInput}
              aria-valuetext={`${draft.db} decibels or quieter`}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  db: bounds.minDb + bounds.maxDb - Number(event.target.value),
                }))
              }
            />
          </div>

          <p className={s.ends}>
            <span>{bounds.maxDb} dB · anything we keep</span>
            <span>{bounds.minDb} dB · the quietest</span>
          </p>
          <p className={s.caption}>measured ambient, sixty seconds, 1.5 m</p>
        </div>

        {/* --------------------------- dark sky ---------------------------- */}
        <div className={s.cell}>
          <div className={s.cellHead}>
            <p className={s.question} id="dial-sky">
              Dark sky
            </p>
            <p className={s.readout}>
              <span className={s.readoutOp}>class</span> {sky}
              <i>or darker</i>
            </p>
          </div>

          {/* Only the classes we actually have. The scale is nine cells by
              convention and this drew all nine, greying out everything above
              the brightest sky on the map — five dead cells out of nine, which
              reads as a control that is mostly broken rather than as a scale
              that is mostly unused.

              What those cells were carrying was context: class 4 means nothing
              until you can see how far it is from a city. That argument moves
              into the caption below, where it costs a line of type instead of
              more than half the instrument. */}
          <ul className={s.sky} aria-labelledby="dial-sky">
            {Array.from({ length: bounds.maxBortle }, (_, i) => {
              const cls = i + 1;
              const accepted = cls <= sky;
              const className = [
                s.skyCell,
                accepted ? s.skyCellOn : "",
                cls === sky ? s.skyCellPick : "",
              ]
                .filter(Boolean)
                .join(" ");

              return (
                <li key={cls} style={{ "--cell": bortleFill(i) } as CSSProperties}>
                  <a
                    className={className}
                    aria-current={cls === sky ? "true" : undefined}
                    aria-label={`Accept skies of class ${cls} or darker`}
                    {...link(stayHref(query, { maxBortle: cls }, bounds))}
                  >
                    <SkyDots index={i} />
                    <i className={s.skyNum}>{cls}</i>
                  </a>
                </li>
              );
            })}
          </ul>

          <p className={s.ends}>
            <span>1 · no glow at all</span>
            <span>{bounds.maxBortle} · the brightest we keep</span>
          </p>
          <p className={s.caption}>
            {bounds.maxBortle < 9
              ? `the Bortle scale runs to 9, which is a city — nothing on our map is brighter than ${bounds.maxBortle}`
              : "light pollution, Bortle classes"}
          </p>
        </div>

        {/* ---------------------------- signal ----------------------------- */}
        <div className={s.cell}>
          <div className={s.cellHead}>
            <p className={s.question} id="dial-signal">
              Signal
            </p>
          </div>

          <ul className={s.chips} aria-labelledby="dial-signal">
            <li>
              <a
                className={query.connectivity ? s.chip : `${s.chip} ${s.chipOn}`}
                aria-current={query.connectivity ? undefined : "true"}
                {...link(stayHref(query, { connectivity: undefined }, bounds))}
              >
                Either way
              </a>
            </li>
            {SIGNAL_VALUES.map((value) => {
              const on = query.connectivity === value;
              return (
                <li key={value}>
                  <a
                    className={[s.chip, s.chipSignal, on ? s.chipOn : ""]
                      .filter(Boolean)
                      .join(" ")}
                    aria-current={on ? "true" : undefined}
                    {...link(
                      stayHref(query, { connectivity: on ? undefined : value }, bounds),
                    )}
                  >
                    <Bars lit={value === "none" ? 0 : value === "weak" ? 1 : 4} />
                    {SIGNAL_LABEL[value]}
                  </a>
                </li>
              );
            })}
          </ul>
          <p className={s.caption}>none is the best reading on this instrument</p>
        </div>

        {/* ---------------------------- sleeps ----------------------------- */}
        <div className={s.cell}>
          <div className={s.cellHead}>
            <p className={s.question} id="dial-sleeps">
              Sleeps
            </p>
          </div>

          <ul className={s.chips} aria-labelledby="dial-sleeps">
            {[1, ...countUp(2, bounds.maxGuests)].map((n) => {
              const on = sleeps === n;
              return (
                <li key={n}>
                  <a
                    className={on ? `${s.chip} ${s.chipOn}` : s.chip}
                    aria-current={on ? "true" : undefined}
                    {...link(stayHref(query, { guests: n }, bounds))}
                  >
                    {n === 1 ? "Any" : n}
                  </a>
                </li>
              );
            })}
          </ul>
          <p className={s.caption}>beds, not invitations — none of these houses is large</p>
        </div>

        {/* ----------------------------- rank ------------------------------ *
            While a sentence is ranking the catalog, this control is not
            merely ignored — it is REMOVED. Leaving four chips lit, one of
            them marked as current, next to a grid that is in a completely
            different order would be the console lying about the page it is
            attached to. It comes back the moment the sentence is cleared,
            still set to whatever it was set to.                            */}
        <div className={s.cell}>
          <div className={s.cellHead}>
            <p className={s.question} id="dial-sort">
              Ranked by
            </p>
            {byMeaning ? (
              <p className={s.readout}>
                <span className={s.readoutOp}>by</span>meaning
              </p>
            ) : null}
          </div>

          {byMeaning ? (
            <p className={s.suspended}>
              The sentence is doing the ranking. Clear it to rank by distance,
              silence, darkness or price again.
            </p>
          ) : (
            <ul className={s.chips} aria-labelledby="dial-sort">
              {SORT_VALUES.map((value) => {
                const on = query.sort === value;
                return (
                  <li key={value}>
                    <a
                      className={on ? `${s.chip} ${s.chipOn}` : s.chip}
                      aria-current={on ? "true" : undefined}
                      {...link(stayHref(query, { sort: value }, bounds))}
                    >
                      {SORT_LABEL[value]}
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
          <p className={s.caption}>
            {byMeaning
              ? "closest first — a distance in meaning, not in kilometres"
              : "the collection in order, 01 to 12 — or rank it by what you came for"}
          </p>
        </div>
      </div>

      {/* ------------------------------ readout ------------------------------ */}
      <div className={s.foot}>
        <p className={s.count} aria-live="polite">
          <span className={s.countValue} ref={countRef}>
            {pad(resultCount)}
          </span>
          <span className={s.countTotal}>of {pad(total)} houses</span>
        </p>
        <p className={s.reading}>{reading}</p>
        {isFiltered(query) ? (
          <a className={s.reset} {...link("/stays")}>
            Clear
          </a>
        ) : null}
      </div>
    </section>
  );
}

/* --------------------------- small instruments --------------------------- */

function countUp(from: number, to: number): number[] {
  return to < from ? [] : Array.from({ length: to - from + 1 }, (_, i) => from + i);
}

/** Two digits, so the readout does not change width as houses drop out. */
function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/**
 * The ambient trace behind the quiet slider: loud on the left, near-silent
 * on the right, so the direction of the control is legible from the picture
 * before anyone reads the labels. Seeded once at module scope — server and
 * client draw byte-identical bars.
 */
const TRACE_BARS = (() => {
  const rand = seeded(4177);
  return Array.from({ length: 44 }, (_, i) => {
    const t = i / 43;
    const h = 1.8 + 24 * Math.pow(1 - t, 1.25) * (0.55 + rand() * 0.52);
    return { x: 2 + i * 6.75, h };
  });
})();

function Trace({ className }: { className: string }): ReactNode {
  return (
    <svg className={className} viewBox="0 0 300 28" preserveAspectRatio="none">
      {TRACE_BARS.map((bar, i) => (
        <rect
          key={i}
          x={f1(bar.x)}
          y={f1(28 - bar.h)}
          width="2.6"
          height={f1(bar.h)}
          fill="currentColor"
        />
      ))}
    </svg>
  );
}

/** The stars a sky of this class still has left. Same seeds as the instrument. */
function SkyDots({ index }: { index: number }): ReactNode {
  const rand = seeded(900 + index * 17);
  const dots = Array.from({ length: Math.max(0, 13 - index * 2) }, () => ({
    x: rand() * 22,
    y: rand() * 30,
    r: 0.5 + rand() * 0.75,
  }));

  return (
    <svg className={s.skyDots} viewBox="0 0 24 32" preserveAspectRatio="xMidYMid slice">
      {dots.map((dot, i) => (
        <circle
          key={i}
          cx={f1(1 + dot.x)}
          cy={f1(1 + dot.y)}
          r={dot.r.toFixed(2)}
          fill="#e9f0e6"
          opacity={index < 4 ? 0.8 : 0.25}
        />
      ))}
    </svg>
  );
}

/** Four bars, and a line through them when there is nothing to fill them with. */
function Bars({ lit }: { lit: number }): ReactNode {
  return (
    <svg className={s.bars} viewBox="0 0 21 12" aria-hidden="true">
      {[4.5, 7, 9.5, 12].map((h, i) => (
        <rect
          key={i}
          x={i * 5.4}
          y={12 - h}
          width="3.2"
          height={h}
          fill="currentColor"
          opacity={i < lit ? 0.95 : 0.26}
        />
      ))}
      {lit === 0 ? (
        <line x1="0" y1="11.5" x2="18.5" y2="0.5" stroke="currentColor" strokeWidth="1" />
      ) : null}
    </svg>
  );
}
