// MDMS `common-masters.InstallationImages` — matches qc's own schema/access
// path exactly: masters.InstallationImages[0].InstallationImage. Each raw
// criterion also carries `system_types` (qc filters criteria by the
// facility's on-grid/off-grid/hybrid systemType before showing them), but
// our real sample data has an empty additionalDetails/systemType, so that
// filter isn't applied yet — every criterion is shown unconditionally until
// systemType is confirmed populated somewhere in our data.
export interface RawInstallationImageCriterion {
  code?: string;
  description?: string;
  short_title?: string;
  required_count?: number;
  system_types?: Array<{ code?: string; order?: number }>;
}

export interface InstallationImageCriterion {
  code: string;
  description: string;
}

/** Pure — extracts and shapes the criteria list from the MDMS master's raw
 * response. The caller (a hook) does the actual `fetchMdmsMasters` call. */
export function mapInstallationImageCriteria(
  masters: Record<string, unknown[]>,
): InstallationImageCriterion[] {
  const wrapper = masters.InstallationImages?.[0] as
    | { InstallationImage?: RawInstallationImageCriterion[] }
    | undefined;
  const raw = wrapper?.InstallationImage ?? [];

  return raw
    .filter((criterion): criterion is RawInstallationImageCriterion & { code: string } =>
      Boolean(criterion.code),
    )
    .map((criterion) => ({
      code: criterion.code,
      description: criterion.description ?? criterion.code,
    }));
}
