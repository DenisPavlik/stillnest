"""Pricing. These are the tests that decide whether a guest is charged correctly."""

from datetime import date as D

import pytest

from stillnest.pricing import PricingRule, effective_min_nights, quote, rule_for

WINTER = PricingRule(
    starts_on=D(2026, 12, 1),
    ends_on=D(2027, 3, 1),
    price_cents=41_850,
    min_nights=4,
    label="Deep winter",
)
NEW_YEAR = PricingRule(
    starts_on=D(2026, 12, 28),
    ends_on=D(2027, 1, 3),
    price_cents=60_000,
    min_nights=5,
    label="New year",
)
BASE = 31_000


def test_a_stay_outside_every_rule_bills_the_base_rate():
    q = quote(D(2026, 10, 1), D(2026, 10, 4), BASE, 2)

    assert q.night_count == 3  # check-out day is not billed
    assert [n.price_cents for n in q.nights] == [BASE] * 3
    assert q.subtotal_cents == 93_000
    assert all(n.rule_label is None for n in q.nights)


def test_each_night_is_priced_on_its_own_rate_across_a_boundary():
    # Two nights before winter opens, two inside it.
    q = quote(D(2026, 11, 29), D(2026, 12, 3), BASE, 2, (WINTER,))

    assert [n.price_cents for n in q.nights] == [BASE, BASE, 41_850, 41_850]
    assert [n.rule_label for n in q.nights] == [None, None, "Deep winter", "Deep winter"]
    assert q.subtotal_cents == BASE * 2 + 41_850 * 2


def test_the_subtotal_is_always_the_sum_of_the_nights():
    q = quote(D(2026, 11, 25), D(2027, 1, 8), BASE, 2, (WINTER, NEW_YEAR))
    assert q.subtotal_cents == sum(n.price_cents for n in q.nights)
    assert q.total_cents == q.subtotal_cents + q.fees_cents


def test_the_most_specific_rule_wins_when_two_overlap():
    # New Year sits inside deep winter. Whoever entered both meant the short one
    # to win, and row order must not decide it.
    assert rule_for(D(2026, 12, 30), (WINTER, NEW_YEAR)) is NEW_YEAR
    assert rule_for(D(2026, 12, 30), (NEW_YEAR, WINTER)) is NEW_YEAR

    # …and a night that only winter covers still takes winter.
    assert rule_for(D(2027, 1, 20), (WINTER, NEW_YEAR)) is WINTER


def test_rule_end_dates_are_exclusive():
    assert WINTER.covers(D(2026, 12, 1)) is True
    assert WINTER.covers(D(2027, 2, 28)) is True
    assert WINTER.covers(D(2027, 3, 1)) is False


def test_minimum_stay_takes_the_strictest_rule_the_stay_touches():
    # One single night inside New Year is enough to pull in its 5-night minimum,
    # otherwise a guest dodges the rule by starting a day early.
    assert effective_min_nights(D(2026, 12, 27), D(2026, 12, 29), 2, (WINTER, NEW_YEAR)) == 5
    assert effective_min_nights(D(2026, 12, 5), D(2026, 12, 9), 2, (WINTER,)) == 4
    assert effective_min_nights(D(2026, 10, 5), D(2026, 10, 9), 2, (WINTER,)) == 2


def test_a_rule_without_a_minimum_does_not_lower_the_base():
    summer = PricingRule(D(2027, 6, 15), D(2027, 8, 20), 37_200, None, "Light season")
    assert effective_min_nights(D(2027, 7, 1), D(2027, 7, 4), 3, (summer,)) == 3


def test_a_zero_night_range_prices_nothing_rather_than_erroring():
    q = quote(D(2026, 10, 1), D(2026, 10, 1), BASE, 2)
    assert q.night_count == 0
    assert q.subtotal_cents == 0
    assert q.total_cents == 0


def test_money_is_only_ever_integers():
    q = quote(D(2026, 11, 29), D(2026, 12, 3), BASE, 2, (WINTER,))
    values = [n.price_cents for n in q.nights] + [
        q.subtotal_cents,
        q.fees_cents,
        q.total_cents,
    ]
    assert all(isinstance(v, int) and not isinstance(v, bool) for v in values)


def test_fees_are_added_but_never_invented():
    assert quote(D(2026, 10, 1), D(2026, 10, 3), BASE, 2).fees_cents == 0

    with_fee = quote(D(2026, 10, 1), D(2026, 10, 3), BASE, 2, fees_cents=4_500)
    assert with_fee.total_cents == with_fee.subtotal_cents + 4_500


@pytest.mark.parametrize("bad", [-1, -100_000])
def test_negative_money_is_refused(bad: int):
    with pytest.raises(ValueError):
        quote(D(2026, 10, 1), D(2026, 10, 3), bad, 2)
    with pytest.raises(ValueError):
        quote(D(2026, 10, 1), D(2026, 10, 3), BASE, 2, fees_cents=bad)


def test_a_long_stay_sums_exactly():
    # Property-style check: 60 nights spanning both rules, no drift.
    q = quote(D(2026, 11, 20), D(2027, 1, 19), BASE, 2, (WINTER, NEW_YEAR))
    assert q.night_count == 60
    assert q.subtotal_cents == sum(n.price_cents for n in q.nights)
    assert q.min_nights == 5  # the stay crosses New Year
