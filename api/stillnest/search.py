"""Search by feeling.

A visitor types a sentence — "alone by a lake, snow, no signal" — and gets houses
back. The sentence is embedded, compared against every property's vector by
cosine distance, and the result is then **narrowed by hard filters in SQL**.

That order is the whole design, and it is worth being explicit about why:

**Similarity ranks, it never admits.** If someone asks for six guests, a house
that sleeps two must not appear no matter how poetically it matches. Vector
search is a good way to sort a set and a terrible way to decide membership in
one, because it will always return *something* — there is no such thing as "no
match" in a cosine distance. So the filters run as a WHERE clause and the
embedding only decides the order of what survives.
"""

from __future__ import annotations

from dataclasses import dataclass

import asyncpg

from stillnest.embeddings import to_pgvector


@dataclass(frozen=True, slots=True)
class SearchFilters:
    biome: str | None = None
    guests: int | None = None
    max_solitude_km: float | None = None
    connectivity: str | None = None


@dataclass(frozen=True, slots=True)
class Hit:
    property_id: str
    slug: str
    score: float


async def semantic_search(
    conn: asyncpg.Connection,
    query_vector: list[float],
    filters: SearchFilters,
    limit: int,
) -> list[Hit]:
    clauses = ["status = 'live'", "embedding IS NOT NULL"]
    args: list[object] = [to_pgvector(query_vector)]

    def placeholder(value: object) -> str:
        args.append(value)
        return f"${len(args)}"

    if filters.biome:
        clauses.append(f"biome = {placeholder(filters.biome)}::biome")
    if filters.guests is not None:
        clauses.append(f"capacity >= {placeholder(filters.guests)}")
    if filters.max_solitude_km is not None:
        clauses.append(f"solitude_km <= {placeholder(filters.max_solitude_km)}")
    if filters.connectivity:
        clauses.append(
            f"connectivity = {placeholder(filters.connectivity)}::connectivity"
        )

    limit_ref = placeholder(limit)

    # `<=>` is pgvector's cosine distance: 0 identical, 2 opposite. The HNSW
    # index is built for this operator specifically — using a different distance
    # here would silently fall back to a sequential scan.
    sql = f"""
        SELECT id, slug, 1 - (embedding <=> $1::vector) AS score
        FROM properties
        WHERE {" AND ".join(clauses)}
        ORDER BY embedding <=> $1::vector
        LIMIT {limit_ref}
    """

    rows = await conn.fetch(sql, *args)
    return [
        Hit(property_id=str(row["id"]), slug=row["slug"], score=float(row["score"]))
        for row in rows
    ]
