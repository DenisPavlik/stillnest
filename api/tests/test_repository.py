"""The SQL layer: what the rows become, and what the database really says.

The engine's own 34 tests already prove the arithmetic. What can still go wrong
here is the seam — a column mapped to the wrong field, a status that should not
hold a date, a slug that resolves to a different property than its uuid.

The most important test in this file is the one about statuses. If a cancelled
booking still occupied its dates, nothing would error: the site would just
quietly refuse stays it could have sold.
"""

from __future__ import annotations

import asyncio
from datetime import date as D
from typing import Any
from uuid import UUID

import asyncpg
import pytest

from stillnest.availability import Occupied, Reason
from stillnest.pricing import PricingRule
from stillnest.repository import (
    LIVE_BOOKING_STATUSES,
    PropertyFacts,
    _ref,
    load_occupied,
    load_pricing_rules,
    load_property,
)
from tests.conftest import make_booking, make_user

PROPERTY_UUID = UUID("48e2e5c4-0547-4a8b-8b38-cccabaae80ad")


class FakeConn:
    """Stands in for an asyncpg connection: records the call, returns canned rows.

    asyncpg Records are read by key, so plain dicts are a faithful stand-in and
    the mapping can be tested without a network.
    """

    def __init__(self, rows: list[dict[str, Any]] | None = None) -> None:
        self.rows = rows or []
        self.calls: list[tuple[str, tuple[Any, ...]]] = []

    async def fetch(self, sql: str, *args: Any) -> list[dict[str, Any]]:
        self.calls.append((sql, args))
        return self.rows

    async def fetchrow(self, sql: str, *args: Any) -> dict[str, Any] | None:
        self.calls.append((sql, args))
        return self.rows[0] if self.rows else None


def run(coro: Any) -> Any:
    return asyncio.run(coro)


# --------------------------------------------------------------------- #
#  Mapping — rows in, dataclasses out
# --------------------------------------------------------------------- #


def test_a_property_row_becomes_facts_with_a_string_id():
    conn = FakeConn(
        [
            {
                "id": PROPERTY_UUID,
                "slug": "blackwater-11",
                "name": "Blackwater 11",
                "base_price_cents": 29000,
                "min_nights": 3,
                "capacity": 2,
                "status": "live",
            }
        ]
    )
    facts = run(load_property(conn, "blackwater-11"))

    assert facts == PropertyFacts(
        id=str(PROPERTY_UUID),
        slug="blackwater-11",
        name="Blackwater 11",
        base_price_cents=29000,
        min_nights=3,
        capacity=2,
        status="live",
    )
    # The uuid leaves this layer as a string, so it can be handed straight to a
    # response model without anyone remembering to convert it.
    assert isinstance(facts.id, str)


def test_a_missing_property_is_none_not_an_error():
    assert run(load_property(FakeConn([]), "does-not-exist")) is None


def test_pricing_rules_keep_their_nulls():
    conn = FakeConn(
        [
            {
                "starts_on": D(2026, 12, 20),
                "ends_on": D(2027, 1, 3),
                "price_cents": 41000,
                "min_nights": 5,
                "label": "Deep winter",
            },
            {
                "starts_on": D(2027, 3, 1),
                "ends_on": D(2027, 4, 1),
                "price_cents": 26000,
                "min_nights": None,
                "label": None,
            },
        ]
    )
    rules = run(load_pricing_rules(conn, "blackwater-11", D(2026, 12, 1), D(2027, 5, 1)))

    assert rules == (
        PricingRule(D(2026, 12, 20), D(2027, 1, 3), 41000, 5, "Deep winter"),
        PricingRule(D(2027, 3, 1), D(2027, 4, 1), 26000, None, None),
    )
    assert isinstance(rules, tuple), "the engine takes tuples — it treats them as frozen"


