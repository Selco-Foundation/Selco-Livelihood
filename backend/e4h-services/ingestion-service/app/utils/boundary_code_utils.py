import math
import re
from typing import Any


def clean_boundary_name(raw) -> str:
    """The name a boundary code is built from - the same cleaning as the LGD onboarding
    script's clean_name (scripts/lgd_common.py), so a sheet row and the onboarding build the
    same code for the same place and the upload finds it instead of creating a duplicate.

    Brackets become spaces (keeping the qualifier: 'Kakinada (Rural)' -> 'Kakinada Rural'),
    '&' becomes 'and', dots, apostrophes and '*' are dropped ('G.Madugula' -> 'GMadugula'),
    ',', '_' and '/' become spaces, a leading 'The ' is removed, and a name typed in capitals
    is title-cased unless it looks like an initialism ('K G F'). Hyphens are kept; the code
    builders treat them as word breaks. Only the code uses this - the label keeps the name as
    typed.
    """
    name = re.sub(r"[()\[\]]", " ", str(raw).strip())
    name = name.replace("&", " and ").replace(".", "").replace("'", "").replace("*", "")
    name = re.sub(r"[,_/]", " ", name)
    name = re.sub(r"\s+", " ", name).strip()
    if name.isupper() and all(len(word) > 3 for word in name.split()):
        name = name.title()
    return re.sub(r"^The\s+", "", name)


def normalize_boundary_segment(text: str) -> str:
    """
    Normalize a single hierarchy cell into a boundary code segment.

    User input is accepted in any casing. Output is ALL CAPS with multi-word values
    joined by ``/`` (e.g. ``New Delhi`` → ``NEW/DELHI``), so the original words can be
    recovered later by splitting on ``/``.

    The name is first cleaned with ``clean_boundary_name`` (the onboarding script's rules), so
    punctuation never reaches a code. Spaces, underscores, and hyphens are treated as word
    separators and are replaced by ``/`` during normalization. Hierarchy levels are joined with ``_``, which never
    appears within a segment, so a full code can be unambiguously split on ``_`` first
    and then on ``/``.
    """
    if not text or not str(text).strip():
        return ""

    cleaned = re.sub(r"[_\-/]+", " ", clean_boundary_name(text))
    cleaned = re.sub(r"\s+", " ", cleaned)
    parts = [part.upper() for part in cleaned.split(" ") if part]
    return "/".join(parts)


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
