"""The HTTP surface: what Next.js actually receives.

The engine is tested pure and the repository is tested against real rows; what
is left is the wiring — the secret, the status codes, and the one rule that is
easy to get wrong under pressure: **an unavailable range is a 200.** A guest
asking about nights that are taken has asked a reasonable question and deserves
an answer with reasons in it, not a 4xx the UI has to translate.
"""

from __future__ import annotations

import os
from datetime import date, timedelta

import asyncpg
import pytest
from fastapi.testclient import TestClient

from index import app
from stillnest.repository import load_property

SECRET = "test-internal-secret"
AUTH = {"x-internal-secret": SECRET}


@pytest.fixture
def client(monkeypatch: pytest.MonkeyPatch) -> TestClient:
    monkeypatch.setenv("INTERNAL_API_SECRET", SECRET)
    return TestClient(app)


@pytest.fixture
def a_property(query) -> dict[str, object]:
    """A real seeded property, as facts."""

    async def body(conn: asyncpg.Connection):
        slug = await conn.fetchval("SELECT slug FROM properties ORDER BY slug LIMIT 1")
        return await load_property(conn, slug)

    facts = query(body)
    return {
        "id": facts.id,
        "slug": facts.slug,
        "base_price_cents": facts.base_price_cents,
        "min_nights": facts.min_nights,
        "capacity": facts.capacity,
    }


def far_future(offset_days: int = 400) -> date:
    """Well past anything the seed touches, so these tests do not depend on it."""
    return date.today() + timedelta(days=offset_days)


# --------------------------------------------------------------------- #
#  The gate
# --------------------------------------------------------------------- #


