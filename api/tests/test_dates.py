"""The off-by-one tests. If these ever go red, double-booking is possible."""

from datetime import date

from stillnest.dates import night_count, nights, ranges_overlap

D = date


def test_nights_excludes_checkout_day():
    assert nights(D(2026, 8, 1), D(2026, 8, 4)) == [
        D(2026, 8, 1),
        D(2026, 8, 2),
        D(2026, 8, 3),
    ]
    assert night_count(D(2026, 8, 1), D(2026, 8, 4)) == 3


def test_same_day_stay_is_zero_nights():
    assert nights(D(2026, 8, 1), D(2026, 8, 1)) == []
    assert night_count(D(2026, 8, 1), D(2026, 8, 1)) == 0


def test_adjacent_stays_do_not_overlap():
    """Guest A checks out on the 5th, guest B checks in on the 5th. Allowed."""
    assert not ranges_overlap(
        D(2026, 8, 1), D(2026, 8, 5), D(2026, 8, 5), D(2026, 8, 9)
    )


def test_overlap_variants_all_detected():
    existing = (D(2026, 8, 10), D(2026, 8, 20))

    starts_inside = (D(2026, 8, 15), D(2026, 8, 25))
    ends_inside = (D(2026, 8, 5), D(2026, 8, 15))
    contains = (D(2026, 8, 1), D(2026, 8, 30))
    contained = (D(2026, 8, 12), D(2026, 8, 14))
    identical = existing

    for candidate in (starts_inside, ends_inside, contains, contained, identical):
        assert ranges_overlap(*existing, *candidate), candidate


def test_clearly_separate_ranges_do_not_overlap():
    assert not ranges_overlap(
        D(2026, 8, 1), D(2026, 8, 5), D(2026, 9, 1), D(2026, 9, 5)
    )