def test_bookings_and_blocks_come_back_as_different_reasons():
    conn = FakeConn(
        [
            {"starts_on": D(2027, 5, 1), "ends_on": D(2027, 5, 4), "is_booking": True},
            {"starts_on": D(2027, 5, 9), "ends_on": D(2027, 5, 12), "is_booking": False},
        ]
    )
    occupied = run(load_occupied(conn, "blackwater-11", D(2027, 5, 1), D(2027, 6, 1)))

    assert occupied == (
        Occupied(D(2027, 5, 1), D(2027, 5, 4), Reason.BOOKED),
        Occupied(D(2027, 5, 9), D(2027, 5, 12), Reason.BLOCKED),
    )


def test_an_empty_window_asks_the_database_nothing():
    """An inverted or zero-night range cannot intersect anything."""
    conn = FakeConn()
    assert run(load_pricing_rules(conn, "x", D(2027, 5, 1), D(2027, 5, 1))) == ()
    assert run(load_occupied(conn, "x", D(2027, 5, 4), D(2027, 5, 1))) == ()
    assert conn.calls == []


def test_only_live_holds_are_asked_for():
    """The same predicate as the EXCLUDE constraint, and nothing wider."""
    assert LIVE_BOOKING_STATUSES == ("pending", "confirmed")

    conn = FakeConn()
    run(load_occupied(conn, "blackwater-11", D(2027, 5, 1), D(2027, 6, 1)))
    sql, args = conn.calls[0]

    assert args[-1] == ["pending", "confirmed"]
    assert "cancelled" not in sql and "expired" not in sql


# --------------------------------------------------------------------- #
#  Accepting a uuid or a slug
# --------------------------------------------------------------------- #


def test_a_slug_and_a_uuid_are_both_offered_to_the_query():
    assert _ref("blackwater-11") == ("blackwater-11", None)
    assert _ref(str(PROPERTY_UUID)) == (str(PROPERTY_UUID), PROPERTY_UUID)
    assert _ref(PROPERTY_UUID) == ("", PROPERTY_UUID)


def test_a_slug_and_a_uuid_resolve_to_the_same_property(query):
    """The UI has the slug; the server has the uuid. They must be the same door."""

    async def body(conn: asyncpg.Connection) -> tuple[PropertyFacts | None, ...]:
        slug = await conn.fetchval("SELECT slug FROM properties ORDER BY slug LIMIT 1")
        by_slug = await load_property(conn, slug)
        assert by_slug is not None
        by_uuid = await load_property(conn, by_slug.id)
        by_uuid_object = await load_property(conn, UUID(by_slug.id))
        return by_slug, by_uuid, by_uuid_object

    by_slug, by_uuid, by_uuid_object = query(body)
    assert by_slug == by_uuid == by_uuid_object


def test_an_unknown_id_is_none_in_both_shapes(query):
    async def body(conn: asyncpg.Connection) -> tuple[Any, Any]:
        return (
            await load_property(conn, "no-such-slug-at-all"),
            await load_property(conn, "00000000-0000-0000-0000-000000000000"),
        )

    assert query(body) == (None, None)


# --------------------------------------------------------------------- #
#  What actually holds a date
# --------------------------------------------------------------------- #


@pytest.mark.parametrize("status", ["cancelled", "expired"])
def test_a_dead_booking_does_not_occupy_its_dates(scratch, status: str):
    """Cancelled and expired rows drop out of the EXCLUDE constraint's WHERE
    clause and free their dates. The app has to agree, or it refuses stays the
    database would have accepted."""

    async def body(conn: asyncpg.Connection) -> tuple[Occupied, ...]:
        property_id = await conn.fetchval("SELECT id FROM properties ORDER BY slug LIMIT 1")
        user_id = await make_user(conn)
        await make_booking(
            conn,
            property_id=property_id,
            user_id=user_id,
            check_in=D(2031, 4, 10),
            check_out=D(2031, 4, 14),
            status=status,
        )
        return await load_occupied(conn, property_id, D(2031, 4, 1), D(2031, 5, 1))

    assert scratch(body) == ()


