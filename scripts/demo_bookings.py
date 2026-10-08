"""Fill the calendar with demonstration bookings, so the admin has something to show.

    uv run python scripts/demo_bookings.py          # replace the demo set
    uv run python scripts/demo_bookings.py --clear  # remove it, leave nothing behind

Stillnest takes no real bookings — it is a concept — and until checkout exists it
takes none at all, so the admin would open on an empty table. This writes a
plausible season instead: a dozen fictional guests (every address on example.com,
the domain reserved for exactly this), stays from five weeks ago to three months out.

None of it is invented by hand. Every stay is offered to the same engine a guest
would meet: `availability.check` decides whether the dates are open — minimum
nights, owner blocks, the bookings already placed — and `pricing.quote` prices it
night by night, seasons included. A demo booking therefore cannot show a total the
booking panel would not quote, and the EXCLUDE constraint still has the last word.

Deterministic: the same seed and the same `today` give the same calendar.
"""

from __future__ import annotations

import asyncio
import os
import random
import sys
from datetime import date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "api"))

from stillnest.availability import check  # noqa: E402
from stillnest.pricing import quote  # noqa: E402
from stillnest.repository import (  # noqa: E402
    connection,
    load_occupied,
    load_pricing_rules,
    load_property,
)

DEMO_DOMAIN = "example.com"

# Fictional, and from the places these guests would plausibly be leaving.
GUESTS = [
    "Maren Holt", "Teodor Lind", "Aiko Mori", "Jonas Brenner", "Ines Carvalho",
    "Callum Reid", "Saoirse Doyle", "Mateo Ruiz", "Freya Nyström", "Oskar Wiśniewski",
    "Léa Fontaine", "Hugo Ahlberg",
]

PAST_DAYS = 35
FUTURE_DAYS = 95
STAYS_PER_HOUSE = 9


def load_env() -> None:
    root = Path(__file__).resolve().parents[1]
    for name in (".env", ".env.local"):
        path = root / name
        if not path.exists():
            continue
        for line in path.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            os.environ[key.strip()] = value.strip().strip('"').strip("'")


def email_for(name: str) -> str:
    local = name.lower().replace(" ", ".")
    local = local.encode("ascii", "ignore").decode() or "guest"
    return f"{local}@{DEMO_DOMAIN}"


async def clear(conn) -> int:
    removed = await conn.fetchval(
        """
        WITH gone AS (
          DELETE FROM bookings
          WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@' || $1)
          RETURNING 1
        ) SELECT count(*) FROM gone
        """,
        DEMO_DOMAIN,
    )
    await conn.execute("DELETE FROM users WHERE email LIKE '%@' || $1", DEMO_DOMAIN)
    return removed


async def guests(conn) -> list[str]:
    ids = []
    for name in GUESTS:
        uid = await conn.fetchval(
            """
            INSERT INTO users (id, name, email) VALUES (gen_random_uuid()::text, $1, $2)
            ON CONFLICT (email) DO UPDATE SET name = excluded.name
            RETURNING id
            """,
            name,
            email_for(name),
        )
        await conn.execute(
            "INSERT INTO profiles (user_id, full_name) VALUES ($1, $2) ON CONFLICT DO NOTHING",
            uid,
            name,
        )
        ids.append(uid)
    return ids


async def place(conn, rng: random.Random, slug: str, guest_ids: list[str], today: date) -> int:
    facts = await load_property(conn, slug)
    if facts is None:
        return 0
    placed = 0
    for attempt in range(STAYS_PER_HOUSE * 8):  # most attempts collide or hit a block
        if placed >= STAYS_PER_HOUSE:
            break
        # The first try at each house lands around tonight, so the ledger
        # opens on somebody actually being somewhere.
        if attempt == 0 and rng.random() < 0.5:
            check_in = today - timedelta(days=rng.randint(0, 2))
        else:
            check_in = today + timedelta(days=rng.randint(-PAST_DAYS, FUTURE_DAYS))
        nights = max(facts.min_nights, rng.choice([2, 3, 3, 4, 5, 7]))
        check_out = check_in + timedelta(days=nights)
        rules = await load_pricing_rules(conn, slug, check_in, check_out)
        occupied = await load_occupied(conn, slug, check_in, check_out)
        q = quote(check_in, check_out, facts.base_price_cents, facts.min_nights, rules)
        party = rng.randint(1, facts.capacity)
        # A stay already in the past was bookable on the day it was made, so
        # it is asked as of its own check-in rather than as of today.
        verdict = check(
            check_in,
            check_out,
            today=min(today, check_in),
            occupied=occupied,
            min_nights=q.min_nights,
            guests=party,
            capacity=facts.capacity,
        )
        if not verdict.available:
            continue
        status = "cancelled" if rng.random() < 0.08 else "confirmed"
        made = check_in - timedelta(days=rng.randint(9, 70))
        await conn.execute(
            """
            INSERT INTO bookings
              (property_id, user_id, check_in, check_out, guests,
               subtotal_cents, fees_cents, status, created_at)
            VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8::booking_status, $9)
            """,
            facts.id,
            rng.choice(guest_ids),
            check_in,
            check_out,
            party,
            q.subtotal_cents,
            q.fees_cents,
            status,
            made,
        )
        placed += 1
    return placed


async def main() -> int:
    load_env()
    async with connection() as conn:
        removed = await clear(conn)
        print(f"cleared {removed} demo bookings")
        if "--clear" in sys.argv:
            return 0

        rng = random.Random(1108)
        today = date.today()
        guest_ids = await guests(conn)
        slugs = [
            r["slug"]
            for r in await conn.fetch(
                "SELECT slug FROM properties WHERE status = 'live' ORDER BY slug"
            )
        ]
        total = 0
        for slug in slugs:
            n = await place(conn, rng, slug, guest_ids, today)
            total += n
            print(f"  {slug}: {n}")
        print(f"placed {total} bookings for {len(guest_ids)} guests")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
