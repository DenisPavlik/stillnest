"""Stay-range arithmetic.

A stay is the half-open range [check_in, check_out) — the guest occupies the
check-in night and leaves on the check-out morning. This is why one guest
checking out on the 5th and another checking in on the 5th do NOT conflict,
and it is the single most common off-by-one in booking systems.

The database enforces the same semantics with an EXCLUDE constraint (see
supabase/migrations). These helpers exist so the app can answer "is it free?"
before attempting a write, and so the answer agrees with the constraint.
"""

from __future__ import annotations

from datetime import date, timedelta


def nights(check_in: date, check_out: date) -> list[date]:
    """The nights actually occupied. Check-out day is not a night."""
    if check_out <= check_in:
        return []
    span = (check_out - check_in).days
    return [check_in + timedelta(days=offset) for offset in range(span)]


def night_count(check_in: date, check_out: date) -> int:
    return max(0, (check_out - check_in).days)


def ranges_overlap(
    a_start: date, a_end: date, b_start: date, b_end: date
) -> bool:
    """Half-open overlap: [a_start, a_end) && [b_start, b_end).

    Adjacent ranges (a_end == b_start) do not overlap.
    """
    return a_start < b_end and b_start < a_end
