import { translateOr, useTranslate } from "@/shared";
import { MultiSelect, toast } from "@/ui";
import { MapPin } from "lucide-react";
import { useGeographyLocks } from "../../hooks/use-geography-locks";
import { useGeographySelection } from "../../hooks/use-geography-selection";
import type { GeographyLockTarget } from "../../types/installation-plan";
import type { GeographyDetails } from "../../types/project";
import { SelectedGroup } from "../SelectedGroup";
import { StepSectionCard } from "../StepSectionCard";

interface GeographyDetailsStepProps {
  value: GeographyDetails;
  onChange: (value: GeographyDetails) => void;
  /** True once end-user data may already be tied to this project's
   *  geography — narrowing a selection here then removes any end-user
   *  sites that fell outside the new geography (backend-enforced). */
  hasEndUserData?: boolean;
  /** An existing project: the places its installation plans use are fetched and cannot be
   *  removed. */
  lockTarget?: GeographyLockTarget;
}

export function isGeographyDetailsValid(value: GeographyDetails): boolean {
  return Boolean(value.states?.length) && Boolean(value.blocks?.length);
}


export function GeographyDetailsStep({
  value,
  onChange,
  hasEndUserData = false,
  lockTarget,
}: Readonly<GeographyDetailsStepProps>) {
  const { t } = useTranslate();
  const { data: locked } = useGeographyLocks(lockTarget);
  const { isLoading, states, districts, blocks } = useGeographySelection({
    value,
    onChange,
    locked,
    onCascadeRemoval: () =>
      toast.info(
        hasEndUserData
          ? translateOr(
              t,
              "ES_PM_GEOGRAPHY_NARROWED_WITH_DATA",
              "Any end-user sites outside the updated geography will be removed automatically",
            )
          : translateOr(t, "ES_PM_GEOGRAPHY_STATE_REMOVED", "Removed districts/blocks belonging to the deselection"),
      ),
  });

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
            options={states.options}
            selected={states.selectedCodes}
            onChange={states.onChange}
            disabled={isLoading}
            locked={locked}
            hideChips
          />
          <MultiSelect
            label={translateOr(t, "ES_PM_DISTRICTS", "District(s)")}
            options={districts.options}
            selected={districts.selectedCodes}
            onChange={districts.onChange}
            disabled={isLoading || states.selectedCodes.length === 0}
            locked={locked}
            hideChips
          />
          <MultiSelect
            label={translateOr(t, "ES_PM_BLOCKS", "Block(s)")}
            required
            options={blocks.options}
            selected={blocks.selectedCodes}
            onChange={blocks.onChange}
            disabled={isLoading || districts.selectedCodes.length === 0}
            locked={locked}
            hideChips
          />
        </div>

        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <p className="mb-3 text-sm font-semibold text-foreground">
            {translateOr(t, "ES_PM_SELECTED_SUMMARY", "Selected")}
          </p>
          <div className="h-[160px] space-y-4 overflow-y-auto pr-1">
            <SelectedGroup
              title={translateOr(t, "ES_PM_STATES", "State")}
              emptyLabel={translateOr(t, "ES_PM_NO_STATE_SELECTED", "No state selected")}
              items={states.selectedItems}
              onRemove={(code) => states.onChange(states.selectedCodes.filter((existing) => existing !== code))}
              locked={locked}
            />
            <SelectedGroup
              title={translateOr(t, "ES_PM_DISTRICTS", "District(s)")}
              emptyLabel={translateOr(t, "ES_PM_NO_DISTRICT_SELECTED", "No district selected")}
              items={districts.selectedItems}
              onRemove={(code) =>
                districts.onChange(districts.selectedCodes.filter((existing) => existing !== code))
              }
              locked={locked}
            />
            <SelectedGroup
              title={translateOr(t, "ES_PM_BLOCKS", "Block(s)")}
              emptyLabel={translateOr(t, "ES_PM_NO_BLOCK_SELECTED", "No block selected")}
              items={blocks.selectedItems}
              onRemove={(code) => blocks.onChange(blocks.selectedCodes.filter((existing) => existing !== code))}
              locked={locked}
            />
          </div>
        </div>
      </div>
    </StepSectionCard>
  );
}
