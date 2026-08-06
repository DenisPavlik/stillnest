import type { ReactNode } from "react";

import s from "./site-nav.module.css";

/* -------------------------------------------------------------------- *
 *  SITE NAV — a thin line at the top, a wordmark, and the one moss
 *  button on the page.
 *
 *  Two placements:
 *
 *  · "overlay"  the nav is a child of the caller's own frame, laid over
 *               a hero. The caller owns the width, the gutter and the
 *               top padding; the nav contributes only its hairline.
 *  · "bar"      there is nothing behind it. The nav brings its own
 *               full-width band, page measure and padding.
 *
 *  Either way it is the same markup, so the two never drift apart.
 * -------------------------------------------------------------------- */

export interface NavLink {
  label: string;
  href: string;
}

export const NAV_LINKS: readonly NavLink[] = [
  { label: "Houses", href: "/stays" },
  { label: "The Index", href: "/#index" },
  { label: "Philosophy", href: "/#index" },
  { label: "Journal", href: "/#houses" },
];

export interface SiteNavProps {
  /** "overlay" sits inside the caller's frame; "bar" stands on its own. */
  variant?: "overlay" | "bar";
  links?: readonly NavLink[];
  /** Where the wordmark points. */
  homeHref?: string;
  reserveHref?: string;
  reserveLabel?: string;
}

export function SiteNav({
  variant = "overlay",
  links = NAV_LINKS,
  homeHref = "/",
  reserveHref = "/stays",
  reserveLabel = "Reserve",
}: SiteNavProps): ReactNode {
  const nav = (
    <nav className={s.nav} aria-label="Primary">
      <a className={s.wordmark} href={homeHref}>
        Stillnest
      </a>
      <ul className={s.navLinks}>
        {links.map((link) => (
          <li key={link.label}>
            <a className={s.navLink} href={link.href}>
              {link.label}
            </a>
          </li>
        ))}
      </ul>
      <a className={s.reserve} href={reserveHref}>
        {reserveLabel}
      </a>
    </nav>
  );

  if (variant === "overlay") return nav;

  return <header className={s.bar}>{nav}</header>;
}
