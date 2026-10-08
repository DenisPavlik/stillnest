"use client";

import { useRef, type FormEvent, type ReactNode } from "react";

import {
  MAX_QUERY_CHARS,
  STAYS_PATH,
  stayHref,
  toQuery,
  withoutQuery,
  type SearchState,
  type SolitudeBounds,
  type StayQuery,
} from "./search-params";
import { softLink } from "./soft-link";
import s from "./search-field.module.css";

/* ==================================================================== *
 *  THE SENTENCE.
 *
 *  The console asks you for numbers. This asks you for the thing you
 *  actually came with — and it is the console's first control, not a
 *  utility bolted to the corner of the page, because saying "alone by a
 *  lake, snow, no signal" and setting the distance slider to 40 km are
 *  two ways of asking the same question.
 *
 *  It is set in the display face because the display face is the voice of
 *  this site, and this is the one field where the visitor gets to use it.
 *  Nothing about it is a search box: no magnifier, no pill, no shadow.
 *  A line, and a sentence resting on it.
 *
 *  NOBODY KNOWS WHAT TO TYPE INTO A BOX THAT CLAIMS TO UNDERSTAND FEELINGS,
 *  so the placeholder is a real query and two more sit under it as links.
 *  All three are sentences that have been checked against the catalog and
 *  return good houses — teaching by example beats explaining the model.
 *
 *  Submitting NAVIGATES. The sentence is a search param like every other
 *  control here, which is what makes a result linkable, refreshable and
 *  reachable with the back button. Nothing is fetched from the browser.
 *  Without JavaScript the same form is a plain GET to /stays, carrying the
 *  console's current state in hidden fields so a search never silently
 *  throws away the readings someone already set.
 * ==================================================================== */

/** Checked against the live catalog: rimefall-02, sparv-12, driftline-10. */
const PLACEHOLDER = "alone by a lake, snow, no signal";

/** Also checked. Kept short enough to read at a glance on a phone. */
const EXAMPLES = [
  "somewhere warm and green where it rains all the time",
  "I want to see the Milky Way and nothing else",
];

export interface SearchFieldProps {
  query: StayQuery;
  bounds: SolitudeBounds;
  /** null when nothing was asked; otherwise how the service answered. */
  search: SearchState | null;
  /** The console's own soft navigation, so a search dims the console too. */
  navigate: (href: string) => void;
}

export function SearchField({
  query,
  bounds,
  search,
  navigate,
}: SearchFieldProps): ReactNode {
  const box = useRef<HTMLInputElement>(null);
  const asked = query.q;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    /* Normalised the same way the parser normalises it, so that pressing
       Enter twice on the same sentence produces the same address twice and
       leaves one history entry rather than two. An empty box clears. */
    const said = (box.current?.value ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, MAX_QUERY_CHARS)
      .trim();

    navigate(stayHref(query, { q: said || undefined }, bounds));
  }

  /* Everything the console is currently set to, as form fields — the no-JS
     path only. Derived from the canonical query string, so it can never fall
     out of step with what the links elsewhere on the page produce. */
  const carried = Array.from(new URLSearchParams(toQuery(withoutQuery(query), bounds)));
  const examples = EXAMPLES.filter((example) => example !== asked);

  return (
    <form
      className={s.field}
      action={STAYS_PATH}
      method="get"
      role="search"
      onSubmit={submit}
    >
      <div className={s.head}>
        <label className={s.label} htmlFor="say">
          In your own words
        </label>
        {asked ? (
          <a
            className={s.clear}
            {...softLink(stayHref(query, { q: undefined }, bounds), navigate)}
          >
            Clear the sentence
          </a>
        ) : null}
      </div>

      <div className={s.line}>
        {/* Uncontrolled, and keyed on the sentence the server answered: it
            re-adopts the URL when the back button changes it, and otherwise
            leaves whatever is being typed alone — including while the console
            navigates for some other reason. */}
        <input
          key={asked ?? ""}
          id="say"
          ref={box}
          className={s.input}
          type="search"
          name="q"
          defaultValue={asked ?? ""}
          placeholder={PLACEHOLDER}
          maxLength={MAX_QUERY_CHARS}
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
        />
        <button className={s.go} type="submit">
          Search
          <svg className={s.arrow} viewBox="0 0 22 8" aria-hidden="true">
            <path
              d="M0 4h20M16.5 0.8 20.4 4l-3.9 3.2"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
            />
          </svg>
        </button>
      </div>

      {carried.map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}

      {search === "offline" ? (
        <p className={s.note}>
          <span className={s.noteTag}>Search offline</span>
          The service that reads sentences is not answering. Rather than show you
          an empty page, the catalog below is the ordinary one — every reading you
          set on the console still holds.
        </p>
      ) : (
        <p className={s.tries}>
          <span className={s.triesLabel}>{asked ? "Or try" : "Try"}</span>
          {examples.map((example) => (
            <a
              key={example}
              className={s.try}
              {...softLink(stayHref(query, { q: example }, bounds), navigate)}
            >
              &ldquo;{example}&rdquo;
            </a>
          ))}
        </p>
      )}
    </form>
  );
}
