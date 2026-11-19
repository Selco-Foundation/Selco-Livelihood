import { employeeHomePath, extractApiErrorMessage, translateOr, useTranslate } from "@/shared";
import { Button, SearchableSelect, Skeleton, toast, TopBar } from "@/ui";
import { Link, useSearch } from "@tanstack/react-router";
import { Info, Plus, Sun } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AddAmcDialog } from "../../components/AddAmcDialog";
import { AmcFieldStaffSelect } from "../../components/AmcFieldStaffSelect";
import { DateField } from "../../components/DateField";
import { StepSectionCard } from "../../components/StepSectionCard";
import { WizardActionFooter } from "../../components/WizardActionFooter";
import { useAmcOptions } from "../../hooks/use-amc-options";
import { useAmcSchedules } from "../../hooks/use-amc-schedules";
import { useInstallationPlanById } from "../../hooks/use-installation-plan-by-id";
import { useProjectById } from "../../hooks/use-project-by-id";
import { useUpdateAmcSchedules } from "../../hooks/use-update-amc-schedules";
import type { EditAmcRouteSearch } from "../../routes";
import type { AmcScheduleField, AmcScheduleRow, AmcScheduleRowError } from "../../types/amc";
import {
  firstAmcDueDate,
  isAmcScheduleDirty,
  isPendingActivation,
  toAmcScheduleRows,
  totalAmcActivities,
  validateAmcSchedules,
} from "../../utils/amc-schedule";
import { formatDate } from "../../utils/format-date";
import { pmMyProjectsPath, pmProjectDetailsPath } from "../../utils/paths";