def test_health_needs_no_secret(client: TestClient):
    response = client.get("/api/py/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.json()["database_configured"] is bool(os.environ.get("DATABASE_URL"))


def test_availability_without_the_secret_is_refused(client: TestClient):
    response = client.post(
        "/api/py/availability",
        json={
            "property_id": "blackwater-11",
            "check_in": "2027-05-01",
            "check_out": "2027-05-04",
            "guests": 2,
        },
    )
    assert response.status_code == 401


def test_the_calendar_without_the_secret_is_refused(client: TestClient):
    response = client.get("/api/py/calendar/blackwater-11", params={"month": "2027-05"})
    assert response.status_code == 401


# --------------------------------------------------------------------- #
#  POST /availability
# --------------------------------------------------------------------- #


def test_a_free_range_is_priced(client: TestClient, a_property):
    check_in, check_out = far_future(), far_future() + timedelta(days=4)
    response = client.post(
        "/api/py/availability",
        headers=AUTH,
        json={
            "property_id": a_property["slug"],
            "check_in": check_in.isoformat(),
            "check_out": check_out.isoformat(),
            "guests": 1,
        },
    )
    assert response.status_code == 200
    body = response.json()

    assert body["available"] is True
    assert body["reasons"] == []
    assert len(body["nights"]) == 4
    assert body["nights"][0]["night"] == check_in.isoformat()
    # The check-out day is not a night.
    assert body["nights"][-1]["night"] == (check_out - timedelta(days=1)).isoformat()
    assert body["subtotal_cents"] == sum(night["price_cents"] for night in body["nights"])
    assert body["total_cents"] == body["subtotal_cents"] + body["fees_cents"]
    assert body["min_nights"] >= 1


def test_a_slug_and_a_uuid_get_the_same_quote(client: TestClient, a_property):
    payload = {
        "check_in": far_future().isoformat(),
        "check_out": (far_future() + timedelta(days=4)).isoformat(),
        "guests": 1,
    }
    by_slug = client.post(
        "/api/py/availability", headers=AUTH, json={**payload, "property_id": a_property["slug"]}
    )
    by_uuid = client.post(
        "/api/py/availability", headers=AUTH, json={**payload, "property_id": a_property["id"]}
    )
    assert by_slug.json() == by_uuid.json()


def test_a_stay_shorter_than_the_minimum_is_answered_not_rejected(client: TestClient, a_property):
    """200, with the reason and the price. The guest can see what one more night buys."""
    check_in = far_future()
    response = client.post(
        "/api/py/availability",
        headers=AUTH,
        json={
            "property_id": a_property["slug"],
            "check_in": check_in.isoformat(),
            "check_out": (check_in + timedelta(days=1)).isoformat(),
            "guests": 1,
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["available"] is False
    assert "min_nights" in body["reasons"]
    assert body["subtotal_cents"] > 0


def test_too_many_guests_is_a_reason_not_an_error(client: TestClient, a_property):
    check_in = far_future()
    response = client.post(
        "/api/py/availability",
        headers=AUTH,
        json={
            "property_id": a_property["slug"],
            "check_in": check_in.isoformat(),
            "check_out": (check_in + timedelta(days=5)).isoformat(),
            "guests": int(a_property["capacity"]) + 1,
        },
    )
    assert response.status_code == 200
    assert response.json()["reasons"] == ["capacity"]


def test_a_range_in_the_past_says_past(client: TestClient, a_property):
    check_in = date.today() - timedelta(days=10)
    response = client.post(
        "/api/py/availability",
        headers=AUTH,
        json={
            "property_id": a_property["slug"],
            "check_in": check_in.isoformat(),
            "check_out": (check_in + timedelta(days=5)).isoformat(),
            "guests": 1,
        },
    )
    assert response.status_code == 200
    assert "past" in response.json()["reasons"]


def test_an_inverted_range_is_answered_with_a_reason(client: TestClient, a_property):
    check_in = far_future()
    response = client.post(
        "/api/py/availability",
        headers=AUTH,
        json={
            "property_id": a_property["slug"],
            "check_in": check_in.isoformat(),
            "check_out": (check_in - timedelta(days=2)).isoformat(),
            "guests": 1,
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body == {
        **body,
        "available": False,
        "reasons": ["inverted"],
        "nights": [],
        "subtotal_cents": 0,
        "total_cents": 0,
    }


def test_a_missing_property_is_the_only_404(client: TestClient, database_url: str):
    response = client.post(
        "/api/py/availability",
        headers=AUTH,
        json={
            "property_id": "there-is-no-such-house",
            "check_in": far_future().isoformat(),
            "check_out": (far_future() + timedelta(days=3)).isoformat(),
            "guests": 1,
        },
    )
    assert response.status_code == 404


def test_zero_guests_is_a_bad_request(client: TestClient):
    response = client.post(
        "/api/py/availability",
        headers=AUTH,
        json={
            "property_id": "blackwater-11",
            "check_in": "2027-05-01",
            "check_out": "2027-05-04",
            "guests": 0,
        },
    )
    assert response.status_code == 422


# --------------------------------------------------------------------- #
#  GET /calendar/{property_id}
# --------------------------------------------------------------------- #


def test_a_month_comes_back_night_by_night(client: TestClient, a_property):
    response = client.get(
        f"/api/py/calendar/{a_property['slug']}", headers=AUTH, params={"month": "2027-05"}
    )
    assert response.status_code == 200
    body = response.json()

    assert body["property_id"] == a_property["id"], "the canonical uuid, not the slug"
    assert body["slug"] == a_property["slug"]
    assert body["month"] == "2027-05"
    assert len(body["days"]) == 31
    assert body["days"][0]["night"] == "2027-05-01"
    assert body["days"][-1]["night"] == "2027-05-31"
    assert all(day["price_cents"] > 0 for day in body["days"])


def test_february_in_a_leap_year_returns_twenty_nine_days(client: TestClient, a_property):
    response = client.get(
        f"/api/py/calendar/{a_property['slug']}", headers=AUTH, params={"month": "2028-02"}
    )
    assert len(response.json()["days"]) == 29


def test_december_does_not_run_into_the_next_year(client: TestClient, a_property):
    response = client.get(
        f"/api/py/calendar/{a_property['slug']}", headers=AUTH, params={"month": "2027-12"}
    )
    days = response.json()["days"]
    assert len(days) == 31
    assert days[-1]["night"] == "2027-12-31"


def test_the_calendar_takes_a_uuid_too(client: TestClient, a_property):
    by_uuid = client.get(
        f"/api/py/calendar/{a_property['id']}", headers=AUTH, params={"month": "2027-05"}
    )
    by_slug = client.get(
        f"/api/py/calendar/{a_property['slug']}", headers=AUTH, params={"month": "2027-05"}
    )
    assert by_uuid.json() == by_slug.json()


@pytest.mark.parametrize("bad", ["2027-13", "2027-5", "May", "2027-05-01"])
def test_a_malformed_month_is_refused(client: TestClient, bad: str):
    response = client.get(
        "/api/py/calendar/blackwater-11", headers=AUTH, params={"month": bad}
    )
    assert response.status_code == 422


def test_the_calendar_404s_on_a_property_that_does_not_exist(
    client: TestClient, database_url: str
):
    response = client.get(
        "/api/py/calendar/there-is-no-such-house", headers=AUTH, params={"month": "2027-05"}
    )
    assert response.status_code == 404
