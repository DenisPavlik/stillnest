"""Whether a stay can be booked, and if not, why not.

Pure functions again — occupied ranges arrive as arguments. The database is the
authority on whether a booking succeeds (the EXCLUDE constraint decides that, and
nothing here can override it); this module exists so a guest gets a specific,
useful answer *before* the write, instead of a blunt conflict error after it.

That split matters and is easy to blur: **this is not the guarantee.** If this
module and the constraint ever disagree, the constraint is right. What it must
never do is say "unavailable" when the constraint would have allowed the write —
that would silently lose bookings, and it is why the adjacency cases below have
their own tests.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from enum import StrEnum

from stillnest.dates import night_count, ranges_overlap


class Reason(StrEnum):
    """Why a stay was refused. Ordered by how early it is detected."""

    INVERTED = "inverted"
    """check_out is on or before check_in — zero or negative nights."""

    PAST = "past"
    """The stay starts before today."""

    TOO_SHORT = "min_nights"
    CAPACITY = "capacity"
    BOOKED = "booked"
    BLOCKED = "blocked"


@dataclass(frozen=True, slots=True)
class Occupied:
    """A range that is already spoken for — a live booking or an owner block."""

    starts_on: date
    ends_on: date
    reason: Reason


@dataclass(frozen=True, slots=True)
class Availability:
    available: bool
    reasons: tuple[Reason, ...]
    nights: int

    @property
    def blocking(self) -> Reason | None:
        return self.reasons[0] if self.reasons else None


def check(
    check_in: date,
    check_out: date,
    *,
    today: date,
    occupied: tuple[Occupied, ...] = (),
    min_nights: int = 1,
    guests: int = 1,
    capacity: int | None = None,
) -> Availability:
    """Answer whether these dates are bookable.

    `today` is injected rather than read from the clock so the engine has no
    hidden dependency on when it runs — the same inputs always give the same
    answer, in a test and in production.

    All applicable reasons are collected, not just the first: telling a guest
    "too short" and letting them fix it only to then hear "already booked" is a
    worse experience than telling them both at once.
    """
    reasons: list[Reason] = []

    if check_out <= check_in:
        # Nothing else can be meaningfully evaluated about a range that has no
        # nights in it, so this returns immediately.
        return Availability(available=False, reasons=(Reason.INVERTED,), nights=0)

    nights = night_count(check_in, check_out)

    if check_in < today:
        reasons.append(Reason.PAST)

    if nights < min_nights:
        reasons.append(Reason.TOO_SHORT)

    if capacity is not None and guests > capacity:
        reasons.append(Reason.CAPACITY)

    # Half-open overlap: a stay ending on the 5th and one starting on the 5th do
    # not collide. Getting this wrong in the *strict* direction would refuse
    # bookings the database would have accepted — a silent loss of revenue that
    # no error log would ever show.
    hit_booked = False
    hit_blocked = False
    for span in occupied:
        if ranges_overlap(check_in, check_out, span.starts_on, span.ends_on):
            if span.reason is Reason.BOOKED:
                hit_booked = True
            else:
                hit_blocked = True

    if hit_booked:
        reasons.append(Reason.BOOKED)
    if hit_blocked:
        reasons.append(Reason.BLOCKED)

    return Availability(
        available=not reasons,
        reasons=tuple(reasons),
        nights=nights,
    )


def free_nights(
    month_start: date,
    month_end: date,
    occupied: tuple[Occupied, ...],
) -> set[date]:
    """Every night in [month_start, month_end) that nothing has claimed.

    Used to paint a calendar. A night is occupied if any span covers it, so a
    single-night gap between two bookings still shows as free — which it is.
    """
    from stillnest.dates import nights as nights_in

    taken: set[date] = set()
    for span in occupied:
        taken.update(nights_in(span.starts_on, span.ends_on))

    return {night for night in nights_in(month_start, month_end) if night not in taken}
