import type { ReactNode } from "react";

import { AccountLink } from "./account-link";
import { MobileMenu } from "./mobile-menu";
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

/**
 * Every entry here goes somewhere that exists. It is worth stating because
 * it briefly did not: "Philosophy" and "The Index" pointed at the same
 * anchor, and "Journal" pointed at the house grid — three labels promising
 * pages, one of them real. A nav that lies is the first thing a visitor
 * finds out about a site, and on a site arguing for honest measurement it
 * costs more than it does anywhere else.
 *
 * `/journal` is parked in the roadmap. It comes back here when it is built,
 * and not before.
 */
export const NAV_LINKS: readonly NavLink[] = [
  { label: "Houses", href: "/stays" },
  { label: "The Index", href: "/#index" },
  { label: "Philosophy", href: "/philosophy" },
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
      <AccountLink />
      <a className={s.reserve} href={reserveHref}>
        {reserveLabel}
      </a>
      {/* Below 680px `.navLinks` is display:none and this takes over. It is
          the only client component in the nav; everything else here stays
          server-rendered. */}
      <MobileMenu links={links} reserveHref={reserveHref} reserveLabel={reserveLabel} />
    </nav>
  );

  if (variant === "overlay") return nav;

  return <header className={s.bar}>{nav}</header>;
}
