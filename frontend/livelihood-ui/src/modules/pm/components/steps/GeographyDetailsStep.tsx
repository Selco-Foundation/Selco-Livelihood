import { useMemo } from "react";
import { translateOr, useTranslate } from "@/shared";
import { cn, MultiSelect, Skeleton, toast } from "@/ui";
import { X } from "lucide-react";
import { useBoundaryTree } from "../../hooks/use-boundary-tree";
import type { GeographyDetails } from "../../types/project";

interface GeographyDetailsStepProps {
  value: GeographyDetails;
  onChange: (value: GeographyDetails) => void;
}

export function isGeographyDetailsValid(value: GeographyDetails): boolean {
  return (value.states?.length ?? 0) > 0 && (value.blocks?.length ?? 0) > 0;
}

function SelectionGroup({
  label,
  items,
  onRemove,
}: {
  label: string;
  items: { code: string; name: string }[];
  onRemove: (code: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</p>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">None selected</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item) => (
            <span
              key={item.code}
              className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground"
            >
              {item.name}
              <button
                type="button"
                onClick={() => onRemove(item.code)}
                aria-label={`Remove ${item.name}`}
                className="rounded-full hover:bg-black/10"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function GeographyDetailsStep({ value, onChange }: GeographyDetailsStepProps) {
  const { t } = useTranslate();
  const { data: boundaryTree, isLoading } = useBoundaryTree();

  const selectedStateCodes = new Set((value.states ?? []).map((state) => state.code));
  const selectedDistrictCodes = new Set((value.districts ?? []).map((district) => district.code));

  // code -> parentCode lookups, used to resolve each pick's ancestry when
  // building GeographyDistrict/GeographyBlock rows.
  const districtParentByCode = useMemo(
    () => new Map((boundaryTree?.districts ?? []).map((district) => [district.code, district.parentCode])),
    [boundaryTree],
  );
  const blockParentByCode = useMemo(
    () => new Map((boundaryTree?.blocks ?? []).map((block) => [block.code, block.parentCode])),
    [boundaryTree],
  );

  const nameFor = (code: string) => translateOr(t, `BOUNDARY_${code}`, code);

  const stateOptions = useMemo(
    () => (boundaryTree?.states ?? []).map((state) => ({ code: state.code, name: nameFor(state.code) })),
    [boundaryTree, t],
  );

  const districtOptions = useMemo(
    () =>
      (boundaryTree?.districts ?? [])
        .filter((district) => selectedStateCodes.has(district.parentCode))
        .map((district) => ({ code: district.code, name: nameFor(district.code) })),
    [boundaryTree, t, value.states],
  );

  const blockOptions = useMemo(
    () =>
      (boundaryTree?.blocks ?? [])
        .filter((block) => selectedDistrictCodes.has(block.parentCode))
        .map((block) => ({ code: block.code, name: nameFor(block.code) })),
    [boundaryTree, t, value.districts],
  );

  const selectedStateItems = useMemo(
    () => (value.states ?? []).map((state) => ({ code: state.code, name: nameFor(state.code) })),
    [value.states, t],
  );
  const selectedDistrictItems = useMemo(
    () => (value.districts ?? []).map((district) => ({ code: district.code, name: nameFor(district.code) })),
    [value.districts, t],
  );
  const selectedBlockItems = useMemo(
    () => (value.blocks ?? []).map((block) => ({ code: block.code, name: nameFor(block.code) })),
    [value.blocks, t],
  );

  function handleStatesChange(codes: string[]) {
    const nextStateCodes = new Set(codes);
    const removedStateCodes = new Set(
      (value.states ?? []).map((state) => state.code).filter((code) => !nextStateCodes.has(code)),
    );

    const nextDistricts = (value.districts ?? []).filter(
      (district) => !removedStateCodes.has(district.stateCode),
    );
    const nextBlocks = (value.blocks ?? []).filter((block) => !removedStateCodes.has(block.stateCode));

    const removedDistrictCount = (value.districts?.length ?? 0) - nextDistricts.length;
    const removedBlockCount = (value.blocks?.length ?? 0) - nextBlocks.length;

    onChange({
      states: codes.map((code) => ({ code })),
      districts: nextDistricts,
      blocks: nextBlocks,
    });

    if (removedDistrictCount > 0 || removedBlockCount > 0) {
      toast.info(
        `${removedDistrictCount} district${removedDistrictCount === 1 ? "" : "s"} and ${removedBlockCount} block${
          removedBlockCount === 1 ? "" : "s"
        } removed with the previous state${removedStateCodes.size === 1 ? "" : "s"}`,
      );
    }
  }

  function handleDistrictsChange(codes: string[]) {
    const nextDistricts = codes.map((code) => ({
      code,
      stateCode: districtParentByCode.get(code) ?? "",
    }));
    const nextBlocks = (value.blocks ?? []).filter((block) => codes.includes(block.districtCode));

    const removedBlocks = (value.blocks?.length ?? 0) - nextBlocks.length;
    if (removedBlocks > 0) {
      toast.info(`${removedBlocks} block${removedBlocks === 1 ? "" : "s"} removed`);
    }

    onChange({ ...value, districts: nextDistricts, blocks: nextBlocks });
  }

  function handleBlocksChange(codes: string[]) {
    const nextBlocks = codes.map((code) => {
      const districtCode = blockParentByCode.get(code) ?? "";
      return {
        code,
        districtCode,
        stateCode: districtParentByCode.get(districtCode) ?? "",
      };
    });
    onChange({ ...value, blocks: nextBlocks });
  }

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  const hasAnySelection =
    selectedStateItems.length > 0 || selectedDistrictItems.length > 0 || selectedBlockItems.length > 0;

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Geography Details</h2>
        </div>

        <div className="max-w-sm">
          <MultiSelect
            label="State(s)"
            required
            hideChips
            options={stateOptions}
            selected={value.states?.map((state) => state.code) ?? []}
            onChange={handleStatesChange}
          />
        </div>

        <div className="max-w-sm">
          <MultiSelect
            label="District(s)"
            required
            hideChips
            options={districtOptions}
            selected={value.districts?.map((district) => district.code) ?? []}
            onChange={handleDistrictsChange}
            disabled={selectedStateCodes.size === 0}
          />
        </div>

        <div className="max-w-sm">
          <MultiSelect
            label="Block(s)"
            required
            hideChips
            options={blockOptions}
            selected={value.blocks?.map((block) => block.code) ?? []}
            onChange={handleBlocksChange}
            disabled={selectedDistrictCodes.size === 0}
          />
        </div>
      </div>

      <div
        className={cn(
          "livelihood-card max-h-[28rem] space-y-5 overflow-y-auto border-border/70 bg-muted/20 p-4",
        )}
      >
        <p className="text-sm font-semibold text-foreground">Selected</p>
        {hasAnySelection ? (
          <>
            <SelectionGroup
              label="State(s)"
              items={selectedStateItems}
              onRemove={(code) => handleStatesChange((value.states ?? []).map((s) => s.code).filter((c) => c !== code))}
            />
            <SelectionGroup
              label="District(s)"
              items={selectedDistrictItems}
              onRemove={(code) =>
                handleDistrictsChange((value.districts ?? []).map((d) => d.code).filter((c) => c !== code))
              }
            />
            <SelectionGroup
              label="Block(s)"
              items={selectedBlockItems}
              onRemove={(code) => handleBlocksChange((value.blocks ?? []).map((b) => b.code).filter((c) => c !== code))}
            />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Selections you make on the left will appear here.
          </p>
        )}
      </div>
    </div>
  );
}
