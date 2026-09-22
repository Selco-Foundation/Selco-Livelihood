import { fetchMdmsMasters, tenantId, useAuthStore } from "@/shared";
import { useQuery } from "@tanstack/react-query";

/** A `facility` MDMS master entry — `facilityCategory` only appears on `FacilityType` rows, used to filter the type dropdown by the selected category. */
export interface FacilityMasterOption {
  code: string;
  name: string;
  facilityCategory?: string;
}

function sortByName(options: FacilityMasterOption[]): FacilityMasterOption[] {
  return [...options].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * The `facility.FacilityCategory` / `facility.FacilityType` / `facility.SolarSolutionDesignType`
 * MDMS masters `fa`'s `FacilityForm.js` uses for its dropdowns. The master key stays
 * `FacilityType` — only its UI label changes (to "Sector") in this module's form.
 */
export function useFacilityMdmsOptions() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  const { data, isLoading } = useQuery({
    queryKey: ["eu-facility-mdms-options"],
    enabled: Boolean(accessToken),
    queryFn: () =>
      fetchMdmsMasters(
        tenantId(),
        "facility",
        ["FacilityCategory", "FacilityType", "SolarSolutionDesignType"],
        accessToken ?? undefined,
        user,
      ),
  });

  return {
    isLoading,
    facilityCategories: sortByName((data?.FacilityCategory as FacilityMasterOption[]) ?? []),
    facilityTypes: sortByName((data?.FacilityType as FacilityMasterOption[]) ?? []),
    solarSolutionDesignTypes: sortByName(
      (data?.SolarSolutionDesignType as FacilityMasterOption[]) ?? [],
    ),
  };
}
