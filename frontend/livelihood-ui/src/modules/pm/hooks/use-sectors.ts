import { useMemo } from "react";
import type { SectorOption } from "../constants/sectors";
import { useInstallationSolutions } from "./use-installation-solutions";

/**
 * No `Installation.Sector` MDMS master exists — sectors are derived as the distinct `sectorName`
 * values off the live `Installation.Solution` master instead (confirmed against the backend: zero
 * references to an `Installation.Sector` schema anywhere).
 */
export function useSectors() {
  const query = useInstallationSolutions();

  const data = useMemo<SectorOption[] | undefined>(() => {
    if (!query.data) return undefined;
    const seen = new Map<string, SectorOption>();
    for (const solution of query.data) {
      if (!seen.has(solution.sectorName)) {
        seen.set(solution.sectorName, { code: solution.sectorName, name: solution.sectorName });
      }
    }
    return Array.from(seen.values());
  }, [query.data]);

  return { ...query, data };
}
