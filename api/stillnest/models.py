"""Request/response contracts for the Python service.

These are mirrored as Zod schemas in src/lib/api/contracts.ts. Keep both files
small and change them together — this boundary is the main risk of the
two-language split.

Money is always integer cents. Stay dates are always plain dates, never
timestamps: a stay is a calendar range, not an instant.
"""

from __future__ import annotations

from datetime import date

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    database_configured: bool


class AvailabilityRequest(BaseModel):
    property_id: str
    check_in: date
    check_out: date
    guests: int = Field(ge=1)


class NightPrice(BaseModel):
    night: date
    price_cents: int
    rule_label: str | None = None


class AvailabilityResponse(BaseModel):
    available: bool
    nights: list[NightPrice] = []
    subtotal_cents: int = 0
    fees_cents: int = 0
    total_cents: int = 0
    min_nights: int = 1
    reasons: list[str] = []
    """Why it is unavailable. The values are `availability.Reason`, which is the
    one place they are defined: 'inverted', 'past', 'min_nights', 'capacity',
    'booked', 'blocked'. An unavailable range is a normal answer, not an error —
    the prices are still filled in so the UI can show what it would have cost."""


class CalendarDay(BaseModel):
    """One night in the picker."""

    night: date
    available: bool
    price_cents: int
    """What this single night costs — a seasonal rule applies per night."""
    min_nights: int
    """The minimum a stay *starting* on this night would be held to."""
    rule_label: str | None = None
    reason: str | None = None
    """Why it is not available — 'past', 'booked' or 'blocked'; null when it is."""


class CalendarResponse(BaseModel):
    property_id: str
    """The canonical uuid — the request may have arrived with a slug."""
    slug: str
    month: str
    """Echoed back as 'YYYY-MM'."""
    base_price_cents: int
    min_nights: int
    days: list[CalendarDay] = []


class SearchFilters(BaseModel):
    biome: str | None = None
    guests: int | None = None
    check_in: date | None = None
    check_out: date | None = None
    max_solitude_km: float | None = None
    connectivity: str | None = None


class SearchRequest(BaseModel):
    query: str
    filters: SearchFilters = SearchFilters()
    limit: int = Field(default=12, ge=1, le=50)


class SearchHit(BaseModel):
    property_id: str
    slug: str
    score: float


class SearchResponse(BaseModel):
    hits: list[SearchHit] = []
    query_understood_as: str | None = None
