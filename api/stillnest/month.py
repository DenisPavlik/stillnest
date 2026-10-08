"""Painting one month for the date picker — what `GET /calendar/{id}` returns.

Pure, like the rest of the engine: the month's facts arrive as arguments and
`today` is injected, never read from the clock. Nothing here touches SQL.

The month is a half-open window `[first of the month, first of the next)`, the
same shape as a stay, which is what makes the boundary cases fall out for free:
a booking that ends on the 1st does not take the 1st, and a booking that starts
on the 31st takes it even though the rest of that stay belongs to the next month.
"""

from __future__ import annotations

import re
from datetime import date, timedelta

from stillnest.availability import Occupied, Reason, free_nights
from stillnest.dates import nights
from stillnest.models import CalendarDay
from stillnest.pricing import PricingRule, quote

MONTH_PATTERN = re.compile(r"^(\d{4})-(0[1-9]|1[0-2])$")

ONE_DAY = timedelta(days=1)


def window(month: str) -> tuple[date, date]:
    """"YYYY-MM" -> [first day, first day of the next month).

    Raises `ValueError` on anything else, including "2026-13" and "2026-1" —
    a date picker that silently reinterprets a malformed month is worse than one
    that refuses it.
    """
    match = MONTH_PATTERN.match(month)
    if match is None:
        raise ValueError("month must be formatted YYYY-MM")

    year, index = int(match[1]), int(match[2])
    start = date(year, index, 1)
    end = date(year + 1, 1, 1) if index == 12 else date(year, index + 1, 1)
    return start, end


def _reason_by_night(occupied: tuple[Occupied, ...]) -> dict[date, Reason]:
    """Which reason to show for each claimed night.

    A booking and an owner block can cover the same night; the guest is told
    "booked", the more informative of the two.
    """
    claimed: dict[date, Reason] = {}
    for span in occupied:
        for night in nights(span.starts_on, span.ends_on):
            if claimed.get(night) is not Reason.BOOKED:
                claimed[night] = span.reason
    return claimed


def days(
    month_start: date,
    month_end: date,
    *,
    today: date,
    base_price_cents: int,
    base_min_nights: int,
    rules: tuple[PricingRule, ...] = (),
    occupied: tuple[Occupied, ...] = (),
) -> list[CalendarDay]:
    """One entry per night in the window.

    Each day is priced as the single night `[day, day + 1)`, so `price_cents` is
    what that night costs and `min_nights` is the minimum a stay *starting* there
    would be held to — which is the question the picker is actually asking when
    a guest hovers a date.

    Days in the past are marked unavailable here rather than left to the client:
    the same rule decides them as decides `Reason.PAST` in `availability.check`,
    and it should only exist in one language.
    """
    free = free_nights(month_start, month_end, occupied)
    claimed = _reason_by_night(occupied)

    painted: list[CalendarDay] = []
    for night in nights(month_start, month_end):
        priced = quote(
            night,
            night + ONE_DAY,
            base_price_cents=base_price_cents,
            base_min_nights=base_min_nights,
            rules=rules,
        )
        tonight = priced.nights[0]

        if night < today:
            reason: Reason | None = Reason.PAST
        elif night in free:
            reason = None
        else:
            reason = claimed[night]

        painted.append(
            CalendarDay(
                night=night,
                available=reason is None,
                price_cents=tonight.price_cents,
                min_nights=priced.min_nights,
                rule_label=tonight.rule_label,
                reason=None if reason is None else reason.value,
            )
        )

    return painted
