@AGENTS.md

# Stillnest

Booking platform for off-grid, design-forward stays — "rent the absence of people."
Tagline: **Nowhere. On purpose.**

> ⚠️ **Concept / portfolio project.** Properties are fictional and cannot actually be
> rented. Stripe runs in test mode. The site says so plainly in the footer and on the
> booking confirmation — never present it as a real business.

**Canonical project doc lives in Obsidian**, not in this repo:
`~/Documents/Denys/Projects/Stillnest/Stillnest.md` → read it at the start of a session,
then open the sub-note the task needs (`01 Architecture`, `02 Testing`,
`03 Infrastructure`, `04 Roadmap`, `05 Log`). Append to `05 Log.md` at the end of a
session, newest on top.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript 5, Tailwind v4 |
| Database | Neon Postgres + Drizzle ORM, `pgvector`, `btree_gist` |
| Auth | Auth.js v5 (email + Google) |
| Python | FastAPI in `api/` — semantic search + availability/pricing only |
| Payments | Stripe **test mode only** |
| Motion | GSAP + ScrollTrigger + Lenis; one React Three Fiber scene (Phase 10) |
| Media | Cloudflare R2 (Phase 9); `/public` until then |
| Host | Vercel — **only `main` deploys** |

## Rules that are easy to get wrong

1. **Money is integer cents. Never floats.**
2. **Stay dates are calendar dates, never timestamps.** A stay is a range, not an
   instant. The range is half-open `[check_in, check_out)` — checkout on the 5th and
   check-in on the 5th do **not** conflict.
3. **Double-booking is prevented by the database**, via an `EXCLUDE USING gist`
   constraint on `bookings` — not by application code. Don't reimplement it in TS.
4. **Never hardcode a media URL.** Everything goes through `src/lib/media.ts`.
5. **The Python contract surface stays at four endpoints.** `api/stillnest/models.py`
   and `src/lib/api/contracts.ts` mirror each other by hand — change them together.
   If a fifth endpoint is tempting, ask whether it's an algorithm or just CRUD.
6. **The browser never calls FastAPI directly.** Only Next.js server code does,
   carrying `INTERNAL_API_SECRET`.
7. **Test money and dates. Eye-check everything else** at 375 / 768 / 1440.

## Git flow

```
feat/*  → squash-merge →  develop  → squash-release →  main  → Vercel prod
```

`main` is production and the default branch. Never commit features straight to `main`;
release only when the owner says so. Preview deploys are disabled for `develop`.

## Commands

```
pnpm dev            # Next.js (Turbopack) → localhost:3000
pnpm py:dev         # FastAPI → localhost:8000
pnpm check          # typecheck + eslint + ruff + pytest — green before any release
pnpm build          # production build
pnpm db:generate    # drizzle migration from schema
pnpm db:migrate     # apply migrations
```

Raw-SQL migrations (pgvector, the EXCLUDE constraint) are hand-written into the
generated migration files — Drizzle cannot express them.

## Conventions

- Notes and code in **English**; the owner communicates in **Ukrainian**.
- Site copy: **English only**, no i18n.
- Design comes from code, not Figma mockups — build 2–3 directions and judge by eye.
