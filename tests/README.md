# Testing

The posture, in one sentence: **test money and dates; eye-check everything else.**

This is a booking system, so the failures that actually cost something are silent and
arithmetic — two guests booking the same night, a stay billed at the wrong rate, an
off-by-one on a check-out day. Those get real tests. Marketing sections and motion get
looked at, not asserted.

The rule for adding a test: *if this bug would let two people book the same house on the
same night, or charge the wrong amount, it gets a test.*

## Layout

```
tests/
  unit/        Vitest — pure logic and contracts (jsdom, fast)
  e2e/         Playwright — real browser, real flows, responsive eye-check
  setup.ts     Testing Library matchers + auto-cleanup
api/tests/     pytest — the availability and pricing engine (Python owns it)
```

Python is where the highest-value tests live, because Python owns the availability and
pricing engine. `api/tests/test_dates.py` already covers every stay-range overlap
variant and the check-out/check-in adjacency case.

## Commands

```
pnpm test            # unit (watch off) + e2e
pnpm test:unit       # vitest run
pnpm test:watch      # vitest watch
pnpm test:e2e        # playwright
pnpm test:shots      # regenerate responsive screenshots for eye-checking
pnpm py:test         # pytest
pnpm check           # typecheck + lint + ruff + pytest + unit — the release gate
```

Playwright needs a browser once: `pnpm exec playwright install chromium`.

## What gets a test

| Area | Where | Why |
|---|---|---|
| Stay-range arithmetic | `api/tests/` | half-open `[in, out)` — the classic off-by-one |
| Pricing | `api/tests/` | seasonal rules, min-stay, integer cents, no floats |
| Double-booking under concurrency | `api/tests/` | proves the DB `EXCLUDE` constraint is still there |
| Stripe webhook | `tests/e2e/` | forged signature rejected, replay is idempotent |
| Booking flow end-to-end | `tests/e2e/` | dates → hold → checkout → confirmed |
| Auth boundaries | `tests/e2e/` | a guest cannot read another guest's bookings |
| Contracts (Zod ↔ Pydantic) | `tests/unit/` | the two-language boundary is the main drift risk |
| Media resolver | `tests/unit/` | one wrong join and every image 404s after the R2 move |

## What does NOT get a test

Marketing sections, scroll motion, the atmosphere layer, Tailwind output, Drizzle
wrappers, generated types. These are judged **by eye on screenshots** at 375 / 768 /
1440 — see `tests/e2e/responsive.spec.ts`, which writes to `tests/__screenshots__/`.

Do not add a test framework or a coverage threshold speculatively. Coverage percentage
is not a goal here; the table above is.
