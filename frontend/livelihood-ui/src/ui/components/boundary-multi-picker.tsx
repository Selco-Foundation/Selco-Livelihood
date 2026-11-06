import { useMemo } from "react";
import {
  pruneBoundarySelection,
  translateOr,
  useBoundaryHierarchy,
  useTranslate,
  type BoundaryNode,
  type BoundarySelection,
} from "@/shared";
import { MultiSelect, type MultiSelectOption } from "./multi-select";
import { SelectedGroup } from "./selected-group";

interface BoundaryMultiPickerProps {
  value: BoundarySelection;
  onChange: (value: BoundarySelection) => void;
  disabled?: boolean;
}

type Level = keyof BoundarySelection;

/**
 * Cascading State → District → Block multi-select over the whole tenant boundary tree. Each list
 * offers only the children of what is selected above it, and deselecting a parent drops its
 * children (`pruneBoundarySelection`). Names come from the `BOUNDARY_<code>` localization, falling
 * back to the code.
 *
 * The dropdowns show only a count; what is selected is listed in the "Selected" panel below,
 * one scrolling column per level. Chips under each dropdown made the three fields different
 * heights (so they no longer lined up) and, once a state's worth of blocks was picked, overflowed
 * into a cramped scroll box.
 */
export function BoundaryMultiPicker({ value, onChange, disabled = false }: Readonly<BoundaryMultiPickerProps>) {
  const { t } = useTranslate();
  const { data: hierarchy, isLoading } = useBoundaryHierarchy();

  const options = useMemo(() => {
    const toOption = (node: BoundaryNode): MultiSelectOption => ({
      code: node.code,
      name: translateOr(t, `BOUNDARY_${node.code}`, node.code),
    });
    const states = new Set(value.states);
    const districts = new Set(value.districts);
    return {
      states: (hierarchy?.states ?? []).map(toOption),
      districts: (hierarchy?.districts ?? []).filter((node) => states.has(node.parentCode)).map(toOption),
      blocks: (hierarchy?.blocks ?? []).filter((node) => districts.has(node.parentCode)).map(toOption),
    };
  }, [hierarchy, value.states, value.districts, t]);

  function change(next: BoundarySelection) {
    onChange(pruneBoundarySelection(next, hierarchy));
  }

  function setLevel(level: Level, codes: string[]) {
    change({ ...value, [level]: codes });
  }

  function selectedItems(level: Level) {
    const byName = (a: MultiSelectOption, b: MultiSelectOption) => a.name.localeCompare(b.name);
    return options[level].filter((option) => value[level].includes(option.code)).sort(byName);
  }

  const busy = disabled || isLoading;
  // Only the state is required: leaving a level empty means "all of it"
  // (`buildBoundaryDataTree`), so district and block narrow the selection rather than complete it.
  const levels: { level: Level; label: string; empty: string; disabled: boolean; required: boolean }[] = [
    {
      level: "states",
      label: translateOr(t, "ES_PM_STATES", "State"),
      empty: translateOr(t, "ES_PM_NO_STATE_SELECTED", "No state selected"),
      disabled: busy,
      required: true,
    },
    {
      level: "districts",
      label: translateOr(t, "ES_PM_DISTRICTS", "District(s)"),
      empty: translateOr(t, "ES_PM_NO_DISTRICT_SELECTED", "All districts"),
      disabled: busy || value.states.length === 0,
      required: false,
    },
    {
      level: "blocks",
      label: translateOr(t, "ES_PM_BLOCKS", "Block(s)"),
      empty: translateOr(t, "ES_PM_NO_BLOCK_SELECTED", "All blocks"),
      disabled: busy || value.districts.length === 0,
      required: false,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        {levels.map(({ level, label, disabled: levelDisabled, required }) => (
          <MultiSelect
            key={level}
            label={label}
            required={required}
            options={options[level]}
            selected={value[level]}
            onChange={(codes) => setLevel(level, codes)}
            disabled={levelDisabled}
            hideChips
          />
        ))}
      </div>

      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <p className="mb-3 text-sm font-semibold text-foreground">
          {translateOr(t, "ES_PM_SELECTED_SUMMARY", "Selected")}
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          {levels.map(({ level, label, empty }) => (
            <div key={level} className="max-h-40 overflow-y-auto pr-1">
              <SelectedGroup
                title={`${label} (${value[level].length})`}
                emptyLabel={empty}
                items={selectedItems(level)}
                onRemove={(code) => setLevel(level, value[level].filter((existing) => existing !== code))}
                disabled={busy}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
