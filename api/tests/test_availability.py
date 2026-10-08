"""Availability.

The tests that matter most here are the ones asserting a stay IS available.
Refusing something the database would have accepted loses a booking silently —
no error, no log, just a guest who goes elsewhere.
"""

from datetime import date as D

from stillnest.availability import Availability, Occupied, Reason, check, free_nights

TODAY = D(2026, 8, 7)


def booked(a: D, b: D) -> Occupied:
    return Occupied(a, b, Reason.BOOKED)


def blocked(a: D, b: D) -> Occupied:
    return Occupied(a, b, Reason.BLOCKED)


def test_an_open_range_is_available():
    result = check(D(2026, 9, 1), D(2026, 9, 5), today=TODAY, min_nights=2)
    assert result == Availability(available=True, reasons=(), nights=4)


def test_every_overlap_shape_is_refused():
    existing = (booked(D(2026, 9, 10), D(2026, 9, 20)),)
    shapes = {
        "starts inside": (D(2026, 9, 15), D(2026, 9, 25)),
        "ends inside": (D(2026, 9, 5), D(2026, 9, 15)),
        "contains": (D(2026, 9, 1), D(2026, 9, 30)),
        "contained by": (D(2026, 9, 12), D(2026, 9, 14)),
        "identical": (D(2026, 9, 10), D(2026, 9, 20)),
    }
    for label, (a, b) in shapes.items():
        result = check(a, b, today=TODAY, occupied=existing)
        assert not result.available, label
        assert Reason.BOOKED in result.reasons, label


def test_arriving_the_day_someone_leaves_is_ALLOWED():
    existing = (booked(D(2026, 9, 10), D(2026, 9, 15)),)
    result = check(D(2026, 9, 15), D(2026, 9, 18), today=TODAY, occupied=existing)
    assert result.available, "half-open ranges must permit same-day turnover"


def test_leaving_the_day_someone_arrives_is_ALLOWED():
    existing = (booked(D(2026, 9, 15), D(2026, 9, 20)),)
    result = check(D(2026, 9, 12), D(2026, 9, 15), today=TODAY, occupied=existing)
    assert result.available


def test_an_owner_block_reads_differently_from_a_booking():
    existing = (blocked(D(2026, 11, 1), D(2027, 4, 15)),)
    result = check(D(2026, 12, 1), D(2026, 12, 5), today=TODAY, occupied=existing)

    assert not result.available
    assert result.reasons == (Reason.BLOCKED,)
    # A guest should be told "the road is closed", not "someone else has it".
    assert Reason.BOOKED not in result.reasons


def test_a_stay_in_the_past_is_refused():
    result = check(D(2026, 8, 1), D(2026, 8, 4), today=TODAY)
    assert not result.available
    assert Reason.PAST in result.reasons


def test_a_stay_starting_today_is_fine():
    assert check(TODAY, D(2026, 8, 10), today=TODAY).available


def test_a_stay_shorter_than_the_minimum_is_refused():
    result = check(D(2026, 9, 1), D(2026, 9, 3), today=TODAY, min_nights=4)
    assert not result.available
    assert Reason.TOO_SHORT in result.reasons
    assert result.nights == 2  # still reported, so the UI can say "2 of 4"


def test_too_many_guests_is_refused():
    result = check(D(2026, 9, 1), D(2026, 9, 5), today=TODAY, guests=6, capacity=4)
    assert not result.available
    assert Reason.CAPACITY in result.reasons


def test_all_applicable_reasons_come_back_together():
    # Telling someone "too short", then "already booked" after they fix it, is a
    # worse experience than saying both at once.
    result = check(
        D(2026, 9, 10),
        D(2026, 9, 11),
        today=TODAY,
        occupied=(booked(D(2026, 9, 5), D(2026, 9, 20)),),
        min_nights=3,
        guests=9,
        capacity=2,
    )
    assert set(result.reasons) == {Reason.TOO_SHORT, Reason.CAPACITY, Reason.BOOKED}


def test_an_inverted_range_short_circuits():
    result = check(D(2026, 9, 10), D(2026, 9, 8), today=TODAY, min_nights=4)
    assert result.reasons == (Reason.INVERTED,)
    assert result.nights == 0


def test_a_same_day_range_is_inverted_not_merely_too_short():
    assert check(D(2026, 9, 10), D(2026, 9, 10), today=TODAY).reasons == (
        Reason.INVERTED,
    )


def test_the_engine_has_no_hidden_clock():
    # `today` is injected, so the same inputs answer the same way forever.
    dates = (D(2030, 1, 1), D(2030, 1, 5))
    assert check(*dates, today=D(2029, 12, 31)).available
    assert not check(*dates, today=D(2030, 6, 1)).available


class TestCalendar:
    def test_a_single_night_gap_between_bookings_shows_as_free(self):
        occupied = (
            booked(D(2026, 9, 1), D(2026, 9, 5)),
            booked(D(2026, 9, 6), D(2026, 9, 10)),
        )
        free = free_nights(D(2026, 9, 1), D(2026, 9, 11), occupied)
        assert D(2026, 9, 5) in free
        assert D(2026, 9, 4) not in free
        assert D(2026, 9, 6) not in free

    def test_the_checkout_night_of_a_booking_is_free(self):
        free = free_nights(
            D(2026, 9, 1), D(2026, 9, 11), (booked(D(2026, 9, 1), D(2026, 9, 5)),)
        )
        assert D(2026, 9, 5) in free

    def test_an_empty_month_is_entirely_free(self):
        assert len(free_nights(D(2026, 9, 1), D(2026, 10, 1), ())) == 30
