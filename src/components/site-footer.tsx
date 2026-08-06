import type { ReactNode } from "react";

import s from "./site-footer.module.css";

/* -------------------------------------------------------------------- *
 *  SITE FOOTER — wordmark, the line, and the disclaimer.
 *
 *  The disclaimer is not decoration and it is not optional: this is a
 *  concept project and the site says so on every page.
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
      <span className={s.note}>{note}</span>
    </footer>
  );
}