@pytest.mark.parametrize("status", ["pending", "confirmed"])
def test_a_live_booking_occupies_its_dates(scratch, status: str):
    async def body(conn: asyncpg.Connection) -> tuple[Occupied, ...]:
        property_id = await conn.fetchval("SELECT id FROM properties ORDER BY slug LIMIT 1")
        user_id = await make_user(conn)
        await make_booking(
            conn,
            property_id=property_id,
            user_id=user_id,
            check_in=D(2031, 4, 10),
            check_out=D(2031, 4, 14),
            status=status,
        )
        return await load_occupied(conn, property_id, D(2031, 4, 1), D(2031, 5, 1))

    assert scratch(body) == (Occupied(D(2031, 4, 10), D(2031, 4, 14), Reason.BOOKED),)


def test_only_the_live_ones_survive_a_mixed_month(scratch):
    async def body(conn: asyncpg.Connection) -> tuple[Occupied, ...]:
        property_id = await conn.fetchval("SELECT id FROM properties ORDER BY slug LIMIT 1")
        user_id = await make_user(conn)
        spans = {
            "pending": (D(2031, 6, 2), D(2031, 6, 4)),
            "confirmed": (D(2031, 6, 8), D(2031, 6, 10)),
            "cancelled": (D(2031, 6, 14), D(2031, 6, 16)),
            "expired": (D(2031, 6, 20), D(2031, 6, 22)),
        }
        for status, (check_in, check_out) in spans.items():
            await make_booking(
                conn,
                property_id=property_id,
                user_id=user_id,
                check_in=check_in,
                check_out=check_out,
                status=status,
            )
        return await load_occupied(conn, property_id, D(2031, 6, 1), D(2031, 7, 1))

    assert scratch(body) == (
        Occupied(D(2031, 6, 2), D(2031, 6, 4), Reason.BOOKED),
        Occupied(D(2031, 6, 8), D(2031, 6, 10), Reason.BOOKED),
    )


def test_an_availability_block_reads_back_as_blocked(scratch):
    async def body(conn: asyncpg.Connection) -> tuple[Occupied, ...]:
        property_id = await conn.fetchval("SELECT id FROM properties ORDER BY slug LIMIT 1")
        await conn.execute(
            """
            INSERT INTO availability_blocks (property_id, starts_on, ends_on, reason)
            VALUES ($1, $2, $3, 'maintenance')
            """,
            property_id,
            D(2031, 8, 5),
            D(2031, 8, 9),
        )
        return await load_occupied(conn, property_id, D(2031, 8, 1), D(2031, 9, 1))

    assert scratch(body) == (Occupied(D(2031, 8, 5), D(2031, 8, 9), Reason.BLOCKED),)


def test_a_booking_ending_on_the_window_start_is_not_loaded(scratch):
    """Half-open, in SQL as well as in Python. A stay that ends on the 1st has
    no night in a window that begins on the 1st, so it should not come back at
    all — loading it would be harmless, but only by accident."""

    async def body(conn: asyncpg.Connection) -> tuple[Occupied, ...]:
        property_id = await conn.fetchval("SELECT id FROM properties ORDER BY slug LIMIT 1")
        user_id = await make_user(conn)
        await make_booking(
            conn,
            property_id=property_id,
            user_id=user_id,
            check_in=D(2031, 9, 25),
            check_out=D(2031, 10, 1),
            status="confirmed",
        )
        return await load_occupied(conn, property_id, D(2031, 10, 1), D(2031, 11, 1))

    assert scratch(body) == ()


def test_pricing_rules_are_clipped_to_the_window(scratch):
    async def body(conn: asyncpg.Connection) -> tuple[PricingRule, ...]:
        property_id = await conn.fetchval("SELECT id FROM properties ORDER BY slug LIMIT 1")
        await conn.execute(
            """
            INSERT INTO pricing_rules (property_id, starts_on, ends_on, price_cents, label)
            VALUES ($1, $2, $3, 99000, 'inside'), ($1, $4, $5, 88000, 'outside')
            """,
            property_id,
            D(2032, 2, 10),
            D(2032, 2, 20),
            D(2032, 5, 1),
            D(2032, 6, 1),
        )
        return await load_pricing_rules(conn, property_id, D(2032, 2, 1), D(2032, 3, 1))

    labels = [rule.label for rule in scratch(body)]
    assert "inside" in labels
    assert "outside" not in labels
