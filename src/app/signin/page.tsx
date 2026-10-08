import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { auth, signIn } from "@/auth";
import { FilmGrain } from "@/components/film-grain";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";

import s from "../account/account.module.css";

export const metadata: Metadata = {
  title: "Sign in — Stillnest",
  robots: { index: false },
};

/** Only ever send someone back somewhere on this site. */
function safeReturn(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/account";
}

/* Auth.js names its failures; a guest deserves the sentence. */
const ERROR: Record<string, string> = {
  AccessDenied: "Google did not let that account through. Try another, or try again.",
  OAuthAccountNotLinked: "That email is already linked to a different sign-in.",
  Configuration: "Sign-in is misconfigured on our side. Nothing you did.",
};

export default async function SignInPage({ searchParams }: PageProps<"/signin">): Promise<ReactNode> {
  const params = await searchParams;
  const to = safeReturn(params.callbackUrl);
  if ((await auth())?.user) redirect(to);

  const errorKey = Array.isArray(params.error) ? params.error[0] : params.error;
  const error = errorKey ? (ERROR[errorKey] ?? "Sign-in did not complete. Try again.") : null;

  async function google() {
    "use server";
    await signIn("google", { redirectTo: to });
  }

  return (
    <main className={s.page}>
      <FilmGrain />
      <SiteNav variant="bar" />

      <div className={`${s.shell} ${s.signInShell}`}>
        <p className={s.eyebrow}>Sign in</p>
        <h1 className={s.title}>Keep the places you would go to.</h1>
        <p className={s.lede}>
          One click with Google, and every house you save is waiting here the next time you
          need to be nowhere.
        </p>

        <form action={google}>
          <button type="submit" className={s.google}>
            <span className={s.googleMark} aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z" />
                <path fill="#FBBC05" d="M10.6 28.6A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.6l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l8-6.1z" />
                <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.5 2.3-6.2 0-11.5-4.1-13.4-9.8l-8 6.1C6.6 42.6 14.6 48 24 48z" />
              </svg>
            </span>
            Continue with Google
          </button>
        </form>

        {error ? (
          <p className={s.error} role="alert">
            {error}
          </p>
        ) : null}

        <p className={s.fineprint}>
          Stillnest keeps your name, your email and the houses you save — nothing else, and
          nothing is ever sent to you. It is a concept project: the houses are fictional and no
          booking or payment is real.
        </p>
      </div>

      <SiteFooter />
    </main>
  );
}
