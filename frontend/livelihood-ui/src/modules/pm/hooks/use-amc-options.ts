import { fetchMdmsMasters, tenantId, useAuthStore } from "@/shared";
import { useQuery } from "@tanstack/react-query";
import { toAmcFrequencyOptions, toAmcYearsOptions } from "../utils/amc-options";
import { pmKeys } from "./query-keys";

/** The AMC frequency and duration choices, read from the `AMC.Frequency` and `AMC.Duration` MDMS masters. */
export function useAmcOptions() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  const { data } = useQuery({
    queryKey: pmKeys.amcOptions(),
    enabled: Boolean(accessToken),
    staleTime: 5 * 60_000,
    queryFn: () => fetchMdmsMasters(tenantId(), "AMC", ["Frequency", "Duration"], accessToken!, user),
    select: (masters) => ({ frequency: toAmcFrequencyOptions(masters), years: toAmcYearsOptions(masters) }),
  });

  const frequencyOptions = data?.frequency ?? [];
  const yearsOptions = data?.years ?? [];
  return {
    frequencyOptions,
    yearsOptions,
    // The rows flagged `isDefault` in MDMS; undefined until loaded or when none is flagged.
    defaultFrequencyMonths: frequencyOptions.find((option) => option.isDefault)?.months,
    defaultYears: yearsOptions.find((option) => option.isDefault)?.years,
  };
}
