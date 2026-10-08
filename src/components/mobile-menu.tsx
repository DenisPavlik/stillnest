"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";

import type { NavLink } from "./site-nav";
import s from "./mobile-menu.module.css";

/* -------------------------------------------------------------------- *
 *  MOBILE MENU — the navigation that exists below 680px.
 *
 *  It exists because for a while nothing did: `.navLinks` goes
 *  `display: none` on narrow screens and there was no replacement, so a
 *  phone could reach the catalog and nothing else. Every page that is
 *  only linked from the nav — the philosophy page, the index anchor —
 *  simply did not exist on the device most people arrive on.
 *
 *  The trigger was the word `Menu` until the owner saw it on an iPhone:
 *  the Dynamic Island sits over the middle of the nav and ate it. It is
 *  now two hairlines that cross into an X, beside the account icon, and
 *  Reserve moved inside the panel — two small glyphs at the right edge
 *  clear the island where a word and a button did not.
 * -------------------------------------------------------------------- */

export interface MobileMenuProps {
  links: readonly NavLink[];
  reserveHref: string;
  reserveLabel: string;
}

export function MobileMenu({ links, reserveHref, reserveLabel }: MobileMenuProps): ReactNode {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    trigger.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;

    /* Lock the page behind the panel. Lenis is configured with
       `syncTouch: false`, so on a phone the browser's own scroll is what
       is running and this is enough to stop it; on a narrow desktop
       window Lenis cannot scroll a document that has nowhere to go
       either. Restored exactly, so a page that was already locked by
       something else is not silently unlocked by us. */
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);

    /* Focus lands inside the panel rather than staying on a trigger that
       is now behind an overlay — otherwise the first Tab walks through
       the page underneath, which for a screen-reader user is the whole
       site read out from behind a closed door. */
    panel.current?.querySelector<HTMLElement>("a")?.focus();

    return () => {
      root.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  /* The nav links are plain anchors and cause a document navigation, which
     unmounts this component anyway. Closing on click matters for the one
     case that does not navigate: an in-page anchor on the page you are
     already on. */
  return (
    <>
      <button
        ref={trigger}
        type="button"
        className={s.trigger}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={s.bars} data-open={open ? "" : undefined} aria-hidden="true">
          <span />
          <span />
        </span>
      </button>

      <div
        ref={panel}
        id={panelId}
        className={s.panel}
        data-open={open ? "" : undefined}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        /* Closed with `visibility`, not opacity alone: an invisible panel that
           still answers to the keyboard is a trap for anyone not using a
           mouse, and half the page would be focusable from behind it. */
        aria-hidden={open ? undefined : "true"}
      >
        <ul className={s.links}>
          {links.map((link) => (
            <li key={link.label}>
              <a className={s.link} href={link.href} onClick={close} tabIndex={open ? 0 : -1}>
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <a
          className={s.reserve}
          href={reserveHref}
          onClick={close}
          tabIndex={open ? 0 : -1}
        >
          {reserveLabel}
        </a>

        <p className={s.note}>Nowhere. On purpose.</p>
      </div>
    </>
  );
}
