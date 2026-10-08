"""Search by feeling.

The tests that matter are not about ranking — ranking is a model's opinion and
pinning it would break on every model update for no benefit. What is worth
asserting is the **contract**: that the filters are a WHERE clause and not a
suggestion, and that the SQL is built with parameters rather than string
concatenation.

Ranking quality is checked by hand against the real index; see the notes.
"""

from __future__ import annotations

import pytest

from stillnest.embeddings import PropertyText, to_pgvector
from stillnest.search import SearchFilters


class FakeConnection:
    """Captures the SQL and its arguments instead of running them."""

    def __init__(self) -> None:
        self.sql: str = ""
        self.args: tuple[object, ...] = ()

    async def fetch(self, sql: str, *args: object):
        self.sql = sql
        self.args = args
        return []


@pytest.mark.asyncio
async def test_filters_become_sql_conditions_not_ranking_hints():
    from stillnest.search import semantic_search

    conn = FakeConnection()
    await semantic_search(
        conn,  # type: ignore[arg-type]
        [0.1] * 1536,
        SearchFilters(biome="snow", guests=4, connectivity="none", max_solitude_km=50),
        limit=6,
    )

    # Every filter must narrow the set, so every one is a WHERE condition.
    assert "biome =" in conn.sql
    assert "capacity >=" in conn.sql
    assert "connectivity =" in conn.sql
    assert "solitude_km <=" in conn.sql

    # Similarity may only order what survived.
    assert "ORDER BY embedding <=>" in conn.sql


@pytest.mark.asyncio
async def test_only_live_properties_with_a_vector_are_searchable():
    from stillnest.search import semantic_search

    conn = FakeConnection()
    await semantic_search(conn, [0.0] * 1536, SearchFilters(), limit=3)  # type: ignore[arg-type]

    assert "status = 'live'" in conn.sql
    # A property that has never been embedded would otherwise sort by a NULL
    # distance and surface in an arbitrary position.
    assert "embedding IS NOT NULL" in conn.sql


@pytest.mark.asyncio
async def test_every_filter_value_is_a_bound_parameter():
    from stillnest.search import semantic_search

    conn = FakeConnection()
    hostile = "snow'; DROP TABLE properties; --"
    await semantic_search(conn, [0.0] * 1536, SearchFilters(biome=hostile), limit=3)  # type: ignore[arg-type]

    assert hostile not in conn.sql, "filter values must never be concatenated into SQL"
    assert hostile in conn.args


@pytest.mark.asyncio
async def test_the_cosine_operator_matches_the_index():
    from stillnest.search import semantic_search

    conn = FakeConnection()
    await semantic_search(conn, [0.0] * 1536, SearchFilters(), limit=3)  # type: ignore[arg-type]

    # The HNSW index is built with vector_cosine_ops. Any other distance
    # operator here silently falls back to a sequential scan.
    assert "<=>" in conn.sql


def test_pgvector_literal_round_trips():
    assert to_pgvector([1.0, -0.5]) == "[1.0,-0.5]"
    assert to_pgvector([]) == "[]"


class TestPropertyText:
    """The embedded text must carry the measurements, not just the prose."""

    def make(self, **overrides) -> PropertyText:
        base = dict(
            name="Hollowmoss 04",
            tagline="Old spruce, black standing water.",
            description="A low timber house.",
            biome="forest",
            region="Jämtland",
            country="Sweden",
            solitude_km=34.0,
            noise_db=32,
            connectivity="none",
            bortle=2,
        )
        base.update(overrides)
        return PropertyText(**base)  # type: ignore[arg-type]

    def test_no_signal_is_findable_even_though_the_prose_never_says_it(self):
        prompt = self.make().to_prompt()
        assert "no phone signal" in prompt
        assert "no broadband" in prompt

    def test_a_dark_sky_is_described_in_words_a_person_would_search_for(self):
        assert "Milky Way" in self.make(bortle=2).to_prompt()
        assert "Milky Way" not in self.make(bortle=7).to_prompt()

    def test_the_distance_is_stated_plainly(self):
        assert "34 km away" in self.make().to_prompt()

    def test_full_signal_is_not_described_as_an_absence(self):
        prompt = self.make(connectivity="full").to_prompt()
        assert "full phone signal" in prompt
        assert "no phone signal" not in prompt
