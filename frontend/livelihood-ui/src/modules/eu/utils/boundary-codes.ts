const DEFAULT_COUNTRY = "India";

function normalizePart(value: string): string {
  return (value || "").trim().replace(/\s+/g, "");
}

export interface ComputeGeographyCodesInput {
  country?: string;
  state: string;
  district: string;
  block: string;
  isStateTextMode: boolean;
  isDistrictTextMode: boolean;
}

export interface GeographyCodes {
  country: string;
  state: string;
  district: string;
  block: string;
}

/**
 * Ports `fa`'s `BoundaryService.computeGeographyCodes` — when a tier is typed as
 * free text (not picked from the existing hierarchy), its code is derived by
 * appending the normalized name to its parent's code; when picked from an
 * existing tier, the value already *is* the code.
 */
export function computeGeographyCodes({
  country = DEFAULT_COUNTRY,
  state,
  district,
  block,
  isStateTextMode,
  isDistrictTextMode,
}: ComputeGeographyCodesInput): GeographyCodes {
  const countryCode = normalizePart(country) || DEFAULT_COUNTRY;

  let stateCode: string;
  let districtCode: string;

  if (isStateTextMode) {
    stateCode = `${countryCode}_${normalizePart(state)}`;
    districtCode = `${stateCode}_${normalizePart(district)}`;
  } else if (isDistrictTextMode) {
    stateCode = state;
    districtCode = `${stateCode}_${normalizePart(district)}`;
  } else {
    stateCode = state;
    districtCode = district;
  }

  const blockCode = `${districtCode}_${normalizePart(block)}`;

  return { country: countryCode, state: stateCode, district: districtCode, block: blockCode };
}
