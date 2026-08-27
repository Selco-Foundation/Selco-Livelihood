from dataclasses import dataclass
from typing import List, Dict, Any


@dataclass
class Boundary:
    country: str
    state: str
    district: str
    block: str
    code: str
    country_code: str = ""
    state_code: str = ""
    district_code: str = ""
    block_code: str = ""

    def get(self, key: str, default: Any = None) -> Any:
        attributes = {
            "country": self.country,
            "state": self.state,
            "district": self.district,
            "block": self.block,
            "code": self.code,
            "country_code": self.country_code,
            "state_code": self.state_code,
            "district_code": self.district_code,
            "block_code": self.block_code,
        }
        return attributes.get(key, default)


def flatten_boundaries(boundary_json: Dict) -> List[Boundary]:
    """Recursively flatten nested boundary JSON into Boundary dataclasses."""
    boundaries: List[Boundary] = []

    def traverse(node, country="", state="", district="", block="",
                 country_code="", state_code="", district_code="", block_code=""):
        node_type = node.get("type")
        name = node.get("name")
        code = node.get("boundaryCode")

        if node_type == "country":
            country = name
            country_code = code
        elif node_type == "state":
            state = name
            state_code = code
        elif node_type == "district":
            district = name
            district_code = code
        elif node_type == "block":
            block = name
            block_code = code

        if node_type == "block":  # leaf node → create Boundary row
            boundaries.append(
                Boundary(
                    country=country,
                    state=state,
                    district=district,
                    block=block,
                    code=code,
                    country_code=country_code,
                    state_code=state_code,
                    district_code=district_code,
                    block_code=block_code,
                )
            )

        for child in node.get("children", []):
            traverse(child, country, state, district, block,
                     country_code, state_code, district_code, block_code)

    traverse(boundary_json)
    return boundaries