export function EditAmcPage() {
  const { t } = useTranslate();
  const { projectId, planId } = useSearch({ strict: false }) as EditAmcRouteSearch;

  const { data: project } = useProjectById(projectId);
  const { data: plan } = useInstallationPlanById(planId);
  const { data: response, isLoading } = useAmcSchedules(planId);
  const updateSchedules = useUpdateAmcSchedules(planId);

  const originalRows = useMemo(() => toAmcScheduleRows(response), [response]);
  const { frequencyOptions: amcFrequencies, yearsOptions: amcYears } = useAmcOptions();
  const [rows, setRows] = useState<AmcScheduleRow[]>([]);
  const [errors, setErrors] = useState<AmcScheduleRowError[]>([]);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    setRows(originalRows);
    setErrors([]);
  }, [originalRows]);

  const isDirty = isAmcScheduleDirty(originalRows, rows);

  const frequencyOptions = amcFrequencies.map((option) => ({
    code: String(option.months),
    name: translateOr(t, option.labelKey, option.fallback),
  }));
  const yearsOptions = amcYears.map((option) => ({
    code: String(option.years),
    name: translateOr(t, option.labelKey, option.fallback),
  }));

  const fieldLabels: Record<AmcScheduleField, string> = {
    startDate: translateOr(t, "ES_PM_AMC_START_DATE", "AMC start date"),
    frequencyMonths: translateOr(t, "ES_PM_AMC_FREQUENCY", "AMC frequency"),
    years: translateOr(t, "ES_PM_AMC_YEARS", "Number of years"),
  };

  function updateRow(id: string, patch: Partial<AmcScheduleRow>) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function handleSave() {
    const validationErrors = validateAmcSchedules(rows);
    setErrors(validationErrors);
    if (validationErrors.length > 0 || !response) return;

    updateSchedules.mutate(
      { original: originalRows, rows },
      {
        onSuccess: () => {
          toast.success(translateOr(t, "ES_PM_AMC_SCHEDULE_SAVED", "AMC schedule saved"));
        },
        onError: (error) => {
          toast.error(translateOr(t, "ES_PM_AMC_SCHEDULE_SAVE_FAILED", "Could not save the AMC schedule"), {
            description:
              extractApiErrorMessage(error) ??
              translateOr(t, "ES_SOMETHING_WRONG", "Something went wrong. Please try again."),
          });
        },
      },
    );
  }

  const readOnlyColumns = [
    translateOr(t, "ES_PM_END_USER", "End user"),
    translateOr(t, "ES_PM_PHONE_NUMBER", "Phone number"),
    translateOr(t, "ES_PM_STATE", "State"),
    translateOr(t, "CS_DISTRICT", "District"),
    translateOr(t, "CS_BLOCK", "Block"),
    translateOr(t, "ES_PM_ASSET", "Asset"),
    translateOr(t, "ES_PM_AMC_INSTALLATION", "Installation"),
  ];
  const computedColumns = [
    translateOr(t, "ES_PM_AMC_FIRST_DUE", "First AMC due"),
    translateOr(t, "ES_PM_AMC_TOTAL", "Total AMCs"),
    translateOr(t, "ES_PM_AMC_FIELD_STAFF", "AMC field staff"),
  ];

  return (
    // Bounded flex column with an inner scroll region, so the footer stays inside SidebarInset's box.
    <div className="w-full space-y-6 pb-20">
        <TopBar
          title={translateOr(t, "ES_PM_EDIT_AMC", "Edit AMC")}
          breadcrumbs={[
            { label: translateOr(t, "CORE_COMMON_OVERVIEW", "Overview"), to: employeeHomePath() },
            { label: translateOr(t, "ES_PM_MY_PROJECTS", "My Projects"), to: pmMyProjectsPath() },
            {
              label: project?.name ?? translateOr(t, "ES_PM_PROJECT", "Project"),
              to: pmProjectDetailsPath(),
              search: { projectId },
            },
            { label: translateOr(t, "ES_PM_EDIT_AMC", "Edit AMC") },
          ]}
        />

        <StepSectionCard
          icon={Sun}
          title={translateOr(t, "ES_PM_EDIT_AMC_SCHEDULE", "Edit AMC schedule")}
          description={translateOr(
            t,
            "ES_PM_EDIT_AMC_SCHEDULE_DESC",
            "Change the AMC start date, frequency and years for each end user",
          )}
        >
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm">
              <span className="font-medium text-muted-foreground">
                {translateOr(t, "ES_PM_INSTALLATION_PLAN_CODE", "Installation Plan Code")}:
              </span>{" "}
              <span className="font-semibold text-foreground">{plan?.name ?? "-"}</span>
            </p>
            <Button type="button" variant="outline" size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="size-4" />
              {translateOr(t, "ES_PM_ADD_AMC", "Add AMC")}
            </Button>
          </div>

          <div role="status" className="flex items-start gap-2 rounded-lg bg-primary/5 p-3 text-sm text-foreground">
            <Info className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>
              {translateOr(
                t,
                "ES_PM_EDIT_AMC_INFO",
                "End-user details are for reference and cannot be edited. The AMC start date can be set once the end user's installation is complete. Save becomes active once you change a value. The assigned vendor is changed from the Admin module.",
              )}
            </span>
          </div>

          {errors.length > 0 ? (
            <div role="alert" className="space-y-1 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
              <p className="font-medium text-destructive">
                {translateOr(
                  t,
                  "ES_PM_AMC_SCHEDULE_INVALID",
                  "Nothing was saved. Fix these rows and try again:",
                )}
              </p>
              <ul className="list-disc pl-5 text-foreground">
                {errors.map((error) => (
                  <li key={error.id}>
                    {error.endUserName}: {error.missing.map((field) => fieldLabels[field]).join(", ")}{" "}
                    {translateOr(t, "ES_PM_AMC_IS_REQUIRED", "is required")}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {translateOr(t, "ES_PM_NO_AMC_END_USERS", "No end users with AMC in this installation plan")}
            </p>
          ) : (
            <div className="livelihood-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1900px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {readOnlyColumns.map((label) => (
                        <th key={label} className="px-5 py-3 text-left text-sm font-semibold text-ink-950">
                          {label}
                        </th>
                      ))}
                      {(["startDate", "frequencyMonths", "years"] as const).map((field) => (
                        <th key={field} className="bg-accent px-5 py-3 text-left text-sm font-semibold text-ink-950">
                          {fieldLabels[field]}
                        </th>
                      ))}
                      {computedColumns.map((label) => (
                        <th key={label} className="px-5 py-3 text-left text-sm font-semibold text-ink-950">
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const rowError = errors.find((error) => error.id === row.id);
                      return (
                        <tr key={row.id} className="border-b border-border/70 last:border-b-0">
                          <td className="px-5 py-4 font-semibold text-foreground">{row.endUserName}</td>
                          <td className="px-5 py-4 text-foreground">{row.phoneNumber}</td>
                          <td className="px-5 py-4 text-foreground">{row.state}</td>
                          <td className="px-5 py-4 text-foreground">{row.district}</td>
                          <td className="px-5 py-4 text-foreground">{row.block}</td>
                          <td className="px-5 py-4">
                            <span className="inline-flex items-center rounded-md bg-accent px-2 py-1 text-xs font-medium text-primary">
                              {translateOr(t, "ES_PM_ASSET_SOLAR", "Solar")}
                            </span>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            {row.installedOn ? (
                              <span className="text-foreground">
                                {translateOr(t, "ES_PM_AMC_INSTALLED_ON", "Installed")} {formatDate(row.installedOn)}
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-md bg-warning px-2 py-1 text-xs font-medium text-warning-foreground">
                                {translateOr(t, "ES_PM_AMC_NOT_INSTALLED", "Not installed yet")}
                              </span>
                            )}
                          </td>
                          <td className="w-[180px] bg-accent/40 px-5 py-4">
                            <DateField
                              hideLabel
                              label={`${fieldLabels.startDate}, ${row.endUserName}`}
                              // A pending AMC starts on the day its installation report is approved, so the
                              // start date opens only once the AMC is running. The server also refuses a
                              // change after visit 1 has been submitted.
                              disabled={isPendingActivation(row)}
                              minDate={row.installedOn ? new Date(row.installedOn) : undefined}
                              placeholder={
                                isPendingActivation(row)
                                  ? translateOr(t, "ES_PM_AMC_AFTER_INSTALLATION", "After installation")
                                  : undefined
                              }
                              value={row.startDate}
                              onChange={(startDate) => updateRow(row.id, { startDate })}
                              error={rowError?.missing.includes("startDate") ? fieldLabels.startDate : undefined}
                            />
                          </td>
                          <td className="w-[170px] bg-accent/40 px-5 py-4">
                            <SearchableSelect
                              ariaLabel={`${fieldLabels.frequencyMonths}, ${row.endUserName}`}
                              value={row.frequencyMonths ? String(row.frequencyMonths) : ""}
                              options={frequencyOptions}
                              placeholder={translateOr(t, "ES_COMMON_SELECT_PLACEHOLDER", "Select")}
                              error={rowError?.missing.includes("frequencyMonths") ? fieldLabels.frequencyMonths : undefined}
                              onChange={(option) =>
                                updateRow(row.id, { frequencyMonths: option ? Number(option.code) : undefined })
                              }
                            />
                          </td>
                          <td className="w-[150px] bg-accent/40 px-5 py-4">
                            <SearchableSelect
                              ariaLabel={`${fieldLabels.years}, ${row.endUserName}`}
                              value={row.years ? String(row.years) : ""}
                              options={yearsOptions}
                              placeholder={translateOr(t, "ES_COMMON_SELECT_PLACEHOLDER", "Select")}
                              error={rowError?.missing.includes("years") ? fieldLabels.years : undefined}
                              onChange={(option) => updateRow(row.id, { years: option ? Number(option.code) : undefined })}
                            />
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap text-foreground">
                            {isPendingActivation(row) ? (
                              <span className="text-xs font-medium text-muted-foreground">
                                {translateOr(t, "ES_PM_AMC_PENDING_ACTIVATION", "Pending activation")}
                              </span>
                            ) : (
                              formatDate(firstAmcDueDate(row))
                            )}
                          </td>
                          <td className="px-5 py-4 text-foreground">{totalAmcActivities(row) ?? "-"}</td>
                          <td className="w-[240px] px-5 py-4">
                            <AmcFieldStaffSelect
                              rowLabel={row.endUserName}
                              organizationId={row.vendorOrgId}
                              value={row.fieldStaffId ?? ""}
                              onChange={(fieldStaffId, fieldStaffName) => updateRow(row.id, { fieldStaffId, fieldStaffName })}
                              disabled={false}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        </StepSectionCard>

      <WizardActionFooter>
        <Button asChild variant="outline" size="sm">
          <Link to={pmProjectDetailsPath()} search={{ projectId }}>
            {translateOr(t, "CORE_COMMON_BACK", "Back")}
          </Link>
        </Button>
        <Button type="button" size="sm" className="px-5" onClick={handleSave} disabled={!isDirty || updateSchedules.isPending}>
          {translateOr(t, "CORE_COMMON_SAVE", "Save")}
        </Button>
      </WizardActionFooter>
      <AddAmcDialog planId={planId} open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
