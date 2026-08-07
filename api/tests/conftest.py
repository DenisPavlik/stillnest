"""Shared test setup.

Two jobs, both about the database:

  * Make `DATABASE_URL` discoverable. Vercel keeps it in `.env.local`, which
    pytest does not read and which we will not add a dependency to parse.
  * Let database-backed tests **skip cleanly** when it is absent. A test that
    fails because a laptop is offline teaches nobody anything; it just trains
    people to ignore a red suite.
"""

from __future__ import annotations

import asyncio
import os
import re
from collections.abc import Awaitable, Callable
from pathlib import Path
from typing import Any, TypeVar

import asyncpg
import pytest

from stillnest import repository

REPO_ROOT = Path(__file__).resolve().parents[2]
ENV_FILE = REPO_ROOT / ".env.local"
ASSIGNMENT = re.compile(r'^\s*([A-Z][A-Z0-9_]*)\s*=\s*"?(.*?)"?\s*$')

T = TypeVar("T")


def _load_env_local() -> None:
    """Fill gaps in the environment from .env.local. Never overrides it."""
    if not ENV_FILE.is_file():
        return
    for line in ENV_FILE.read_text().splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        match = ASSIGNMENT.match(stripped)
        if match is not None:
            os.environ.setdefault(match[1], match[2])


_load_env_local()


@pytest.fixture(scope="session")
def database_url() -> str:
    """The live database, or a clean skip."""
    url = os.environ.get("DATABASE_URL")
    if not url:
        pytest.skip("DATABASE_URL is not set")
    return url


@pytest.fixture
def query(database_url: str) -> Callable[[Callable[[asyncpg.Connection], Awaitable[T]]], T]:
    """Run a read-only coroutine against the real database."""

    def run(body: Callable[[asyncpg.Connection], Awaitable[T]]) -> T:
        async def main() -> T:
            async with repository.connection(database_url) as conn:
                return await body(conn)

        return asyncio.run(main())

    return run


@pytest.fixture
def scratch(database_url: str) -> Callable[[Callable[[asyncpg.Connection], Awaitable[T]]], T]:
    """Run a coroutine that writes, inside a transaction that is always rolled back.

    The database this points at is the real seeded one, so nothing a test does
    is allowed to survive it.
    """

    def run(body: Callable[[asyncpg.Connection], Awaitable[T]]) -> T:
        async def main() -> T:
            async with repository.connection(database_url) as conn:
                transaction = conn.transaction()
                await transaction.start()
                try:
                    return await body(conn)
                finally:
                    await transaction.rollback()

        return asyncio.run(main())

    return run


async def make_user(conn: asyncpg.Connection) -> str:
    """A throwaway user, because bookings.user_id is a foreign key."""
    user_id = f"test-{os.urandom(8).hex()}"
    await conn.execute(
        "INSERT INTO users (id, email) VALUES ($1, $2)",
        user_id,
        f"{user_id}@example.invalid",
    )
    return user_id


async def make_booking(
    conn: asyncpg.Connection,
    *,
    property_id: Any,
    user_id: str,
    check_in: Any,
    check_out: Any,
    status: str,
) -> None:
    await conn.execute(
        """
        INSERT INTO bookings
          (property_id, user_id, check_in, check_out, guests, subtotal_cents, status)
        VALUES ($1::uuid, $2, $3, $4, 1, 10000, $5::booking_status)
        """,
        property_id,
        user_id,
        check_in,
        check_out,
        status,
    )
