# Stillnest

**Nowhere. On purpose.**

A booking platform for off-grid, design-forward stays — capsule houses, cabins and hi-tech retreats placed deliberately far from other people. You don't search by bedrooms and price. You search by **how alone you want to be**.

> ⚠️ **Concept / portfolio project.** The properties are not real and cannot actually be rented. Payments run in Stripe test mode — no money moves.

---

## The idea

Every property carries **measured isolation metrics**, and those are the search axes:

| Metric | Meaning |
|---|---|
| **Solitude** | km to the nearest permanent human dwelling |
| **Silence** | measured ambient level in dB (32 dB = you hear your own breathing) |
| **Signal** | `none` / `weak` / `full` — no signal is a feature, priced as one |
| **Dark sky** | Bortle 1–9 light-pollution scale |
| **Biome** | forest · snow · desert · bamboo · coast · highland |

Plus **search by feeling** — type *"alone by a lake, snow, no signal"* and get matches via vector similarity, not keyword filters.

And an **atmosphere layer**: the hero is a carousel of living scenes — short seamless video loops, each with its own ambient sound bed. Crickets outside at dusk; a fire crackling inside. Sound cross-fades with the visual, behind one `Sound on` toggle.

## Stack

- **Next.js 16** (App Router, React 19, TypeScript 5) · **Tailwind v4**
- **FastAPI** (Python 3.13) — semantic search + the availability/pricing engine
- **Supabase** — Postgres 17, pgvector, Auth, Storage, RLS
- **Stripe** (test mode) — Checkout + webhooks
- **GSAP / ScrollTrigger + Lenis** · one **React Three Fiber** scene
- **Vercel** — Next.js and the Python function deploy from this one repo

## Why two languages

Python owns the parts that are algorithms; TypeScript owns the parts that are pages and I/O.

FastAPI exposes exactly four endpoints — semantic search, availability, calendar, and re-embed. Everything else (rendering, auth, CRUD, Stripe) is Next.js. The contract surface is kept deliberately small.

## Double-booking is impossible by construction

Overlap prevention lives in the database, not in application code:

```sql
ALTER TABLE bookings ADD CONSTRAINT bookings_no_overlap
EXCLUDE USING gist (
  property_id WITH =,
  daterange(check_in, check_out, '[)') WITH &&
) WHERE (status IN ('pending', 'confirmed'));
```

The half-open range `[check_in, check_out)` means one guest checking out on the 5th and another checking in on the 5th is allowed — correct hotel semantics. Two concurrent checkouts for the same nights: Postgres rejects the second, and no race condition is reachable from application code.

## Status

🚧 In development. See the build order in the project notes.

## Author

Denys Pavlik — [DenForge](https://github.com/DenisPavlik)
