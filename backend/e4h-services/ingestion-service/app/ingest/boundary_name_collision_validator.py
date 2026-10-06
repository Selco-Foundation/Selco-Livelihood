from collections import defaultdict
from typing import Dict, List, Set, Tuple

import pandas as pd

from app.ingest.service.validator import Validator
from app.utils.boundary_code_utils import (
    build_boundary_full_code,
    normalize_boundary_segment,
    preserve_boundary_label,
)

# (level, the levels above it that make up its parent's full code)
_LEVELS: List[Tuple[str, Tuple[str, ...]]] = [
    ("State", ("Country",)),
    ("District", ("Country", "State")),
    ("Block", ("Country", "State", "District")),
]


class BoundaryNameCollisionValidator(Validator):
    """Fails rows where one name is used under two different parents in the same file.

    BoundaryDataProcessor keys its per-level dictionaries by the bare segment name,
    so within a single ingestion only the first boundary with a given name is
    created, linked and localised - any later one under a different parent is
    dropped, while its row is still reported as a success.

    Rather than let that happen quietly, reject the file and name the conflict.
    Two causes, both worth stopping on:

      * a data error - the same block listed under two spellings of its district
        (e.g. KAMRUP and KAMRUP RURAL), or under the wrong district entirely;
      * a genuine repeat - two districts of one state that each really do have a
        block of the same name. Split these across separate uploads, one parent
        per file; separate runs do not collide because every lookup downstream is
        by full code.

    Both rows fail, not just the later one: we cannot tell which parent is
    correct, so a human has to decide.

    Names are compared after normalisation, so casing and separator differences
    are treated as the same name - matching how codes are built downstream.
    """

    def validate(self, data: pd.DataFrame) -> pd.DataFrame:
        result_df = data.copy()
        result_df["status"] = result_df.get("status", None)
        result_df["error"] = result_df.get("error", "")

        for level, parent_levels in _LEVELS:
            if level not in result_df.columns:
                continue
            if any(parent not in result_df.columns for parent in parent_levels):
                continue

            # normalised name -> parent full code -> (row indices, parent label)
            by_name: Dict[str, Dict[str, Tuple[List[int], str]]] = defaultdict(dict)

            for idx, row in result_df.iterrows():
                if self._already_decided(row):
                    continue

                name = normalize_boundary_segment(str(row.get(level, "") or "").strip())
                if not name:
                    continue

                parent_segments = [
                    normalize_boundary_segment(str(row.get(parent, "") or "").strip())
                    for parent in parent_levels
                ]
                if not all(parent_segments):
                    continue  # incomplete row; the required-field validator reports it

                parent_code = build_boundary_full_code(*parent_segments)
                indices, _ = by_name[name].get(parent_code, ([], ""))
                indices.append(idx)
                parent_label = (
                    preserve_boundary_label(row.get(parent_levels[-1])) or parent_segments[-1]
                )
                by_name[name][parent_code] = (indices, parent_label)

            for name, parents in by_name.items():
                if len(parents) > 1:
                    self._fail_collision(result_df, level, name, parents)

        return result_df

    @staticmethod
    def _already_decided(row: pd.Series) -> bool:
        status = row.get("status")
        return not pd.isna(status) and str(status).strip().lower() not in ("", "none")

    @staticmethod
    def _fail_collision(
        result_df: pd.DataFrame,
        level: str,
        name: str,
        parents: Dict[str, Tuple[List[int], str]],
    ) -> None:
        parent_labels = sorted({label for _, label in parents.values()})
        all_indices: Set[int] = {idx for indices, _ in parents.values() for idx in indices}

        for idx in sorted(all_indices):
            display = preserve_boundary_label(result_df.at[idx, level]) or name
            message = (
                f"{level} '{display}' appears under more than one parent in this file "
                f"({', '.join(parent_labels)}). Only one of them would be created, so no "
                f"row with this {level.lower()} is processed. Correct the parent names, "
                f"or upload one parent per file."
            )
            previous = str(result_df.at[idx, "error"] or "").strip()
            result_df.at[idx, "error"] = f"{previous + ' ' if previous else ''}{message}"
            result_df.at[idx, "status"] = "fail"
