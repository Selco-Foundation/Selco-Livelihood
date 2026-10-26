import { translateOr, useTranslate } from "@/shared";
import { MultiSelect, SearchableSelect, SelectedGroup } from "@/ui";
import { ClipboardList, Info } from "lucide-react";
import { useGeographyLocks, useSectorLocks } from "../../hooks/use-geography-locks";
import { useGeographySelection } from "../../hooks/use-geography-selection";
import { useReviewerOptions } from "../../hooks/use-reviewer-options";
import { useSectors } from "../../hooks/use-sectors";
import type { GeographyLockTarget } from "../../types/installation-plan";
import type { GeographyDetails } from "../../types/project";
import { DateField } from "../DateField";
import { StepSectionCard } from "../StepSectionCard";

export interface PlanDetailsValue {
  geographyDetails: GeographyDetails;
  sectorCodes: string[];
  reviewerCode: string;
  startDate?: number;
  endDate?: number;
}

interface PlanDetailsStepProps {
  value: PlanDetailsValue;
  onChange: (value: PlanDetailsValue) => void;
  /** What the geography pickers may offer: the parent project's geography (a plan's must stay a
   *  subset of it), or -- for a published plan, which can only shrink -- its own current one. */
  allowedGeography: GeographyDetails;
  /** The parent project's start date — used as the earliest selectable
   *  plan start date. */
  projectStartDate?: number;
  /** The parent project's end date — used as the latest selectable plan
   *  end date. */
  projectEndDate?: number;
  /** The dates become immutable once the plan has been created. */
  locked?: boolean;
  /** The geography alone: editable on a new or DRAFT plan, read-only otherwise. Defaults to
   *  `!locked`. What may be removed is narrowed separately, by `lockTarget`. */
  geographyEditable?: boolean;
  /** An existing plan: the places and sectors holding a site in its scope are fetched and cannot be
   *  removed. */
  lockTarget?: GeographyLockTarget;
  /** The sectors that may be picked. Unset offers every sector; a published plan, which can only
   *  shrink, passes its own current ones. */
  allowedSectorCodes?: string[];
  /** A draft plan with step-1 edits that only Next saves -- warn before they are lost. */
  showUnsavedWarning?: boolean;
  /** The reviewer field alone, separately lockable. Defaults to `locked`. The caller unlocks it
   *  when the plan has no reviewer assigned -- which happens when the assignment failed after the
   *  plan was created -- because `locked` would otherwise leave the field empty *and* read-only,
   *  and `isPlanDetailsValid` requires a reviewer, so Next could never be enabled again. */
  reviewerLocked?: boolean;
}

