import { translateOr, useTranslate } from "@/shared";
import { MultiSelect, toast } from "@/ui";
import { MapPin, X } from "lucide-react";
import { useMemo } from "react";
import { useBoundaryTree } from "../../hooks/use-boundary-tree";
import type { GeographyDetails } from "../../types/project";
import { StepSectionCard } from "../StepSectionCard";

interface GeographyDetailsStepProps {
  value: GeographyDetails;
  onChange: (value: GeographyDetails) => void;
  /** True once end-user data may already be tied to this project's
   *  geography — narrowing a selection here then removes any end-user
   *  sites that fell outside the new geography (backend-enforced). */
  hasEndUserData?: boolean;
}

export function isGeographyDetailsValid(value: GeographyDetails): boolean {
  return Boolean(value.states?.length) && Boolean(value.blocks?.length);
}

interface SelectedGroupProps {
  title: string;
  emptyLabel: string;
  items: { code: string; name: string }[];
  onRemove?: (code: string) => void;
  disabled?: boolean;
}

export function SelectedGroup({ title, emptyLabel, items, onRemove, disabled = false }: SelectedGroupProps) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">{title}</p>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item) => (
            <span
              key={item.code}
              className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground"
            >
              {item.name}
              {!disabled && onRemove ? (
                <button
                  type="button"
                  onClick={() => onRemove(item.code)}
                  aria-label={`Remove ${item.name}`}
                  className="rounded-full hover:bg-black/10"
                >
                  <X className="size-3" />
                </button>
              ) : null}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function GeographyDetailsStep({ value, onChange, hasEndUserData = false }: GeographyDetailsStepProps) {
  const { t } = useTranslate();
  const { data: hierarchy, isLoading } = useBoundaryTree();

  const selectedStateCodes = useMemo(() => value.states?.map((state) => state.code) ?? [], [value.states]);
  const selectedDistrictCodes = useMemo(
    () => value.districts?.map((district) => district.code) ?? [],
    [value.districts],
  );
  const selectedBlockCodes = useMemo(() => value.blocks?.map((block) => block.code) ?? [], [value.blocks]);

  const stateOptions = hierarchy?.states ?? [];
  const districtOptions = useMemo(
    () => (hierarchy?.districts ?? []).filter((district) => selectedStateCodes.includes(district.stateCode)),
    [hierarchy, selectedStateCodes],
  );
  const blockOptions = useMemo(
    () => (hierarchy?.blocks ?? []).filter((block) => selectedDistrictCodes.includes(block.districtCode)),
    [hierarchy, selectedDistrictCodes],
  );

  function warnIfNarrowing(removedAny: boolean) {
    if (!removedAny) return;
    toast.info(
      hasEndUserData
        ? translateOr(
            t,
            "ES_PM_GEOGRAPHY_NARROWED_WITH_DATA",
            "Any end-user sites outside the updated geography will be removed automatically",
          )
        : translateOr(t, "ES_PM_GEOGRAPHY_STATE_REMOVED", "Removed districts/blocks belonging to the deselection"),
    );
  }

  function handleStatesChange(codes: string[]) {
    warnIfNarrowing(selectedStateCodes.some((code) => !codes.includes(code)));
    onChange({
      states: codes.map((code) => ({ code })),
      districts: (value.districts ?? []).filter((district) => codes.includes(district.stateCode)),
      blocks: (value.blocks ?? []).filter((block) => codes.includes(block.stateCode)),
    });
  }

  function handleDistrictsChange(codes: string[]) {
    warnIfNarrowing(selectedDistrictCodes.some((code) => !codes.includes(code)));
    const nextDistrictOptions = districtOptions.filter((district) => codes.includes(district.code));
    onChange({
      ...value,
      districts: nextDistrictOptions.map((district) => ({ code: district.code, stateCode: district.stateCode })),
      blocks: (value.blocks ?? []).filter((block) => codes.includes(block.districtCode)),
    });
  }

  function handleBlocksChange(codes: string[]) {
    warnIfNarrowing(selectedBlockCodes.some((code) => !codes.includes(code)));
    const nextBlockOptions = blockOptions.filter((block) => codes.includes(block.code));
    onChange({
      ...value,
      blocks: nextBlockOptions.map((block) => ({
        code: block.code,
        districtCode: block.districtCode,
        stateCode: block.stateCode,
      })),
    });
  }

  const selectedStates = stateOptions.filter((state) => selectedStateCodes.includes(state.code));
  const selectedDistricts = (hierarchy?.districts ?? []).filter((district) =>
    selectedDistrictCodes.includes(district.code),
  );
  const selectedBlocks = (hierarchy?.blocks ?? []).filter((block) => selectedBlockCodes.includes(block.code));

  return (
    <StepSectionCard
      icon={MapPin}
      title={translateOr(t, "ES_PM_GEOGRAPHY_DETAILS", "Geography Details")}
      description={translateOr(
        t,
        "ES_PM_GEOGRAPHY_DETAILS_DESC",
        "Select the states, districts, and blocks this project covers",
      )}
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <div className="space-y-4">
          <MultiSelect
            label={translateOr(t, "ES_PM_STATES", "State")}
            required
            options={stateOptions}
            selected={selectedStateCodes}
            onChange={handleStatesChange}
            disabled={isLoading}
            hideChips
          />
          <MultiSelect
            label={translateOr(t, "ES_PM_DISTRICTS", "District(s)")}
            options={districtOptions}
            selected={selectedDistrictCodes}
            onChange={handleDistrictsChange}
            disabled={isLoading || selectedStateCodes.length === 0}
            hideChips
          />
          <MultiSelect
            label={translateOr(t, "ES_PM_BLOCKS", "Block(s)")}
            required
            options={blockOptions}
            selected={selectedBlockCodes}
            onChange={handleBlocksChange}
            disabled={isLoading || selectedDistrictCodes.length === 0}
            hideChips
          />
        </div>

        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <p className="mb-3 text-sm font-semibold text-foreground">
            {translateOr(t, "ES_PM_SELECTED_SUMMARY", "Selected")}
          </p>
          <div className="space-y-4">
            <SelectedGroup
              title={translateOr(t, "ES_PM_STATES", "State")}
              emptyLabel={translateOr(t, "ES_PM_NO_STATE_SELECTED", "No state selected")}
              items={selectedStates}
              onRemove={(code) => handleStatesChange(selectedStateCodes.filter((existing) => existing !== code))}
            />
            <SelectedGroup
              title={translateOr(t, "ES_PM_DISTRICTS", "District(s)")}
              emptyLabel={translateOr(t, "ES_PM_NO_DISTRICT_SELECTED", "No district selected")}
              items={selectedDistricts}
              onRemove={(code) =>
                handleDistrictsChange(selectedDistrictCodes.filter((existing) => existing !== code))
              }
            />
            <SelectedGroup
              title={translateOr(t, "ES_PM_BLOCKS", "Block(s)")}
              emptyLabel={translateOr(t, "ES_PM_NO_BLOCK_SELECTED", "No block selected")}
              items={selectedBlocks}
              onRemove={(code) => handleBlocksChange(selectedBlockCodes.filter((existing) => existing !== code))}
            />
          </div>
        </div>
      </div>
    </StepSectionCard>
  );
}
