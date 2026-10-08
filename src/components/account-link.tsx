"use client";

import { useEffect, useState } from "react";

import s from "./account-link.module.css";

/* -------------------------------------------------------------------- *
 *  The account corner of the nav — asked for on the client, after the
 *  page has painted.
 *
 *  Reading the session on the server would make every page that carries
 *  the nav dynamic, and every page carries the nav: the catalog and the
 *  twelve houses are prerendered today, and one avatar is not worth
 *  giving that up. So the nav renders "Sign in" and corrects itself in a
 *  frame if someone is in fact signed in.
 * -------------------------------------------------------------------- */

interface Who {
  name: string | null;
  image: string | null;
}

/** One request per page view, however many navs the page draws. */
let pending: Promise<Who | null> | null = null;

function whoIsHere(): Promise<Who | null> {
  pending ??= fetch("/api/auth/session", { credentials: "same-origin" })
    .then((r) => (r.ok ? r.json() : null))
    .then((session) =>
      session?.user
        ? { name: session.user.name ?? null, image: session.user.image ?? null }
        : null,
    )
    .catch(() => null);
  return pending;
}

export function AccountLink() {
  const [who, setWho] = useState<Who | null | undefined>(undefined);

  useEffect(() => {
    let live = true;
    void whoIsHere().then((w) => live && setWho(w));
    return () => {
      live = false;
    };
  }, []);

  if (who) {
    return (
      <a className={s.avatar} href="/account" aria-label={`Your account${who.name ? ` — ${who.name}` : ""}`}>
        {who.image ? (
          // Google's avatar host refuses requests that carry a referrer.
          // eslint-disable-next-line @next/next/no-img-element -- a 28 px remote avatar; next/image would need the host allow-listed for no gain
          <img src={who.image} alt="" width={28} height={28} referrerPolicy="no-referrer" />
        ) : (
          <span aria-hidden="true">{(who.name ?? "?").slice(0, 1)}</span>
        )}
      </a>
    );
  }

  return (
    <a className={s.signIn} href="/signin" data-pending={who === undefined ? "" : undefined}>
      <span className={s.signInText}>Sign in</span>
      <svg className={s.signInIcon} viewBox="0 0 20 20" aria-hidden="true">
        <circle cx="10" cy="7" r="3.2" />
        <path d="M3.8 17c.9-3 3.3-4.6 6.2-4.6s5.3 1.6 6.2 4.6" />
      </svg>
    </a>
  );
}
