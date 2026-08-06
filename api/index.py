"""Stillnest FastAPI service — semantic search + availability/pricing.

Deployed as a Vercel Python function. Next.js rewrites /api/py/* here
(see vercel.json), and Vercel preserves the original request path, so the
routes below are declared with their full /api/py prefix.

The browser never calls this service directly — only Next.js server code does,
authenticated with INTERNAL_API_SECRET.
"""

import os

from fastapi import FastAPI, Header, HTTPException

from stillnest.models import (
    AvailabilityRequest,
    AvailabilityResponse,
    HealthResponse,
    SearchRequest,
    SearchResponse,
)

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

    TODO(Phase 4): apply availability_blocks, existing bookings, pricing_rules
    and min_nights. Nightly breakdown, integer cents only.
    """
    require_internal_secret(x_internal_secret)
    raise HTTPException(status_code=501, detail="Not implemented until Phase 4")


@app.get(f"{PREFIX}/calendar/{{property_id}}")
async def calendar(
    property_id: str,
    month: str,
    x_internal_secret: str | None = Header(default=None),
) -> dict:
    """Per-day availability + price for the date picker. TODO(Phase 4)."""
    require_internal_secret(x_internal_secret)
    raise HTTPException(status_code=501, detail="Not implemented until Phase 4")


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
