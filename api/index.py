"""Stillnest FastAPI service — semantic search + availability/pricing.

Deployed as a Vercel Python function. Next.js rewrites /api/py/* here
(see vercel.json), and Vercel preserves the original request path, so the
routes below are declared with their full /api/py prefix.

The browser never calls this service directly — only Next.js server code does,
authenticated with INTERNAL_API_SECRET.
"""

import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import date

import asyncpg
from fastapi import FastAPI, Header, HTTPException

from stillnest import month as month_calendar
from stillnest import repository
from stillnest.availability import Reason, check
from stillnest.models import (
    AvailabilityRequest,
    AvailabilityResponse,
    CalendarResponse,
    HealthResponse,
    NightPrice,
    SearchRequest,
    SearchResponse,
)
from stillnest.pricing import quote

app = FastAPI(
    title="Stillnest API",
    description="Semantic search and the availability/pricing engine.",
    version="0.1.0",
)

PREFIX = "/api/py"


def require_internal_secret(x_internal_secret: str | None) -> None:
    """Every endpoint is server-to-server. Reject anything else."""
    expected = os.environ.get("INTERNAL_API_SECRET")
    if not expected:
        raise HTTPException(status_code=500, detail="INTERNAL_API_SECRET is not configured")
    if x_internal_secret != expected:
        raise HTTPException(status_code=401, detail="Unauthorized")


@asynccontextmanager
async def db() -> AsyncIterator[asyncpg.Connection]:
    """One connection per request. This is the only place the endpoints touch it.

    `today` is read here too — at the edge, once — and passed into the engine, so
    the pure modules keep having no opinion about when they run.
    """
    try:
        async with repository.connection() as conn:
            yield conn
    except RuntimeError as exc:  # DATABASE_URL missing — a deploy problem, not a bad request
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except OSError as exc:  # the database is unreachable; the request was fine
        raise HTTPException(status_code=503, detail=f"Database unavailable: {exc}") from exc


@app.get(f"{PREFIX}/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    """Unauthenticated — used to verify the Python runtime deploys and boots."""
    return HealthResponse(
        status="ok",
        service="stillnest-api",
        version="0.1.0",
        database_configured=bool(os.environ.get("DATABASE_URL")),
    )


@app.post(f"{PREFIX}/availability", response_model=AvailabilityResponse)
async def availability(
    payload: AvailabilityRequest,
    x_internal_secret: str | None = Header(default=None),
) -> AvailabilityResponse:
    """Is this property free for these dates, and what does it cost?

    **An unavailable range is a normal answer, not a failure.** It comes back
    200 with `available: false` and populated `reasons`, because "those nights
    are taken" is information the guest asked for. The only 404 is a property
    that genuinely does not exist.

    The prices are filled in even when the answer is no: a guest who picked one
    night too few should see what the stay would cost once they fix it.
    """
    require_internal_secret(x_internal_secret)
    today = date.today()

    async with db() as conn:
        facts = await repository.load_property(conn, payload.property_id)
        if facts is None:
            raise HTTPException(status_code=404, detail="Property not found")

        if payload.check_out <= payload.check_in:
            # No nights to price, and nothing else about the range is meaningful.
            return AvailabilityResponse(
                available=False,
                min_nights=facts.min_nights,
                reasons=[Reason.INVERTED.value],
            )

        rules = await repository.load_pricing_rules(
            conn, facts.id, payload.check_in, payload.check_out
        )
        occupied = await repository.load_occupied(
            conn, facts.id, payload.check_in, payload.check_out
        )

    priced = quote(
        payload.check_in,
        payload.check_out,
        base_price_cents=facts.base_price_cents,
        base_min_nights=facts.min_nights,
        rules=rules,
    )
    # `priced.min_nights` is the rule-aware minimum, not the property's — a stay
    # touching deep winter takes deep winter's minimum. Checking against the
    # property's would quote a stay the season would refuse.
    verdict = check(
        payload.check_in,
        payload.check_out,
        today=today,
        occupied=occupied,
        min_nights=priced.min_nights,
        guests=payload.guests,
        capacity=facts.capacity,
    )

    return AvailabilityResponse(
        available=verdict.available,
        nights=[
            NightPrice(
                night=night.night,
                price_cents=night.price_cents,
                rule_label=night.rule_label,
            )
            for night in priced.nights
        ],
        subtotal_cents=priced.subtotal_cents,
        fees_cents=priced.fees_cents,
        total_cents=priced.total_cents,
        min_nights=priced.min_nights,
        reasons=[reason.value for reason in verdict.reasons],
    )


@app.get(f"{PREFIX}/calendar/{{property_id}}", response_model=CalendarResponse)
async def calendar(
    property_id: str,
    month: str,
    x_internal_secret: str | None = Header(default=None),
) -> CalendarResponse:
    """Per-night availability and price for one month, for the date picker.

    `month` is "YYYY-MM". Bookings that straddle the month boundary are read in
    full and clipped to the window, so the last day of a month is taken when the
    stay starting on it runs into the next.
    """
    require_internal_secret(x_internal_secret)

    try:
        month_start, month_end = month_calendar.window(month)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    async with db() as conn:
        facts = await repository.load_property(conn, property_id)
        if facts is None:
            raise HTTPException(status_code=404, detail="Property not found")

        rules = await repository.load_pricing_rules(conn, facts.id, month_start, month_end)
        occupied = await repository.load_occupied(conn, facts.id, month_start, month_end)

    return CalendarResponse(
        property_id=facts.id,
        slug=facts.slug,
        month=f"{month_start:%Y-%m}",
        base_price_cents=facts.base_price_cents,
        min_nights=facts.min_nights,
        days=month_calendar.days(
            month_start,
            month_end,
            today=date.today(),
            base_price_cents=facts.base_price_cents,
            base_min_nights=facts.min_nights,
            rules=rules,
            occupied=occupied,
        ),
    )


@app.post(f"{PREFIX}/search/semantic", response_model=SearchResponse)
async def search_semantic(
    payload: SearchRequest,
    x_internal_secret: str | None = Header(default=None),
) -> SearchResponse:
    """Free text ("alone by a lake, snow, no signal") -> ranked properties.

    TODO(Phase 8): embed the query, pgvector cosine search, then apply hard
    filters (dates, capacity, biome) in SQL. Hard filters must never be
    overridden by vector similarity.
    """
    require_internal_secret(x_internal_secret)
    raise HTTPException(status_code=501, detail="Not implemented until Phase 8")


@app.post(f"{PREFIX}/internal/embed")
async def embed_property(
    property_id: str,
    x_internal_secret: str | None = Header(default=None),
) -> dict:
    """Regenerate one property's embedding after admin CRUD. TODO(Phase 8)."""
    require_internal_secret(x_internal_secret)
    raise HTTPException(status_code=501, detail="Not implemented until Phase 8")
