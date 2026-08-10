"""Fill in missing environment variables from the repo's dotfiles.

Only matters locally. On Vercel the platform injects everything and these files
do not exist, so this is a no-op there — but without it a bare `pnpm py:dev`
answers `database_configured: false` and 500s every authenticated route with
"INTERNAL_API_SECRET is not configured". That failure looks like a code bug
rather than a missing export, and costs whoever hits it twenty minutes.

**Existing values always win.** A real environment must never be overwritten by
a stale file, so this only fills blanks. `.env.local` is read after `.env`
because that is the order Next.js resolves them in, and the two halves of the
app must not disagree about which value is current.
"""

from __future__ import annotations

import os
from pathlib import Path

FILES = (".env", ".env.local")


def load_dotfiles(root: Path | None = None) -> None:
    base = root or Path(__file__).resolve().parents[2]

    for name in FILES:
        path = base / name
        if not path.exists():
            continue

        for line in path.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))
