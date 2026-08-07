"""The only module in this service that knows SQL.

Everything else — pricing, availability, the calendar — is pure and takes its
facts as arguments. This module is where those facts come from, and it is
deliberately the only place a query lives: if a `SELECT` ever appears inside
pricing.py or availability.py, the engine stops being testable without a
database and the split has been lost.

Two decisions worth stating out loud:

  * **One connection per request, no pool.** Neon pools on its side, and a pool
    built inside a serverless function outlives nothing useful — the invocation
    is frozen or discarded the moment the response is sent, so a pool only ever
    leaks sockets. `connection()` opens one and closes it.
  * **`statement_cache_size=0`.** `DATABASE_URL` points at Neon's *pooled*
    endpoint, which is PgBouncer in transaction mode. Server-side prepared
    statements do not survive there, and asyncpg prepares everything by default.
    Without this the first query works and a later one fails with a
    "prepared statement does not exist" that only reproduces under load.

Every range read here is half-open, `[starts_on, ends_on)`, matching the engine
and the database's own EXCLUDE constraint.
"""

from __future__ import annotations

import os
from collections.abc import AsyncIterator, Mapping
from contextlib import asynccontextmanager
from dataclasses import dataclass
from datetime import date
from typing import Any
from uuid import UUID

import asyncpg

from stillnest.availability import Occupied, Reason
from stillnest.pricing import PricingRule

LIVE_BOOKING_STATUSES: tuple[str, ...] = ("pending", "confirmed")
"""The statuses that actually hold dates.

This is the same predicate as the EXCLUDE constraint's WHERE clause
(`drizzle/0000_harsh_kree.sql`). The two must never drift: if this list were
ever wider than the constraint's, the app would refuse stays the database would
have accepted — a booking lost with no error and no log to find it by. Cancelled
and expired bookings drop out of both and free their dates automatically.
"""


@dataclass(frozen=True, slots=True)
class PropertyFacts:
    """What the engine needs to know about a property to price and check a stay.

    `id` is the canonical uuid as a string — callers were given either a uuid or
    a slug and this is how they learn which property they actually got.
    """

    id: str
    slug: str
    name: str
    base_price_cents: int
    min_nights: int
    capacity: int
    status: str


def database_url() -> str:
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL is not set")
    return url


@asynccontextmanager
async def connection(dsn: str | None = None) -> AsyncIterator[asyncpg.Connection]:
    """One connection, opened for one request and closed with it."""
    conn = await asyncpg.connect(
        dsn or database_url(),
        statement_cache_size=0,  # see the module docstring — PgBouncer, not optional
        command_timeout=10,
    )
    try:
        yield conn
    finally:
        await conn.close()


def _ref(property_id: str | UUID) -> tuple[str, UUID | None]:
    """Split an id that may be a uuid *or* a slug into both lookup keys.

    The UI naturally holds the slug (`/stays/hollow-cedar-07`), while everything
    server-side holds the uuid. Rather than make every caller guess, each query
    resolves on both and the one that cannot match simply does not.
    """
    if isinstance(property_id, UUID):
        return ("", property_id)
    try:
        return (property_id, UUID(property_id))
    except ValueError:
        return (property_id, None)


# Resolves $1 (slug) or $2 (uuid) to a property id. Inlined rather than made a
# round trip of its own, so a request is three queries and not five.
_PROPERTY_REF = """
    (SELECT id FROM properties WHERE slug = $1 OR id = $2::uuid LIMIT 1)
"""

_PROPERTY_SQL = """
SELECT id, slug, name, base_price_cents, min_nights, capacity, status::text AS status
FROM properties
WHERE slug = $1 OR id = $2::uuid
LIMIT 1
"""

_PRICING_RULES_SQL = f"""
SELECT starts_on, ends_on, price_cents, min_nights, label
FROM pricing_rules
WHERE property_id = {_PROPERTY_REF.strip()}
  AND starts_on < $4
  AND ends_on > $3
ORDER BY starts_on, ends_on
"""

# One query, two sources. Bookings and owner blocks are the same thing to the
# engine — a range that is spoken for — and differ only in what the guest is
# told, so they are read together and separated by `reason`.
_OCCUPIED_SQL = f"""
SELECT check_in AS starts_on, check_out AS ends_on, TRUE AS is_booking
FROM bookings
WHERE property_id = {_PROPERTY_REF.strip()}
  AND status::text = ANY($5::text[])
  AND check_in < $4
  AND check_out > $3
UNION ALL
SELECT starts_on, ends_on, FALSE AS is_booking
FROM availability_blocks
WHERE property_id = {_PROPERTY_REF.strip()}
  AND starts_on < $4
  AND ends_on > $3
ORDER BY starts_on, ends_on
"""


def _to_facts(row: Mapping[str, Any]) -> PropertyFacts:
    return PropertyFacts(
        id=str(row["id"]),
        slug=row["slug"],
        name=row["name"],
        base_price_cents=int(row["base_price_cents"]),
        min_nights=int(row["min_nights"]),
        capacity=int(row["capacity"]),
        status=row["status"],
    )


def _to_rule(row: Mapping[str, Any]) -> PricingRule:
    min_nights = row["min_nights"]
    return PricingRule(
        starts_on=row["starts_on"],
        ends_on=row["ends_on"],
        price_cents=int(row["price_cents"]),
        min_nights=None if min_nights is None else int(min_nights),
        label=row["label"],
    )


def _to_occupied(row: Mapping[str, Any]) -> Occupied:
    return Occupied(
        starts_on=row["starts_on"],
        ends_on=row["ends_on"],
        reason=Reason.BOOKED if row["is_booking"] else Reason.BLOCKED,
    )


async def load_property(
    conn: asyncpg.Connection, property_id: str | UUID
) -> PropertyFacts | None:
    """The property, by uuid or by slug. `None` means it does not exist.

    `status` comes back rather than being filtered on: a draft property genuinely
    exists, and whether a guest may see it is a question for the caller, not for
    the pricing service.
    """
    slug, maybe_uuid = _ref(property_id)
    row = await conn.fetchrow(_PROPERTY_SQL, slug, maybe_uuid)
    return None if row is None else _to_facts(row)


async def load_pricing_rules(
    conn: asyncpg.Connection,
    property_id: str | UUID,
    start: date,
    end: date,
) -> tuple[PricingRule, ...]:
    """Only the rules that intersect [start, end).

    A rule that ends on the check-in date prices none of the stay's nights, so
    the window is compared half-open in SQL exactly as it is in Python.
    """
    if end <= start:
        return ()
    slug, maybe_uuid = _ref(property_id)
    rows = await conn.fetch(_PRICING_RULES_SQL, slug, maybe_uuid, start, end)
    return tuple(_to_rule(row) for row in rows)


async def load_occupied(
    conn: asyncpg.Connection,
    property_id: str | UUID,
    start: date,
    end: date,
) -> tuple[Occupied, ...]:
    """Everything already claimed in [start, end).

    Live bookings become `Reason.BOOKED`, availability blocks `Reason.BLOCKED`.
    Only `LIVE_BOOKING_STATUSES` occupy anything — see that constant.
    """
    if end <= start:
        return ()
    slug, maybe_uuid = _ref(property_id)
    rows = await conn.fetch(
        _OCCUPIED_SQL, slug, maybe_uuid, start, end, list(LIVE_BOOKING_STATUSES)
    )
    return tuple(_to_occupied(row) for row in rows)