/** Local midnight of a timestamp, so two dates compare by calendar day rather than by instant. */
function startOfDay(timestamp: number): number {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export function isPlanDetailsValid(
  value: PlanDetailsValue,
  projectStartDate?: number,
  projectEndDate?: number,
): boolean {
  return (
    Boolean(value.geographyDetails.states?.length) &&
    Boolean(value.geographyDetails.blocks?.length) &&
    Boolean(value.sectorCodes?.length) &&
    Boolean(value.reviewerCode) &&
    Boolean(value.startDate) &&
    Boolean(value.endDate) &&
    (!value.startDate || !value.endDate || value.startDate <= value.endDate) &&
    // Compared by calendar day, not by instant. DateField hands back local midnight, while the
    // project's own dates can carry a time (a UTC midnight read in IST is 05:30 local). The
    // calendar's minDate matcher is day-granular, so without this the PM can pick the project's
    // own start day, have it accepted by the picker, and then find Next silently disabled.
    (!value.startDate || !projectStartDate || startOfDay(value.startDate) >= startOfDay(projectStartDate)) &&
    (!value.endDate || !projectEndDate || startOfDay(value.endDate) <= startOfDay(projectEndDate))
  );
}

export function PlanDetailsStep({
  value,
  onChange,
  allowedGeography,
  projectStartDate,
  projectEndDate,
  locked = false,
  geographyEditable: canEditGeography = !locked,
  lockTarget,
  reviewerLocked = locked,
  allowedSectorCodes,
  showUnsavedWarning = false,
}: Readonly<PlanDetailsStepProps>) {
  const { t } = useTranslate();
  const { data: sectorOptions = [] } = useSectors();
  const { data: reviewerOptions = [] } = useReviewerOptions();
  const { data: lockedGeography, isLoading: isLocksLoading } = useGeographyLocks(lockTarget);
  const { data: lockedSectors, isLoading: isSectorLocksLoading } = useSectorLocks(lockTarget);
  // Until the locks load, nothing may be removed: a locked place would otherwise look removable.
  const geographyEditable = canEditGeography && !isLocksLoading;
  const { states, districts, blocks } = useGeographySelection({
    value: value.geographyDetails,
    onChange: (geographyDetails) => onChange({ ...value, geographyDetails }),
    allowed: allowedGeography,
    locked: lockedGeography,
  });
  // Until the locks load, no sector may be removed, same as the geography.
  const sectorsEditable = !isSectorLocksLoading;
  const pickableSectors = allowedSectorCodes
    ? sectorOptions.filter((sector) => allowedSectorCodes.includes(sector.code))
    : sectorOptions;
  const selectedSectors = sectorOptions.filter((sector) => value.sectorCodes.includes(sector.code));

  return (
    <StepSectionCard
      icon={ClipboardList}
      title={translateOr(t, "ES_PM_INSTALLATION_PLAN_DETAILS", "Installation Plan Details")}
      description={translateOr(
        t,
        "ES_PM_INSTALLATION_PLAN_DETAILS_DESC",
        "This installation plan is based on your selected end-user sites. You can add more sites to this plan as needed.",
      )}
    >
      {showUnsavedWarning ? (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3" role="status">
          <Info className="size-4 shrink-0 text-amber-600" />
          <p className="text-sm font-medium text-amber-800">
            {translateOr(
              t,
              "ES_PM_PLAN_UNSAVED_CHANGES",
              "You have unsaved changes. Click Next to save them, or they will be lost.",
            )}
          </p>
        </div>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <div className="space-y-4">
          <MultiSelect
            label={translateOr(t, "ES_PM_STATE", "State")}
            required
            options={states.options}
            selected={states.selectedCodes}
            onChange={states.onChange}
            disabled={!geographyEditable}
            locked={lockedGeography}
            hideChips
          />
          <MultiSelect
            label={translateOr(t, "ES_PM_DISTRICTS", "District(s)")}
            required
            options={districts.options}
            selected={districts.selectedCodes}
            onChange={districts.onChange}
            disabled={!geographyEditable || states.selectedCodes.length === 0}
            locked={lockedGeography}
            hideChips
          />
          <MultiSelect
            label={translateOr(t, "ES_PM_BLOCKS", "Block(s)")}
            required
            options={blocks.options}
            selected={blocks.selectedCodes}
            onChange={blocks.onChange}
            disabled={!geographyEditable || districts.selectedCodes.length === 0}
            locked={lockedGeography}
            hideChips
          />
          <MultiSelect
            label={translateOr(t, "ES_PM_SECTOR", "Sector")}
            required
            options={pickableSectors}
            selected={value.sectorCodes}
            placeholder={translateOr(t, "ES_PM_SELECT_SECTOR", "Select Sector")}
            onChange={(sectorCodes) => onChange({ ...value, sectorCodes })}
            disabled={!sectorsEditable}
            locked={lockedSectors}
            hideChips
          />
          <SearchableSelect
            label={translateOr(t, "ES_PM_ASSIGN_INSTALLATION_REVIEWER", "Assign Installation Reviewer")}
            required
            value={value.reviewerCode}
            options={reviewerOptions}
            placeholder={translateOr(t, "ES_PM_SELECT_REVIEWER", "Select Reviewer")}
            onChange={(option) => onChange({ ...value, reviewerCode: option?.code ?? "" })}
            disabled={reviewerLocked}
          />
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              {translateOr(t, "ES_PM_FIELD_PLAN_DATES", "Field Plan Dates")}
              <span className="text-destructive"> *</span>
            </label>
            <div className="grid grid-cols-2 gap-4">
              <DateField
                label={translateOr(t, "ES_PM_START_DATE", "Start Date")}
                value={value.startDate}
                onChange={(startDate) => onChange({ ...value, startDate })}
                disabled={locked}
                minDate={projectStartDate ? new Date(projectStartDate) : undefined}
                maxDate={projectEndDate ? new Date(projectEndDate) : undefined}
              />
              <DateField
                label={translateOr(t, "ES_PM_END_DATE", "End Date")}
                value={value.endDate}
                onChange={(endDate) => onChange({ ...value, endDate })}
                disabled={locked}
                minDate={value.startDate ? new Date(value.startDate) : undefined}
                maxDate={projectEndDate ? new Date(projectEndDate) : undefined}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {translateOr(t, "ES_PM_FIELD_PLAN_DATES_HELP", "Must fall within the project's own dates")}
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <p className="mb-3 text-sm font-semibold text-foreground">
            {translateOr(t, "ES_PM_SELECTED_SUMMARY", "Selected")}
          </p>
          <div className="h-[320px] space-y-4 overflow-y-auto pr-1">
            <SelectedGroup
              title={translateOr(t, "ES_PM_STATE", "State")}
              emptyLabel={translateOr(t, "ES_PM_NO_STATE_SELECTED", "No state selected")}
              items={states.selectedItems}
              onRemove={(code) => states.onChange(states.selectedCodes.filter((selected) => selected !== code))}
              disabled={!geographyEditable}
              locked={lockedGeography}
            />
            <SelectedGroup
              title={translateOr(t, "ES_PM_DISTRICTS", "District(s)")}
              emptyLabel={translateOr(t, "ES_PM_NO_DISTRICT_SELECTED", "No district selected")}
              items={districts.selectedItems}
              onRemove={(code) =>
                districts.onChange(districts.selectedCodes.filter((selected) => selected !== code))
              }
              disabled={!geographyEditable}
              locked={lockedGeography}
            />
            <SelectedGroup
              title={translateOr(t, "ES_PM_BLOCKS", "Block(s)")}
              emptyLabel={translateOr(t, "ES_PM_NO_BLOCK_SELECTED", "No block selected")}
              items={blocks.selectedItems}
              onRemove={(code) => blocks.onChange(blocks.selectedCodes.filter((selected) => selected !== code))}
              disabled={!geographyEditable}
              locked={lockedGeography}
            />
          </div>
          <div className="mt-4 border-t border-border pt-4">
            <SelectedGroup
              title={translateOr(t, "ES_PM_SECTOR", "Sector")}
              emptyLabel={translateOr(t, "ES_PM_NO_SECTOR_SELECTED", "No sector selected")}
              items={selectedSectors}
              onRemove={(code) => onChange({ ...value, sectorCodes: value.sectorCodes.filter((selected) => selected !== code) })}
              disabled={!sectorsEditable}
              locked={lockedSectors}
            />
          </div>
        </div>
      </div>
    </StepSectionCard>
  );
}
