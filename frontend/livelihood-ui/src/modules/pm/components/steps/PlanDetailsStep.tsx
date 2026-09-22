import { translateOr, useTranslate } from "@/shared";
import { MultiSelect } from "@/ui";
import { ClipboardList } from "lucide-react";
import { useMemo } from "react";
import { useBoundaryTree } from "../../hooks/use-boundary-tree";
import { useReviewerOptions } from "../../hooks/use-reviewer-options";
import { useSectors } from "../../hooks/use-sectors";
import type { GeographyDetails } from "../../types/project";
import { DateField } from "../DateField";
import { LabeledSelect } from "../LabeledSelect";
import { StepSectionCard } from "../StepSectionCard";
import { SelectedGroup } from "../SelectedGroup";

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
  /** The parent project's own geography — a plan's geography must stay a
   *  subset of it, so the pickers here only ever offer these options. */
  projectGeography: GeographyDetails;
  /** The parent project's start date — used as the earliest selectable
   *  plan start date. */
  projectStartDate?: number;
  /** The parent project's end date — used as the latest selectable plan
   *  end date. */
  projectEndDate?: number;
  /** Plan details become immutable once the plan has been created. */
  locked?: boolean;
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
    (!value.startDate || !projectStartDate || value.startDate >= projectStartDate) &&
    (!value.endDate || !projectEndDate || value.endDate <= projectEndDate)
  );
}

