// MDMS `common-masters.InstallationImages` — matches qc's own schema/access
// path exactly: masters.InstallationImages[0].InstallationImage. Each raw
// criterion says which system types (with their order) and which solutions
// ask for it; selectInstallationImageCriteria applies the same rule as the
// mobile app, so the reviewer sees exactly the photo questions the field
// staff was asked.
export interface RawInstallationImageCriterion {
  code?: string;
  description?: string;
  short_title?: string;
  required_count?: number;
  required?: boolean;
  active?: boolean;
  system_types?: Array<{ code?: string; order?: number }>;
  solution_codes?: string[];
}

export interface InstallationImageCriterion {
  code: string;
  description: string;
  /** MDMS `short_title` — the short heading (e.g. "Solar Panel") the mobile
   * app and the audit trail show; `description` is the long capture hint. */
  shortTitle?: string;
  /** `false` only when MDMS marks the photo optional (`required: false`). */
  required?: boolean;
  /** `false` only when MDMS marks the question inactive. */
  active?: boolean;
  /** Upper-cased system type code -> its order for that type. */
  systemOrders?: Record<string, number>;
  /** Upper-cased solution codes; absent or empty means every solution. */
  solutionCodes?: string[];
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
    .map((criterion) => {
      const mapped: InstallationImageCriterion = {
        code: criterion.code,
        description: criterion.description ?? criterion.code,
        shortTitle: criterion.short_title?.trim() || undefined,
      };
      if (criterion.required === false) {
        mapped.required = false;
      }
      if (criterion.active === false) {
        mapped.active = false;
      }
      const systemOrders: Record<string, number> = {};
      for (const systemType of criterion.system_types ?? []) {
        const code = systemType.code?.trim().toUpperCase();
        if (code) {
          systemOrders[code] = typeof systemType.order === "number" ? systemType.order : Number.MAX_SAFE_INTEGER;
        }
      }
      if (Object.keys(systemOrders).length > 0) {
        mapped.systemOrders = systemOrders;
      }
      const solutionCodes = (criterion.solution_codes ?? [])
        .filter((code): code is string => typeof code === "string")
        .map((code) => code.trim().toUpperCase())
        .filter(Boolean);
      if (solutionCodes.length > 0) {
        mapped.solutionCodes = solutionCodes;
      }
      return mapped;
    });
}

export interface InstallationImageSelection {
  /** BOM `data.system_type`, e.g. "AC" / "DC". */
  systemType?: string;
  /** The activity's solution code, e.g. "202526PASF0000135". */
  solutionId?: string;
  /** Upper-cased criterion codes that already have uploaded photos. */
  uploadedCodes?: ReadonlySet<string>;
}

/**
 * The photo questions this installation was asked, in the order the mobile
 * app asked them (mobile `installationImagesFor`):
 * 1. inactive questions are dropped;
 * 2. questions declaring the system type are kept, sorted by that type's
 *    order (ties keep MDMS order); a blank or unmatched type keeps all;
 * 3. questions whose solution list is empty or names the solution are kept.
 * Unlike the mobile app, an unknown solution keeps every question (a reviewer
 * should rather see an empty section than miss one). A question that already
 * has uploaded photos is always kept (appended in MDMS order), so an older
 * submission never hides a photo.
 */
export function selectInstallationImageCriteria(
  criteria: InstallationImageCriterion[],
  { systemType, solutionId, uploadedCodes }: InstallationImageSelection = {},
): InstallationImageCriterion[] {
  const type = systemType?.trim().toUpperCase() ?? "";
  const solution = solutionId?.trim().toUpperCase() ?? "";
  const active = criteria.filter((criterion) => criterion.active !== false);

  const matching = type
    ? active
        .map((criterion, index) => ({ criterion, index, order: criterion.systemOrders?.[type] }))
        .filter((entry): entry is typeof entry & { order: number } => entry.order !== undefined)
    : [];
  const byType = matching.length
    ? matching.sort((a, b) => a.order - b.order || a.index - b.index).map((entry) => entry.criterion)
    : active;

  const selected = solution
    ? byType.filter((criterion) => !criterion.solutionCodes?.length || criterion.solutionCodes.includes(solution))
    : byType;

  if (!uploadedCodes?.size) {
    return selected;
  }
  const chosen = new Set(selected);
  const extra = criteria.filter(
    (criterion) => !chosen.has(criterion) && uploadedCodes.has(criterion.code.toUpperCase()),
  );
  return [...selected, ...extra];
}
