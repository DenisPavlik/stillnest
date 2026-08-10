import type { MouseEvent } from "react";

/**
 * A real anchor that soft-navigates on a plain left click, and nothing else.
 *
 * Every control on the console is a link, because every state of the catalog is
 * an address: middle-click it, copy it, bookmark it, open it in a new tab. The
 * click handler only intercepts the one gesture that means "go there now" —
 * modified clicks and non-primary buttons are left to the browser, which is the
 * whole difference between an anchor and a button pretending to be one.
 */
export interface SoftLinkProps {
  href: string;
  onClick: (event: MouseEvent<HTMLAnchorElement>) => void;
}

export function softLink(
  href: string,
  navigate: (href: string) => void,
): SoftLinkProps {
  return {
    href,
    onClick(event: MouseEvent<HTMLAnchorElement>) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      event.preventDefault();
      navigate(href);
    },
  };
}
