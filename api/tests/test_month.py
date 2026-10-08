"""The calendar month.

Everything interesting here is a boundary. A month is a half-open window, so a
stay that ends on the 1st leaves the 1st free, and a stay that starts on the
31st takes it even though most of that stay belongs to the next month. Both are
the same off-by-one that the EXCLUDE constraint is careful about, seen from the
date picker's side.
"""

from __future__ import annotations

from datetime import date as D

import pytest

from stillnest import month
from stillnest.availability import Occupied, Reason
from stillnest.pricing import PricingRule

TODAY = D(2026, 8, 7)
BASE = 29000
MIN_NIGHTS = 3


def paint(**overrides):
    settings = {
        "today": TODAY,
        "base_price_cents": BASE,
        "base_min_nights": MIN_NIGHTS,
        "rules": (),
        "occupied": (),
    }
    settings.update(overrides)
    start = settings.pop("start", D(2026, 9, 1))
    end = settings.pop("end", D(2026, 10, 1))
    return month.days(start, end, **settings)


def by_night(days):
    return {day.night: day for day in days}


# --------------------------------------------------------------------- #
#  Parsing the month
# --------------------------------------------------------------------- #


def test_a_month_is_a_half_open_window():
    assert month.window("2026-09") == (D(2026, 9, 1), D(2026, 10, 1))


def test_december_rolls_into_the_next_year():
    assert month.window("2026-12") == (D(2026, 12, 1), D(2027, 1, 1))


def test_february_in_a_leap_year_has_twenty_nine_nights():
    start, end = month.window("2028-02")
    assert (end - start).days == 29


@pytest.mark.parametrize(
    "bad", ["2026-13", "2026-00", "2026-1", "26-09", "2026/09", "2026-09-01", "", "september"]
)
def test_a_malformed_month_is_refused_not_guessed(bad: str):
    with pytest.raises(ValueError):
        month.window(bad)


# --------------------------------------------------------------------- #
#  Painting the days
# --------------------------------------------------------------------- #


def test_one_entry_per_night_and_no_neighbours():
    days = paint()
    assert len(days) == 30
    assert days[0].night == D(2026, 9, 1)
    assert days[-1].night == D(2026, 9, 30)


def test_an_empty_month_is_entirely_available_at_the_base_rate():
    days = paint()
    assert all(day.available for day in days)
    assert {day.price_cents for day in days} == {BASE}
    assert {day.min_nights for day in days} == {MIN_NIGHTS}
    assert all(day.reason is None for day in days)


def test_a_booking_from_the_previous_month_still_takes_this_months_nights():
    days = by_night(paint(occupied=(Occupied(D(2026, 8, 28), D(2026, 9, 3), Reason.BOOKED),)))
    assert not days[D(2026, 9, 1)].available
    assert not days[D(2026, 9, 2)].available
    # The 3rd is the check-out day. It is not a night, and it is free.
    assert days[D(2026, 9, 3)].available


def test_a_booking_ending_on_the_first_leaves_the_first_free():
    days = by_night(paint(occupied=(Occupied(D(2026, 8, 20), D(2026, 9, 1), Reason.BOOKED),)))
    assert days[D(2026, 9, 1)].available


def test_a_booking_starting_on_the_last_night_takes_it():
    days = by_night(paint(occupied=(Occupied(D(2026, 9, 30), D(2026, 10, 4), Reason.BOOKED),)))
    assert not days[D(2026, 9, 30)].available
    assert days[D(2026, 9, 29)].available


def test_nights_belonging_to_the_next_month_are_not_painted():
    days = paint(occupied=(Occupied(D(2026, 9, 28), D(2026, 10, 20), Reason.BOOKED),))
    assert max(day.night for day in days) == D(2026, 9, 30)


def test_a_single_night_gap_between_two_bookings_shows_as_free():
    occupied = (
        Occupied(D(2026, 9, 5), D(2026, 9, 10), Reason.BOOKED),
        Occupied(D(2026, 9, 11), D(2026, 9, 15), Reason.BOOKED),
    )
    days = by_night(paint(occupied=occupied))
    assert days[D(2026, 9, 10)].available


def test_a_taken_night_says_why():
    occupied = (
        Occupied(D(2026, 9, 5), D(2026, 9, 7), Reason.BOOKED),
        Occupied(D(2026, 9, 12), D(2026, 9, 14), Reason.BLOCKED),
    )
    days = by_night(paint(occupied=occupied))
    assert days[D(2026, 9, 5)].reason == "booked"
    assert days[D(2026, 9, 12)].reason == "blocked"
    assert days[D(2026, 9, 20)].reason is None


def test_booked_wins_over_blocked_on_a_night_that_is_both():
    occupied = (
        Occupied(D(2026, 9, 1), D(2026, 9, 30), Reason.BLOCKED),
        Occupied(D(2026, 9, 10), D(2026, 9, 12), Reason.BOOKED),
    )
    days = by_night(paint(occupied=occupied))
    assert days[D(2026, 9, 10)].reason == "booked"
    assert days[D(2026, 9, 9)].reason == "blocked"


def test_yesterday_is_not_bookable():
    days = by_night(paint(start=D(2026, 8, 1), end=D(2026, 9, 1)))
    assert not days[D(2026, 8, 6)].available
    assert days[D(2026, 8, 6)].reason == "past"
    # Today itself is still bookable — a stay can begin tonight.
    assert days[TODAY].available


def test_a_past_night_is_still_priced():
    """Greyed out, but the number is there — the picker shows prices on every cell."""
    days = by_night(paint(start=D(2026, 8, 1), end=D(2026, 9, 1)))
    assert days[D(2026, 8, 1)].price_cents == BASE


def test_a_seasonal_rule_reprices_only_the_nights_it_covers():
    rules = (PricingRule(D(2026, 9, 10), D(2026, 9, 15), 41000, 5, "Deep winter"),)
    days = by_night(paint(rules=rules))

    assert days[D(2026, 9, 9)].price_cents == BASE
    assert days[D(2026, 9, 10)].price_cents == 41000
    assert days[D(2026, 9, 14)].price_cents == 41000
    # ends_on is exclusive.
    assert days[D(2026, 9, 15)].price_cents == BASE


def test_a_rules_minimum_shows_on_the_nights_a_stay_could_start():
    rules = (PricingRule(D(2026, 9, 10), D(2026, 9, 15), 41000, 5, "Deep winter"),)
    days = by_night(paint(rules=rules))

    assert days[D(2026, 9, 10)].min_nights == 5
    assert days[D(2026, 9, 10)].rule_label == "Deep winter"
    assert days[D(2026, 9, 9)].min_nights == MIN_NIGHTS
    assert days[D(2026, 9, 9)].rule_label is None


def test_a_rule_never_lowers_the_properties_own_minimum():
    rules = (PricingRule(D(2026, 9, 1), D(2026, 10, 1), 20000, 1, "Quiet week"),)
    days = paint(rules=rules)
    assert {day.min_nights for day in days} == {MIN_NIGHTS}
