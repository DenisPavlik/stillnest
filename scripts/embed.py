"""Backfill embeddings for the catalog.

    uv run python scripts/embed.py          # only properties without a vector
    uv run python scripts/embed.py --all    # re-embed everything

Embedding happens on write, not on read — the expensive call runs once per edit
instead of once per visitor, which is the entire reason search is fast.

Rerunnable by design: by default it only touches properties whose `embedding` is
NULL, so a run interrupted halfway costs nothing to finish.
"""

from __future__ import annotations

import asyncio
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "api"))

from stillnest.embeddings import embed  # noqa: E402
from stillnest.repository import (  # noqa: E402
    connection,
    load_property_text,
    slugs_needing_embedding,
    store_embedding,
)


def load_env() -> None:
    """Read .env and .env.local without a dependency. .env.local wins, matching
    how Next.js resolves them, so the two halves of the app cannot disagree."""
    root = Path(__file__).resolve().parents[1]
    for name in (".env", ".env.local"):
        path = root / name
        if not path.exists():
            continue
        for line in path.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            os.environ[key.strip()] = value.strip().strip('"').strip("'")


async def main() -> int:
    load_env()
    only_missing = "--all" not in sys.argv

    async with connection() as conn:
        slugs = await slugs_needing_embedding(conn, only_missing=only_missing)
        if not slugs:
            print("nothing to embed — every live property already has a vector")
            return 0

        print(f"embedding {len(slugs)} propert{'y' if len(slugs) == 1 else 'ies'}…")

        texts = []
        for slug in slugs:
            row = await load_property_text(conn, slug)
            if row is None:
                print(f"  ! {slug} vanished between the two queries, skipping")
                continue
            texts.append((slug, row.to_prompt()))

        # One request for the whole batch. A request per property would be a
        # dozen round trips to save nothing.
        vectors = await embed([text for _, text in texts])

        for (slug, _), vector in zip(texts, vectors, strict=True):
            await store_embedding(conn, slug, vector)
            print(f"  ✓ {slug}  ({len(vector)} dims)")

    print("done")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
