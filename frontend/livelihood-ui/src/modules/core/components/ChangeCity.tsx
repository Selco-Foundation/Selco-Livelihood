import {
  aggregateBoundaryCodes,
  aggregateBoundaryTypes,
  employeeHomePath,
  useBoundary,
  useFacility,
  useJurisdictionStore,
  type JurisdictionBoundaries,
} from "@/shared";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/ui";
import { ChevronDown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

interface BoundaryOption {
  code: string;
  label: string;
  type: "UNIFIED" | "facility";
}

function formatBoundaryLabel(code: string): string {
  return code.replaceAll("_", " ");
}

export function ChangeCity() {
  const boundaries = useJurisdictionStore((state) => state.boundaries);
  const currentBoundary = useJurisdictionStore((state) => state.currentBoundary);
  const setCurrentBoundary = useJurisdictionStore((state) => state.setCurrentBoundary);

  const boundaryCodes = useMemo(
    () => aggregateBoundaryCodes(boundaries),
    [boundaries],
  );
  const { data: boundaryData } = useBoundary(boundaryCodes);
  const facilityBoundaryCodes = useMemo(
    () => boundaryData?.facilities?.map((facility) => facility.code) ?? [],
    [boundaryData],
  );
  const { data: facilityData } = useFacility(facilityBoundaryCodes);

  const [selectedOption, setSelectedOption] = useState<BoundaryOption | null>(null);

  const options = useMemo(() => {
    if (!boundaries) {
      return [];
    }

    const jurisdictionBoundaryCodes = aggregateBoundaryCodes(boundaries);
    const jurisdictionBoundaryTypes = aggregateBoundaryTypes(boundaries);
    const isOnlyFacilityType =
      jurisdictionBoundaryTypes.length === 1 && jurisdictionBoundaryTypes[0] === "facility";

    const nextOptions: BoundaryOption[] = [
      {
        code: jurisdictionBoundaryCodes.join(","),
        label:
          jurisdictionBoundaryCodes.length === 1 && isOnlyFacilityType
            ? formatBoundaryLabel(jurisdictionBoundaryCodes[0] ?? "Boundary")
            : "All jurisdictions",
        type: "UNIFIED",
      },
    ];

    for (const facility of facilityData?.facilities ?? []) {
      if (nextOptions.every((option) => option.code !== facility.boundaryCode)) {
        nextOptions.push({
          code: facility.boundaryCode,
          label: facility.facilityName || formatBoundaryLabel(facility.boundaryCode),
          type: "facility",
        });
      }
    }

    return nextOptions.sort((left, right) => left.label.localeCompare(right.label));
  }, [boundaries, boundaryData, facilityData]);

  useEffect(() => {
    if (!options.length) {
      return;
    }

    const currentCodes = aggregateBoundaryCodes(currentBoundary).join(",");
    const matched = options.find((option) => option.code === currentCodes);
    setSelectedOption(matched ?? options[0] ?? null);
  }, [currentBoundary, options]);

  const handleSelect = (option: BoundaryOption) => {
    if (!boundaries) {
      return;
    }

    const nextBoundary: JurisdictionBoundaries =
      option.type === "UNIFIED"
        ? boundaries
        : {
            [option.type]: option.code.split(","),
          };

    setCurrentBoundary(nextBoundary);
    setSelectedOption(option);

    if (window.location.pathname.includes("/employee")) {
      window.location.assign(employeeHomePath());
      return;
    }

    window.location.reload();
  };

  if (!boundaries || options.length <= 1) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="min-w-[220px] justify-between">
          <span className="truncate">{selectedOption?.label ?? "Select jurisdiction"}</span>
          <ChevronDown className="size-4 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[220px]">
        {options.map((option) => (
          <DropdownMenuItem key={`${option.type}-${option.code}`} onClick={() => handleSelect(option)}>
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
