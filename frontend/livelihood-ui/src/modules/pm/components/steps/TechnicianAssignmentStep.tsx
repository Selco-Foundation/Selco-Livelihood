import { amcErrorText, translateOr, useTranslate } from "@/shared";
import { Input, Pagination, SearchableSelect, Switch, toast } from "@/ui";
import { Users } from "lucide-react";
import { useMemo, useState } from "react";
import { usePlanAmcBySite } from "../../hooks/use-plan-amc-by-site";
import { useTurnOffAmc } from "../../hooks/use-turn-off-amc";
import { useVendorAssignmentSearch } from "../../hooks/use-vendor-assignment-search";
import { useVendorOrganisations } from "../../hooks/use-vendor-organisations";
import { useVendorOrgUsers } from "../../hooks/use-vendor-org-users";
import type { InstallationPlanAssignmentEntry } from "../../types/installation-plan";
import type { VendorAssignmentSite } from "../../services/vendor-assignment";
import {
  amcApplicableKey,
  isAmcApplicable,
  withAmcApplicable,
  withAmcApplicableForAll,
  withAmcFieldStaff,
  type AmcSetupValue,
} from "../../utils/amc-setup";
import { AmcFieldStaffSelect } from "../AmcFieldStaffSelect";
import { StepSectionCard } from "../StepSectionCard";
import { TurnOffAmcDialog } from "../TurnOffAmcDialog";

const DEFAULT_PAGE_SIZE = 10;

export type AssignmentValue = InstallationPlanAssignmentEntry[];

export interface TechnicianAssignmentRow {
  facilityId: string;
  siteName: string;
  componentType: "SOLAR" | "MACHINE";
  componentSequence: number;
  assetName: string;
}

/** "Anjali Bora, Solar Panel" — the row context a screen reader needs, since the table's own
 *  column and row headers are not announced by the selects inside its cells. */
function rowLabel(row: TechnicianAssignmentRow): string {
  return `${row.siteName}, ${row.assetName}`;
}

export function toRows(sites: VendorAssignmentSite[]): TechnicianAssignmentRow[] {
  return sites.flatMap((site) =>
    site.assets.map((asset) => ({
      facilityId: site.facilityId,
      siteName: site.siteName ?? site.facilityId,
      componentType: asset.componentType,
      componentSequence: asset.componentSequence,
      assetName: asset.assetName ?? asset.componentType,
    })),
  );
}

/**
 * Flattens already-saved vendor selections out of a `vendor-assignment/_search` response.
 * Each asset carries the vendor it was assigned to, so a plan's saved assignments can be read
 * back from the same search that builds the rows — they are *not* on the FieldPlan's own
 * `additionalDetails`, which never echoes them back. Assets with no vendor yet are skipped so
 * a half-filled plan doesn't hydrate blank rows over the PM's in-session edits.
 */
export function toSavedAssignments(sites: VendorAssignmentSite[]): InstallationPlanAssignmentEntry[] {
  return sites.flatMap((site) =>
    site.assets
      .filter((asset) => asset.vendorOrgId || asset.vendorUserId)
      .map((asset) => ({
        facilityId: site.facilityId,
        componentType: asset.componentType,
        componentSequence: asset.componentSequence,
        vendorOrgId: asset.vendorOrgId,
        vendorOrgName: asset.vendorOrgName,
        vendorUserId: asset.vendorUserId,
        vendorUserName: asset.vendorUserName,
        vendorEmail: asset.vendorEmail,
      })),
  );
}

export function isAssignmentValid(value: AssignmentValue, rows: TechnicianAssignmentRow[]): boolean {
  return (
    rows.length > 0 &&
    rows.every((row) =>
      value.some(
        (assignment) =>
          assignment.facilityId === row.facilityId &&
          assignment.componentType === row.componentType &&
          assignment.componentSequence === row.componentSequence &&
          Boolean(assignment.vendorOrgId) &&
          Boolean(assignment.vendorUserId),
      ),
    )
  );
}

interface TechnicianAssignmentStepProps {
  planId: string | undefined;
  planCode?: string;
  value: AssignmentValue;
  onChange: (value: AssignmentValue) => void;
  locked?: boolean;
  amcSetup?: AmcSetupValue;
  onAmcSetupChange?: (value: AmcSetupValue) => void;
}

