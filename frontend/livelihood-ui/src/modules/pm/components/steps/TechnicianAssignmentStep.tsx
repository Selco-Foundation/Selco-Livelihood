import { translateOr, useTranslate } from "@/shared";
import { Input } from "@/ui";
import { Users } from "lucide-react";
import { useMemo } from "react";
import { END_USER_SITES } from "../../constants/end-user-sites";
import { VENDOR_ORGANIZATIONS } from "../../constants/vendors";
import type { InstallationPlanAssignmentEntry, InstallationPlanScopeEntry } from "../../types/installation-plan";
import { LabeledSelect } from "../LabeledSelect";
import { StepSectionCard } from "../StepSectionCard";

export type AssignmentValue = InstallationPlanAssignmentEntry[];

const STATIC_ASSETS = [
  { code: "SOLAR_PUMP", name: "Solar Pump" },
  { code: "SOLAR_HOME_LIGHT", name: "Solar Home Light" },
] as const;

interface TechnicianAssignmentRow {
  siteId: string;
  siteName: string;
  phoneNumber: string;
  solutionCode: string;
  assetCode: string;
  assetName: string;
}

/** The client flow assigns vendors to assets, with two static assets per
 * selected end-user site until the asset API is integrated. */
export function getTechnicianAssignmentRows(scope: InstallationPlanScopeEntry[]): TechnicianAssignmentRow[] {
  const firstSolutionBySite = new Map<string, string>();
  for (const entry of scope) {
    if (entry.included && entry.solutionCode && !firstSolutionBySite.has(entry.siteId)) {
      firstSolutionBySite.set(entry.siteId, entry.solutionCode);
    }
  }

  return Array.from(firstSolutionBySite.entries()).flatMap(([siteId, solutionCode]) => {
    const site = END_USER_SITES.find((item) => item.id === siteId);
    return STATIC_ASSETS.map((asset) => ({
      siteId,
      siteName: site?.name ?? siteId,
      phoneNumber: site?.phoneNumber ?? "",
      solutionCode,
      assetCode: asset.code,
      assetName: asset.name,
    }));
  });
}

export function isAssignmentValid(value: AssignmentValue, scope: InstallationPlanScopeEntry[]): boolean {
  const rows = getTechnicianAssignmentRows(scope);
  return (
    rows.length > 0 &&
    rows.every((row) =>
      value.some(
        (assignment) =>
          assignment.siteId === row.siteId &&
          assignment.solutionCode === row.solutionCode &&
          assignment.assetCode === row.assetCode &&
          Boolean(assignment.vendorOrgCode) &&
          Boolean(assignment.vendorUserCode) &&
          Boolean(assignment.vendorEmail),
      ),
    )
  );
}

interface TechnicianAssignmentStepProps {
  planCode?: string;
  scope: InstallationPlanScopeEntry[];
  value: AssignmentValue;
  onChange: (value: AssignmentValue) => void;
  locked?: boolean;
}

export function TechnicianAssignmentStep({ planCode, scope, value, onChange, locked = false }: TechnicianAssignmentStepProps) {
  const { t } = useTranslate();
  const rows = useMemo(() => getTechnicianAssignmentRows(scope), [scope]);

  function findAssignment(row: TechnicianAssignmentRow) {
    return value.find(
      (entry) =>
        entry.siteId === row.siteId &&
        entry.solutionCode === row.solutionCode &&
        entry.assetCode === row.assetCode,
    );
  }

  function updateAssignment(row: TechnicianAssignmentRow, patch: Partial<InstallationPlanAssignmentEntry>) {
    const existing = findAssignment(row) ?? {
      siteId: row.siteId,
      solutionCode: row.solutionCode,
      assetCode: row.assetCode,
    };
    const updated = { ...existing, ...patch };
    onChange([
      ...value.filter(
        (entry) =>
          !(
            entry.siteId === row.siteId &&
            entry.solutionCode === row.solutionCode &&
            entry.assetCode === row.assetCode
          ),
      ),
      updated,
    ]);
  }

  function handleOrganizationChange(row: TechnicianAssignmentRow, vendorOrgCode: string) {
    updateAssignment(row, { vendorOrgCode, vendorUserCode: undefined, vendorEmail: "" });
  }

  function handleVendorChange(row: TechnicianAssignmentRow, vendorUserCode: string) {
    const organization = VENDOR_ORGANIZATIONS.find((item) => item.code === findAssignment(row)?.vendorOrgCode);
    const vendor = organization?.users.find((item) => item.code === vendorUserCode);
    updateAssignment(row, { vendorUserCode, vendorEmail: vendor?.email ?? "" });
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
          <table className="w-full min-w-[1100px] border-collapse text-sm">
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
                const startsSiteGroup = previousRow?.siteId !== row.siteId;
                const siteAssetCount = rows.filter((item) => item.siteId === row.siteId).length;
                const organization = VENDOR_ORGANIZATIONS.find((item) => item.code === assignment?.vendorOrgCode);

                return (
                  <tr key={`${row.siteId}-${row.assetCode}`} className="border-b border-border/70">
                    {startsSiteGroup ? (
                      <td rowSpan={siteAssetCount} className="px-5 py-4 align-middle font-semibold text-foreground">
                        <p>{row.siteName}</p>
                        {row.phoneNumber ? <p className="mt-1 text-xs font-normal text-muted-foreground">+91 {row.phoneNumber}</p> : null}
                      </td>
                    ) : null}
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium text-foreground">
                        {row.assetName}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <LabeledSelect
                        value={assignment?.vendorOrgCode ?? ""}
                        options={VENDOR_ORGANIZATIONS}
                        placeholder={translateOr(t, "ES_PM_SELECT_VENDOR_ORGANIZATION", "Select Organization")}
                        onChange={(vendorOrgCode) => handleOrganizationChange(row, vendorOrgCode)}
                        disabled={locked}
                      />
                    </td>
                    <td className="px-5 py-4">
                      <LabeledSelect
                        value={assignment?.vendorUserCode ?? ""}
                        options={organization?.users ?? []}
                        placeholder={translateOr(t, "ES_PM_SELECT_VENDOR", "Select Vendor")}
                        onChange={(vendorUserCode) => handleVendorChange(row, vendorUserCode)}
                        disabled={locked || !organization}
                      />
                    </td>
                    <td className="px-5 py-4">
                      <Input value={assignment?.vendorEmail ?? ""} disabled placeholder="email@example.com" />
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
