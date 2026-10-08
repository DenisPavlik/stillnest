"""Turning words into vectors.

Search here is not keyword matching. Someone types "alone by a lake, snow, no
signal" and none of those words appear in a listing the way they typed them —
the match has to happen in meaning, which is what an embedding is for.

`text-embedding-3-small`, 1536 dimensions, matching the `vector(1536)` column.
Both sides of a comparison must come from the same model: a query embedded by
one model and a property embedded by another produce cosine distances that look
plausible and mean nothing.
"""

from __future__ import annotations

import os
from dataclasses import dataclass

import httpx

MODEL = "text-embedding-3-small"
DIMENSIONS = 1536
ENDPOINT = "https://api.openai.com/v1/embeddings"


class EmbeddingError(RuntimeError):
    pass


@dataclass(frozen=True, slots=True)
class PropertyText:
    """The text a property is embedded from.

    Deliberately assembled rather than using the description alone. The
    measurements are the product, so they belong in the vector — "no signal"
    has to be findable even though the description may never use the phrase.
    """

    name: str
    tagline: str | None
    description: str
    biome: str
    region: str
    country: str
    solitude_km: float
    noise_db: int
    connectivity: str
    bortle: int

    def to_prompt(self) -> str:
        signal = {
            "none": "no phone signal at all, no cellular, no broadband",
            "weak": "weak intermittent phone signal, no broadband",
            "full": "full phone signal and broadband",
        }[self.connectivity]

        dark = (
            "extremely dark night sky, the Milky Way clearly visible"
            if self.bortle <= 3
            else "moderately dark night sky"
        )

        quiet = (
            "profoundly quiet, you can hear your own breathing"
            if self.noise_db <= 30
            else "quiet, well below any town"
        )

        return "\n".join(
            [
                f"{self.name}. {self.tagline or ''}".strip(),
                self.description,
                f"Landscape: {self.biome}. Located in {self.region}, {self.country}.",
                f"The nearest permanent human dwelling is {self.solitude_km:g} km away.",
                f"Ambient sound level {self.noise_db} dB — {quiet}.",
                f"Connectivity: {signal}.",
                f"Bortle class {self.bortle} — {dark}.",
            ]
        )


def _api_key() -> str:
    key = os.environ.get("OPENAI_API_KEY")
    if not key:
        raise EmbeddingError("OPENAI_API_KEY is not configured")
    return key


async def embed(texts: list[str]) -> list[list[float]]:
    """Embed a batch. One request for many strings — the API takes a list, and
    a request per property would be a dozen round trips for no reason."""
    if not texts:
        return []

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            ENDPOINT,
            headers={"Authorization": f"Bearer {_api_key()}"},
            json={"model": MODEL, "input": texts, "dimensions": DIMENSIONS},
        )

    if response.status_code != 200:
        # Never surface the upstream body — it can echo the request, and the
        # request is on its way to a log somewhere.
        raise EmbeddingError(f"embedding request failed with {response.status_code}")

    data = response.json()["data"]
    # The API documents order preservation, but the whole search silently
    # scrambles if that ever changes, so sort by the index it returns.
    ordered = sorted(data, key=lambda row: row["index"])
    return [row["embedding"] for row in ordered]


async def embed_one(text: str) -> list[float]:
    vectors = await embed([text])
    if not vectors:
        raise EmbeddingError("no embedding returned")
    return vectors[0]


def to_pgvector(vector: list[float]) -> str:
    """pgvector's text input format. asyncpg has no native codec for it, so the
    value crosses as a string and Postgres casts it."""
    return "[" + ",".join(repr(float(x)) for x in vector) + "]"
