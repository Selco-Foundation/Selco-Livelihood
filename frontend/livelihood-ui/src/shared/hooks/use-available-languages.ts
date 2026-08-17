import { getStateBoundaryLanguages, type StateBoundaryLanguage } from "../config/global-config";
import { useJurisdictionStore } from "../stores/jurisdiction-store";
import { aggregateBoundaryCodes } from "../utils/boundary-util";
import { dedupeLanguages } from "../utils/boundary-languages";
import { useBoundary } from "./use-boundary";

const ENGLISH: StateBoundaryLanguage = { code: "en_IN", label: "English", nativeLabel: "English" };

export function useAvailableLanguages(): StateBoundaryLanguage[] {
  const boundaries = useJurisdictionStore((state) => state.boundaries);
  const { data: boundaryData } = useBoundary(aggregateBoundaryCodes(boundaries));

  // The user's state configures its own allowed languages via the global-config asset
  // (getStateBoundaryInfos). Fall back to English-only until boundary data resolves, or if
  // the resolved state isn't in the config table / has no languages configured yet. English
  // is guaranteed present either way, even if a state's own config list omits it.
  const stateCodes = boundaryData?.states?.map((state) => state.code) ?? [];
  const stateLanguages = dedupeLanguages(getStateBoundaryLanguages(stateCodes));

  return stateLanguages.some((language) => language.code === ENGLISH.code)
    ? stateLanguages
    : [ENGLISH, ...stateLanguages];
}
