import type { ReactNode } from "react";

import s from "./section-head.module.css";

/* -------------------------------------------------------------------- *
 *  SECTION HEAD — the kicker rule, the display heading, and either a
 *  lede under it or a note beside it.
 *
 *  "stack"  the heading owns the column; the lede sits under it.
 *  "split"  the heading sits left, a short note right, and a hairline
 *           runs under both — the pattern above a grid of things.
 * -------------------------------------------------------------------- */

export interface SectionHeadProps {
  kicker?: string;
  title: ReactNode;
  /** Body text under the heading. "stack" only. */
  lede?: ReactNode;
  /** Short note to the right of the heading. "split" only. */
  aside?: ReactNode;
  variant?: "stack" | "split";
  /** Heading level. The page owns the outline, not this component. */
  as?: "h1" | "h2" | "h3";
}

export function SectionHead({
  kicker,
  title,
  lede,
  aside,
  variant = "stack",
  as: Heading = "h2",
}: SectionHeadProps): ReactNode {
  const heading = (
    <>
      {kicker ? <p className={s.kicker}>{kicker}</p> : null}
      <Heading className={s.title}>{title}</Heading>
    </>
  );

  if (variant === "split") {
    return (
      <div className={s.split}>
        <div>{heading}</div>
        {aside ? <p className={s.aside}>{aside}</p> : null}
      </div>
    );
  }

  return (
    <div className={s.stack}>
      {heading}
      {lede ? <p className={s.lede}>{lede}</p> : null}
    </div>
  );
}
