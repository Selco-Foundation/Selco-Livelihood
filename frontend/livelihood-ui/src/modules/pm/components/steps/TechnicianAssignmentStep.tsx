import { translateOr, useTranslate } from "@/shared";
import { Input } from "@/ui";
import { Users } from "lucide-react";
import { useMemo } from "react";
import { END_USER_SITES } from "../../constants/end-user-sites";
import { SOLUTION_OPTIONS } from "../../constants/solutions";
import { VENDOR_ORGANIZATIONS } from "../../constants/vendors";
import type { InstallationPlanAssignmentEntry, InstallationPlanScopeEntry } from "../../types/installation-plan";
import { LabeledSelect } from "../LabeledSelect";
import { StepSectionCard } from "../StepSectionCard";

export type AssignmentValue = InstallationPlanAssignmentEntry[];

export function isAssignmentValid(value: AssignmentValue, scope: InstallationPlanScopeEntry[]): boolean {
  const includedEntries = scope.filter((entry) => entry.included && entry.solutionCode);
  if (includedEntries.length === 0) return false;
  return includedEntries.every((entry) =>
    value.some(
      (assignment) =>
        assignment.siteId === entry.siteId &&
        assignment.solutionCode === entry.solutionCode &&
        Boolean(assignment.vendorOrgCode) &&
        Boolean(assignment.vendorEmail),
    ),
  );
}

interface TechnicianAssignmentStepProps {
  scope: InstallationPlanScopeEntry[];
  value: AssignmentValue;
  onChange: (value: AssignmentValue) => void;
  /** Vendor assignments are immutable after publication. */
  locked?: boolean;
}

export function TechnicianAssignmentStep({ scope, value, onChange, locked = false }: TechnicianAssignmentStepProps) {
  const { t } = useTranslate();

  const rows = useMemo(
    () =>
      scope
        .filter((entry) => entry.included && entry.solutionCode)
        .map((entry) => {
          const site = END_USER_SITES.find((s) => s.id === entry.siteId);
          const solution = SOLUTION_OPTIONS.find((s) => s.code === entry.solutionCode);
          return { siteId: entry.siteId, solutionCode: entry.solutionCode!, siteName: site?.name ?? entry.siteId, solutionName: solution?.name ?? entry.solutionCode! };
        }),
    [scope],
  );

  function findAssignment(siteId: string, solutionCode: string) {
    return value.find((entry) => entry.siteId === siteId && entry.solutionCode === solutionCode);
  }

  function updateAssignment(siteId: string, solutionCode: string, patch: Partial<InstallationPlanAssignmentEntry>) {
    const existing = findAssignment(siteId, solutionCode) ?? { siteId, solutionCode };
    const updated = { ...existing, ...patch };
    onChange([
      ...value.filter((entry) => !(entry.siteId === siteId && entry.solutionCode === solutionCode)),
      updated,
    ]);
  }

  function handleVendorChange(siteId: string, solutionCode: string, vendorOrgCode: string) {
    const org = VENDOR_ORGANIZATIONS.find((o) => o.code === vendorOrgCode);
    const primaryUser = org?.users[0];
    updateAssignment(siteId, solutionCode, {
      vendorOrgCode,
      vendorUserCode: primaryUser?.code,
      vendorEmail: primaryUser?.email ?? "",
    });
  }

  let lastSiteId: string | null = null;

  return (
    <StepSectionCard
      icon={Users}
      title={translateOr(t, "ES_PM_TECHNICIAN_ASSIGNMENT", "Technician Assignment")}
      description={translateOr(
        t,
        "ES_PM_TECHNICIAN_ASSIGNMENT_DESC",
        "Assign a vendor organization to each end user's solution",
      )}
    >
      <div className="livelihood-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                {[
                  translateOr(t, "ES_PM_END_USER", "End user"),
                  translateOr(t, "ES_PM_SOLUTION", "Solution"),
                  translateOr(t, "ES_PM_VENDOR_ORGANIZATION", "Vendor Organization"),
                  translateOr(t, "ES_PM_EMAIL_ID", "Email ID"),
                ].map((label) => (
                  <th key={label} className="px-5 py-3 text-left text-sm font-semibold text-ink-950">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const assignment = findAssignment(row.siteId, row.solutionCode);
                const showSiteName = row.siteId !== lastSiteId;
                lastSiteId = row.siteId;

                return (
                  <tr key={`${row.siteId}-${row.solutionCode}`} className="border-b border-border/70">
                    <td className="px-5 py-4 align-top font-semibold text-foreground">
                      {showSiteName ? row.siteName : null}
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium text-foreground">
                        {row.solutionName}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <LabeledSelect
                        value={assignment?.vendorOrgCode ?? ""}
                        options={VENDOR_ORGANIZATIONS}
                        placeholder={translateOr(t, "ES_PM_SELECT_VENDOR", "Select Vendor")}
                        onChange={(vendorOrgCode) => handleVendorChange(row.siteId, row.solutionCode, vendorOrgCode)}
                        disabled={locked}
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
    </StepSectionCard>
  );
}
