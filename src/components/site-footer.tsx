import type { ReactNode } from "react";

import { NAV_LINKS } from "./site-nav";
import s from "./site-footer.module.css";

/* -------------------------------------------------------------------- *
 *  SITE FOOTER — wordmark, the line, the links, and the disclaimer.
 *
 *  The disclaimer is not decoration and it is not optional: this is a
 *  concept project and the site says so on every page.
 *
 *  The links read from `NAV_LINKS`, so the footer and the nav can never
 *  disagree about what the site contains. They went in when the nav had
 *  nothing below 680px; <MobileMenu> now covers that, and these stay
 *  because a second way to the same three pages costs one line and is
 *  what someone who has just finished reading a page reaches for.
 * -------------------------------------------------------------------- */

export const CONCEPT_NOTE =
  "Concept project. These houses are fictional and cannot be rented.";

export interface SiteFooterProps {
  /** Override only if a page needs to say something more specific. */
  note?: string;
  className?: string;
}

export function SiteFooter({ note = CONCEPT_NOTE, className }: SiteFooterProps): ReactNode {
  return (
    <footer className={className ? `${s.footer} ${className}` : s.footer}>
      <span className={s.mark}>Stillnest</span>
      <span className={s.line}>Nowhere. On purpose.</span>
      <ul className={s.links}>
        {NAV_LINKS.map((link) => (
          <li key={link.label}>
            <a className={s.link} href={link.href}>
              {link.label}
            </a>
          </li>
        ))}
      </ul>
      <span className={s.note}>{note}</span>
    </footer>
  );
}
