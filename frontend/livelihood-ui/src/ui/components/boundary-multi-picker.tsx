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

interface BoundaryMultiPickerProps {
  value: BoundarySelection;
  onChange: (value: BoundarySelection) => void;
  disabled?: boolean;
}

/**
 * Cascading State → District → Block multi-select over the whole tenant boundary tree. Each list
 * offers only the children of what is selected above it, and deselecting a parent drops its
 * children (`pruneBoundarySelection`). Names come from the `BOUNDARY_<code>` localization, falling
 * back to the code.
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

  const busy = disabled || isLoading;
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <MultiSelect
        label={translateOr(t, "ES_PM_STATES", "State")}
        required
        options={options.states}
        selected={value.states}
        onChange={(states) => change({ ...value, states })}
        disabled={busy}
      />
      <MultiSelect
        label={translateOr(t, "ES_PM_DISTRICTS", "District(s)")}
        required
        options={options.districts}
        selected={value.districts}
        onChange={(districts) => change({ ...value, districts })}
        disabled={busy || value.states.length === 0}
      />
      <MultiSelect
        label={translateOr(t, "ES_PM_BLOCKS", "Block(s)")}
        required
        options={options.blocks}
        selected={value.blocks}
        onChange={(blocks) => change({ ...value, blocks })}
        disabled={busy || value.districts.length === 0}
      />
    </div>
  );
}
