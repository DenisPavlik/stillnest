"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { savedState, toggleSaved } from "@/app/account/actions";

import s from "./save-stay.module.css";

/**
 * Save a house to the visitor's shortlist.
 *
 * The page is prerendered, so whether *this* visitor saved *this* house is
 * asked after paint. Until it answers the control reads "Save" — the honest
 * default for almost everyone. Signed out, it leads to sign-in and back to
 * this exact house; signed in, it flips at once and lets the server catch up.
 */
export function SaveStay({ slug }: { slug: string }) {
  const [saved, setSaved] = useState<boolean | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    let live = true;
    void savedState(slug).then((v) => live && setSaved(v));
    return () => {
      live = false;
    };
  }, [slug]);

  function onClick() {
    if (saved === null) {
      router.push(`/signin?callbackUrl=${encodeURIComponent(`/stays/${slug}`)}`);
      return;
    }
    const next = !saved;
    setSaved(next);
    startTransition(async () => {
      const confirmed = await toggleSaved(slug, next);
      if (confirmed === null) setSaved(null);
    });
  }

  return (
    <button
      type="button"
      className={s.save}
      aria-pressed={saved === true}
      onClick={onClick}
    >
      <span className={s.mark} aria-hidden="true" />
      <span>{saved ? "Saved" : "Save"}</span>
    </button>
  );
}
