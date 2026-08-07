"""The two dependency lists must not drift.

`api/requirements.txt` is what **Vercel** installs when it builds the Python
service. `pyproject.toml` is what **uv** installs locally. Nothing in either file
makes the other true, so without this test the two quietly diverge and the
symptom is the worst kind: it works on the machine it was written on and fails
only in production, at import time, on a dependency nobody thought about.

Cheap to check, so it is checked.
"""

from __future__ import annotations

import re
import tomllib
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
REQUIREMENTS = REPO_ROOT / "api" / "requirements.txt"
PYPROJECT = REPO_ROOT / "pyproject.toml"


def _requirements() -> set[str]:
    lines = REQUIREMENTS.read_text().splitlines()
    return {
        line.strip()
        for line in lines
        if line.strip() and not line.lstrip().startswith("#")
    }


def _pyproject_dependencies() -> set[str]:
    data = tomllib.loads(PYPROJECT.read_text())
    return {dep.strip() for dep in data["project"]["dependencies"]}


def test_both_files_list_the_same_runtime_dependencies():
    assert _requirements() == _pyproject_dependencies(), (
        "api/requirements.txt and pyproject.toml disagree. Vercel installs the "
        "former and uv installs the latter, so a difference means production "
        "runs code that was never tested locally."
    )


def test_every_runtime_dependency_is_pinned_exactly():
    # A floating version turns a deploy into a roll of the dice: the build that
    # passed yesterday can fail today without a single line changing.
    for spec in _requirements():
        assert re.fullmatch(r"[A-Za-z0-9_.\-\[\]]+==[\w.]+", spec), (
            f"{spec!r} is not pinned with ==. Pin it."
        )
