import math
import re
from typing import Any


def normalize_boundary_segment(text: str) -> str:
    """
    Normalize a single hierarchy cell into a boundary code segment.

    User input is accepted in any casing. Output is ALL CAPS with multi-word values
    joined without separator (e.g. ``New Delhi`` → ``NEWDELHI``).

    Spaces, underscores, and slashes are removed during normalization.
    Hierarchy levels are joined with ``_``.
    """
    if not text or not str(text).strip():
        return ""

    cleaned = re.sub(r"[_\-/]+", " ", str(text).strip())
    cleaned = re.sub(r"\s+", " ", cleaned)
    parts = [part.upper() for part in cleaned.split(" ") if part]
    return "".join(parts)


def preserve_boundary_label(cell: Any) -> str:
    """Return the user-provided label with outer whitespace trimmed and internal runs collapsed."""
    if cell is None:
        return ""
    if isinstance(cell, float) and math.isnan(cell):
        return ""

    raw = str(cell).strip()
    if not raw:
        return ""

    return re.sub(r"\s+", " ", raw)


def build_boundary_full_code(*segments: str) -> str:
    """Join normalized non-empty segments with ``_``."""
    normalized = [segment for segment in segments if segment]
    return "_".join(normalized)