export function PlanDetailsStep({
  value,
  onChange,
  projectGeography,
  projectStartDate,
  projectEndDate,
  locked = false,
}: PlanDetailsStepProps) {
  const { t } = useTranslate();
  const { data: hierarchy } = useBoundaryTree();
  const { data: sectorOptions = [] } = useSectors();
  const { data: reviewerOptions = [] } = useReviewerOptions();

  const selectedStateCodes = useMemo(
    () => value.geographyDetails.states?.map((state) => state.code) ?? [],
    [value.geographyDetails.states],
  );
  const selectedDistrictCodes = useMemo(
    () => value.geographyDetails.districts?.map((district) => district.code) ?? [],
    [value.geographyDetails.districts],
  );
  const selectedBlockCodes = useMemo(
    () => value.geographyDetails.blocks?.map((block) => block.code) ?? [],
    [value.geographyDetails.blocks],
  );

  // Plan geography must be a subset of the project's own geography — so the
  // option lists here are the project's selections, not the full hierarchy.
  const projectStateCodes = useMemo(
    () => new Set(projectGeography.states?.map((state) => state.code) ?? []),
    [projectGeography.states],
  );
  const projectDistrictCodes = useMemo(
    () => new Set(projectGeography.districts?.map((district) => district.code) ?? []),
    [projectGeography.districts],
  );
  const projectBlockCodes = useMemo(
    () => new Set(projectGeography.blocks?.map((block) => block.code) ?? []),
    [projectGeography.blocks],
  );

  const stateOptions = (hierarchy?.states ?? [])
    .filter((state) => projectStateCodes.has(state.code))
    .map((state) => ({ ...state, name: translateOr(t, `BOUNDARY_${state.code}`, state.name) }));
  const districtOptions = (hierarchy?.districts ?? [])
    .filter((district) => projectDistrictCodes.has(district.code) && selectedStateCodes.includes(district.stateCode))
    .map((district) => ({ ...district, name: translateOr(t, `BOUNDARY_${district.code}`, district.name) }));
  const blockOptions = (hierarchy?.blocks ?? [])
    .filter((block) => projectBlockCodes.has(block.code) && selectedDistrictCodes.includes(block.districtCode))
    .map((block) => ({ ...block, name: translateOr(t, `BOUNDARY_${block.code}`, block.name) }));
  const selectedStates = stateOptions.filter((state) => selectedStateCodes.includes(state.code));
  const selectedDistricts = (hierarchy?.districts ?? [])
    .filter((district) => selectedDistrictCodes.includes(district.code))
    .map((district) => ({ ...district, name: translateOr(t, `BOUNDARY_${district.code}`, district.name) }));
  const selectedBlocks = (hierarchy?.blocks ?? [])
    .filter((block) => selectedBlockCodes.includes(block.code))
    .map((block) => ({ ...block, name: translateOr(t, `BOUNDARY_${block.code}`, block.name) }));
  const selectedSectors = sectorOptions.filter((sector) => value.sectorCodes.includes(sector.code));

  function handleStatesChange(codes: string[]) {
    onChange({
      ...value,
      geographyDetails: {
        states: codes.map((code) => ({ code })),
        districts: (value.geographyDetails.districts ?? []).filter((district) => codes.includes(district.stateCode)),
        blocks: (value.geographyDetails.blocks ?? []).filter((block) => codes.includes(block.stateCode)),
      },
    });
  }

  function handleDistrictsChange(codes: string[]) {
    const nextDistrictOptions = districtOptions.filter((district) => codes.includes(district.code));
    onChange({
      ...value,
      geographyDetails: {
        ...value.geographyDetails,
        districts: nextDistrictOptions.map((district) => ({ code: district.code, stateCode: district.stateCode })),
        blocks: (value.geographyDetails.blocks ?? []).filter((block) => codes.includes(block.districtCode)),
      },
    });
  }

  function handleBlocksChange(codes: string[]) {
    const nextBlockOptions = blockOptions.filter((block) => codes.includes(block.code));
    onChange({
      ...value,
      geographyDetails: {
        ...value.geographyDetails,
        blocks: nextBlockOptions.map((block) => ({
          code: block.code,
          districtCode: block.districtCode,
          stateCode: block.stateCode,
        })),
      },
    });
  }

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
      <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <div className="space-y-4">
          <MultiSelect
            label={translateOr(t, "ES_PM_STATE", "State")}
            required
            options={stateOptions}
            selected={selectedStateCodes}
            onChange={handleStatesChange}
            disabled={locked}
            hideChips
          />
          <MultiSelect
            label={translateOr(t, "ES_PM_DISTRICTS", "District(s)")}
            required
            options={districtOptions}
            selected={selectedDistrictCodes}
            onChange={handleDistrictsChange}
            disabled={locked || selectedStateCodes.length === 0}
            hideChips
          />
          <MultiSelect
            label={translateOr(t, "ES_PM_BLOCKS", "Block(s)")}
            required
            options={blockOptions}
            selected={selectedBlockCodes}
            onChange={handleBlocksChange}
            disabled={locked || selectedDistrictCodes.length === 0}
            hideChips
          />
          <MultiSelect
            label={translateOr(t, "ES_PM_SECTOR", "Sector")}
            required
            options={sectorOptions}
            selected={value.sectorCodes}
            placeholder={translateOr(t, "ES_PM_SELECT_SECTOR", "Select Sector")}
            onChange={(sectorCodes) => onChange({ ...value, sectorCodes })}
            disabled={locked}
            hideChips
          />
          <LabeledSelect
            label={translateOr(t, "ES_PM_ASSIGN_INSTALLATION_REVIEWER", "Assign Installation Reviewer")}
            required
            value={value.reviewerCode}
            options={reviewerOptions}
            placeholder={translateOr(t, "ES_PM_SELECT_REVIEWER", "Select Reviewer")}
            onChange={(reviewerCode) => onChange({ ...value, reviewerCode })}
            disabled={locked}
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
              items={selectedStates}
              onRemove={(code) => handleStatesChange(selectedStateCodes.filter((selected) => selected !== code))}
              disabled={locked}
            />
            <SelectedGroup
              title={translateOr(t, "ES_PM_DISTRICTS", "District(s)")}
              emptyLabel={translateOr(t, "ES_PM_NO_DISTRICT_SELECTED", "No district selected")}
              items={selectedDistricts}
              onRemove={(code) =>
                handleDistrictsChange(selectedDistrictCodes.filter((selected) => selected !== code))
              }
              disabled={locked}
            />
            <SelectedGroup
              title={translateOr(t, "ES_PM_BLOCKS", "Block(s)")}
              emptyLabel={translateOr(t, "ES_PM_NO_BLOCK_SELECTED", "No block selected")}
              items={selectedBlocks}
              onRemove={(code) => handleBlocksChange(selectedBlockCodes.filter((selected) => selected !== code))}
              disabled={locked}
            />
          </div>
          <div className="mt-4 border-t border-border pt-4">
            <SelectedGroup
              title={translateOr(t, "ES_PM_SECTOR", "Sector")}
              emptyLabel={translateOr(t, "ES_PM_NO_SECTOR_SELECTED", "No sector selected")}
              items={selectedSectors}
              onRemove={(code) => onChange({ ...value, sectorCodes: value.sectorCodes.filter((selected) => selected !== code) })}
              disabled={locked}
            />
          </div>
        </div>
      </div>
    </StepSectionCard>
  );
}