function VendorUserSelect({
  organizationId,
  value,
  onChange,
  disabled,
  rowLabel,
}: Readonly<{
  organizationId: string | undefined;
  value: string;
  onChange: (code: string, name?: string, email?: string) => void;
  disabled: boolean;
  /** Which asset row this select belongs to, for the accessible name. */
  rowLabel: string;
}>) {
  const { t } = useTranslate();
  const { data: users = [] } = useVendorOrgUsers(organizationId);

  return (
    <SearchableSelect
      // No visible label -- the column header is the field name on screen. Screen reader users
      // get no column context, though, so the row has to be named here or every one of these
      // announces identically.
      ariaLabel={`${translateOr(t, "ES_PM_VENDOR", "Vendor")}, ${rowLabel}`}
      value={value}
      options={users}
      placeholder={translateOr(t, "ES_PM_SELECT_VENDOR", "Select Vendor")}
      onChange={(option) => onChange(option?.code ?? "", option?.name, option?.email)}
      disabled={disabled || !organizationId}
    />
  );
}

export function TechnicianAssignmentStep({
  planId,
  planCode,
  value,
  onChange,
  locked = false,
  amcSetup = {},
  onAmcSetupChange,
}: Readonly<TechnicianAssignmentStepProps>) {
  const { t } = useTranslate();
  const { data: searchResult } = useVendorAssignmentSearch(planId);
  const { data: organisations = [] } = useVendorOrganisations();
  // Solar sites that already have a running AMC (published plans): their switch only turns it off.
  const { data: existingAmcs = {} } = usePlanAmcBySite(planId);
  const turnOffAmc = useTurnOffAmc(planId);
  const [turnOffTarget, setTurnOffTarget] = useState<{ amcId: string; endUserName: string } | null>(null);

  function handleTurnOff() {
    if (!turnOffTarget) return;
    turnOffAmc.mutate(turnOffTarget.amcId, {
      onSuccess: () => {
        toast.success(translateOr(t, "ES_PM_AMC_TURNED_OFF", "AMC turned off"));
        setTurnOffTarget(null);
      },
      onError: (error) => {
        toast.error(translateOr(t, "ES_PM_AMC_TURN_OFF_FAILED", "Could not turn the AMC off"), {
          description:
            amcErrorText(error, t, () => turnOffTarget.endUserName) ??
            translateOr(t, "ES_SOMETHING_WRONG", "Something went wrong. Please try again."),
        });
        setTurnOffTarget(null);
      },
    });
  }
  const sites = useMemo(() => searchResult?.sites ?? [], [searchResult]);

  // Paginated by site (end user), not by raw asset row, so a site's assets never split across
  // pages -- that would break the rowSpan grouping on the "End user" column.
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSizeLimit, setPageSizeLimit] = useState(DEFAULT_PAGE_SIZE);
  const totalRecords = sites.length;
  const pagedSites = useMemo(
    () => sites.slice(currentPage * pageSizeLimit, (currentPage + 1) * pageSizeLimit),
    [sites, currentPage, pageSizeLimit],
  );

  const rows = useMemo(() => toRows(pagedSites), [pagedSites]);
  const allSolarRows = useMemo(
    () => toRows(sites).filter((row) => row.componentType === "SOLAR" && !existingAmcs[row.facilityId]),
    [sites, existingAmcs],
  );
  const allSolarApplicable =
    allSolarRows.length > 0 && allSolarRows.every((row) => isAmcApplicable(amcSetup, row));
  // Deliberately not tied to `locked`: the PM can turn AMC on for any end user after publish.
  const amcDisabled = !onAmcSetupChange;
  // Pre-counted once per render instead of a rows.filter() inside the map below, which made
  // rendering the table O(n^2) in the number of assets.
  const assetCountByFacilityId = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of rows) counts.set(row.facilityId, (counts.get(row.facilityId) ?? 0) + 1);
    return counts;
  }, [rows]);

  function handlePageSizeChange(size: number) {
    setPageSizeLimit(size);
    setCurrentPage(0);
  }

  function findAssignment(row: TechnicianAssignmentRow) {
    return value.find(
      (entry) =>
        entry.facilityId === row.facilityId &&
        entry.componentType === row.componentType &&
        entry.componentSequence === row.componentSequence,
    );
  }

  function updateAssignment(row: TechnicianAssignmentRow, patch: Partial<InstallationPlanAssignmentEntry>) {
    const existing = findAssignment(row) ?? {
      facilityId: row.facilityId,
      componentType: row.componentType,
      componentSequence: row.componentSequence,
    };
    const updated = { ...existing, ...patch };
    onChange([
      ...value.filter(
        (entry) =>
          !(
            entry.facilityId === row.facilityId &&
            entry.componentType === row.componentType &&
            entry.componentSequence === row.componentSequence
          ),
      ),
      updated,
    ]);
  }

  function setRowAmcApplicable(row: TechnicianAssignmentRow, applicable: boolean) {
    onAmcSetupChange?.(withAmcApplicable(amcSetup, row, applicable));
  }

  function handleOrganizationChange(row: TechnicianAssignmentRow, vendorOrgId: string) {
    const organization = organisations.find((item) => item.code === vendorOrgId);
    updateAssignment(row, {
      vendorOrgId,
      vendorOrgName: organization?.name,
      vendorUserId: undefined,
      vendorUserName: undefined,
      vendorEmail: undefined,
    });
    // The AMC field staff must belong to the row's organisation, so a new organisation clears it.
    if (row.componentType === "SOLAR" && isAmcApplicable(amcSetup, row)) {
      onAmcSetupChange?.(withAmcFieldStaff(amcSetup, row, {}));
    }
  }

  return (
    <StepSectionCard
      icon={Users}
      title={translateOr(t, "ES_PM_TECHNICIAN_ASSIGNMENT_AMC", "Technician assignment and AMC")}
      description={translateOr(
        t,
        "ES_PM_TECHNICIAN_ASSIGNMENT_DESC",
        "Assign an organisation and vendor to each end user's asset",
      )}
    >
      <div className="space-y-4">
        {planCode ? (
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-muted-foreground">
              {translateOr(t, "ES_PM_INSTALLATION_PLAN_CODE", "Installation Plan Code")}:
            </span>
            <span className="font-semibold text-foreground">{planCode}</span>
          </div>
        ) : null}
        <div className="livelihood-card overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[1550px] table-fixed border-collapse text-sm">
            <colgroup>
              <col className="w-[180px]" />
              <col className="w-[220px]" />
              <col className="w-[200px]" />
              <col className="w-[240px]" />
              <col className="w-[220px]" />
              <col className="w-[240px]" />
              <col className="w-[240px]" />
            </colgroup>
            <thead>
              <tr className="border-b border-border">
                {[translateOr(t, "ES_PM_END_USER", "End user"), translateOr(t, "ES_PM_ASSET", "Asset")].map((label) => (
                  <th key={label} className="px-5 py-3 text-left text-sm font-semibold text-ink-950">
                    {label}
                  </th>
                ))}
                <th className="px-5 py-3 text-left text-sm font-semibold text-ink-950">
                  <div className="space-y-1.5">
                    <span className="block">{translateOr(t, "ES_PM_AMC_APPLICABLE", "AMC applicable")}</span>
                    <label className="flex items-center gap-2 text-xs font-normal text-muted-foreground">
                      <Switch
                        size="sm"
                        checked={allSolarApplicable}
                        disabled={amcDisabled || allSolarRows.length === 0}
                        onCheckedChange={(checked) =>
                          onAmcSetupChange?.(withAmcApplicableForAll(amcSetup, allSolarRows, checked))
                        }
                        aria-label={translateOr(t, "ES_PM_AMC_APPLY_FOR_ALL", "Apply for all")}
                      />
                      {translateOr(t, "ES_PM_AMC_APPLY_FOR_ALL", "Apply for all")}
                    </label>
                  </div>
                </th>
                {[
                  translateOr(t, "ES_PM_VENDOR_ORGANIZATION", "Vendor Organization"),
                  translateOr(t, "ES_PM_VENDOR", "Vendor"),
                  translateOr(t, "ES_PM_EMAIL_ID", "Email ID"),
                  translateOr(t, "ES_PM_AMC_FIELD_STAFF", "AMC field staff"),
                ].map((label) => (
                  <th key={label} className="px-5 py-3 text-left text-sm font-semibold text-ink-950">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const assignment = findAssignment(row);
                const previousRow = rows[index - 1];
                const startsSiteGroup = previousRow?.facilityId !== row.facilityId;
                const siteAssetCount = assetCountByFacilityId.get(row.facilityId) ?? 1;
                const existingAmc = row.componentType === "SOLAR" ? existingAmcs[row.facilityId] : undefined;

                return (
                  <tr key={`${row.facilityId}-${row.componentType}-${row.componentSequence}`} className="border-b border-border/70">
                    {startsSiteGroup ? (
                      <td rowSpan={siteAssetCount} className="px-5 py-4 align-middle font-semibold text-foreground">
                        <p>{row.siteName}</p>
                      </td>
                    ) : null}
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium text-foreground">
                        {row.assetName}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {existingAmc ? (
                        <div className="space-y-0.5">
                          <label className="flex items-center gap-2 text-sm text-foreground">
                            <Switch
                              checked
                              // Switching off asks for confirmation, then turns the running AMC off.
                              disabled={amcDisabled || turnOffAmc.isPending}
                              onCheckedChange={(checked) =>
                                !checked && setTurnOffTarget({ amcId: existingAmc.id, endUserName: row.siteName })
                              }
                              aria-label={`${translateOr(t, "ES_PM_AMC_APPLICABLE", "AMC applicable")}, ${rowLabel(row)}`}
                            />
                            {translateOr(t, "CORE_COMMON_YES", "Yes")}
                          </label>
                          <p className="text-xs text-muted-foreground">
                            {existingAmc.status === "ACTIVE"
                              ? translateOr(t, "ES_PM_AMC_STATUS_ACTIVE", "Active")
                              : translateOr(t, "ES_PM_AMC_PENDING_ACTIVATION", "Pending activation")}
                          </p>
                        </div>
                      ) : null}
                      {!existingAmc && row.componentType === "SOLAR" ? (
                        <label className="flex items-center gap-2 text-sm text-foreground">
                          <Switch
                            checked={isAmcApplicable(amcSetup, row)}
                            disabled={amcDisabled}
                            onCheckedChange={(checked) => setRowAmcApplicable(row, checked)}
                            aria-label={`${translateOr(t, "ES_PM_AMC_APPLICABLE", "AMC applicable")}, ${rowLabel(row)}`}
                          />
                          {isAmcApplicable(amcSetup, row)
                            ? translateOr(t, "CORE_COMMON_YES", "Yes")
                            : translateOr(t, "CORE_COMMON_NO", "No")}
                        </label>
                      ) : null}
                    </td>
                    <td className="px-5 py-4">
                      <SearchableSelect
                        ariaLabel={`${translateOr(t, "ES_PM_VENDOR_ORGANIZATION", "Vendor Organization")}, ${rowLabel(row)}`}
                        value={assignment?.vendorOrgId ?? ""}
                        options={organisations}
                        placeholder={translateOr(t, "ES_PM_SELECT_VENDOR_ORGANIZATION", "Select Organization")}
                        onChange={(option) => handleOrganizationChange(row, option?.code ?? "")}
                        disabled={locked}
                      />
                    </td>
                    <td className="px-5 py-4">
                      <VendorUserSelect
                        rowLabel={rowLabel(row)}
                        organizationId={assignment?.vendorOrgId}
                        value={assignment?.vendorUserId ?? ""}
                        onChange={(vendorUserId, vendorUserName, vendorEmail) =>
                          updateAssignment(row, { vendorUserId, vendorUserName, vendorEmail })
                        }
                        disabled={locked}
                      />
                    </td>
                    <td className="px-5 py-4">
                      <Input
                        value={assignment?.vendorEmail ?? ""}
                        disabled
                        placeholder={translateOr(t, "ES_PM_EMAIL_PLACEHOLDER", "email@example.com")}
                      />
                    </td>
                    <td className="px-5 py-4">
                      {row.componentType === "SOLAR" && isAmcApplicable(amcSetup, row) && !existingAmc ? (
                        <AmcFieldStaffSelect
                          rowLabel={rowLabel(row)}
                          organizationId={assignment?.vendorOrgId}
                          value={amcSetup[amcApplicableKey(row)]?.fieldStaffId ?? ""}
                          onChange={(id, name) => onAmcSetupChange?.(withAmcFieldStaff(amcSetup, row, { id, name }))}
                          disabled={amcDisabled}
                        />
                      ) : null}
                      {existingAmc ? (
                        <span className="text-foreground">{existingAmc.fieldStaff?.name ?? "-"}</span>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
        {totalRecords > 0 ? (
          <Pagination
            currentPage={currentPage}
            totalRecords={totalRecords}
            pageSizeLimit={pageSizeLimit}
            onNextPage={() => setCurrentPage((page) => page + 1)}
            onPrevPage={() => setCurrentPage((page) => Math.max(0, page - 1))}
            onPageChange={setCurrentPage}
            onPageSizeChange={handlePageSizeChange}
          />
        ) : null}
      </div>
      <TurnOffAmcDialog
        endUserName={turnOffTarget?.endUserName ?? null}
        isPending={turnOffAmc.isPending}
        onCancel={() => setTurnOffTarget(null)}
        onConfirm={handleTurnOff}
      />
    </StepSectionCard>
  );
}
