import { translateOr, useTranslate } from "@/shared";
import { Input, SearchableSelect } from "@/ui";
import { Users } from "lucide-react";
import { useMemo } from "react";
import { useVendorAssignmentSearch } from "../../hooks/use-vendor-assignment-search";
import { useVendorOrganisations } from "../../hooks/use-vendor-organisations";
import { useVendorOrgUsers } from "../../hooks/use-vendor-org-users";
import type { InstallationPlanAssignmentEntry } from "../../types/installation-plan";
import type { VendorAssignmentSite } from "../../services/vendor-assignment";
import { StepSectionCard } from "../StepSectionCard";

export type AssignmentValue = InstallationPlanAssignmentEntry[];

export interface TechnicianAssignmentRow {
  facilityId: string;
  siteName: string;
  componentType: "SOLAR" | "MACHINE";
  componentSequence: number;
  assetName: string;
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
}

function VendorUserSelect({
  organizationId,
  value,
  onChange,
  disabled,
}: {
  organizationId: string | undefined;
  value: string;
  onChange: (code: string, name?: string, email?: string) => void;
  disabled: boolean;
}) {
  const { t } = useTranslate();
  const { data: users = [] } = useVendorOrgUsers(organizationId);

  return (
    <SearchableSelect
      value={value}
      options={users}
      placeholder={translateOr(t, "ES_PM_SELECT_VENDOR", "Select Vendor")}
      onChange={(option) => onChange(option?.code ?? "", option?.name, option?.email)}
      disabled={disabled || !organizationId}
    />
  );
}

export function TechnicianAssignmentStep({ planId, planCode, value, onChange, locked = false }: TechnicianAssignmentStepProps) {
  const { t } = useTranslate();
  const { data: searchResult } = useVendorAssignmentSearch(planId);
  const { data: organisations = [] } = useVendorOrganisations();
  const rows = useMemo(() => toRows(searchResult?.sites ?? []), [searchResult]);
  // Pre-counted once per render instead of a rows.filter() inside the map below, which made
  // rendering the table O(n^2) in the number of assets.
  const assetCountByFacilityId = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of rows) counts.set(row.facilityId, (counts.get(row.facilityId) ?? 0) + 1);
    return counts;
  }, [rows]);

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

  function handleOrganizationChange(row: TechnicianAssignmentRow, vendorOrgId: string) {
    const organization = organisations.find((item) => item.code === vendorOrgId);
    updateAssignment(row, {
      vendorOrgId,
      vendorOrgName: organization?.name,
      vendorUserId: undefined,
      vendorUserName: undefined,
      vendorEmail: undefined,
    });
  }

  return (
    <StepSectionCard
      icon={Users}
      title={translateOr(t, "ES_PM_TECHNICIAN_ASSIGNMENT", "Technician Assignment")}
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
          <table className="w-full min-w-[1100px] table-fixed border-collapse text-sm">
            <colgroup>
              <col className="w-[180px]" />
              <col className="w-[220px]" />
              <col className="w-[240px]" />
              <col className="w-[220px]" />
              <col className="w-[240px]" />
            </colgroup>
            <thead>
              <tr className="border-b border-border">
                {[
                  translateOr(t, "ES_PM_END_USER", "End user"),
                  translateOr(t, "ES_PM_ASSET", "Asset"),
                  translateOr(t, "ES_PM_VENDOR_ORGANIZATION", "Vendor Organization"),
                  translateOr(t, "ES_PM_VENDOR", "Vendor"),
                  translateOr(t, "ES_PM_EMAIL_ID", "Email ID"),
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
                      <SearchableSelect
                        value={assignment?.vendorOrgId ?? ""}
                        options={organisations}
                        placeholder={translateOr(t, "ES_PM_SELECT_VENDOR_ORGANIZATION", "Select Organization")}
                        onChange={(option) => handleOrganizationChange(row, option?.code ?? "")}
                        disabled={locked}
                      />
                    </td>
                    <td className="px-5 py-4">
                      <VendorUserSelect
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
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      </div>
    </StepSectionCard>
  );
}
