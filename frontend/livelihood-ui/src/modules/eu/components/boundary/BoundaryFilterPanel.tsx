import { translateOr, useTranslate, type BoundaryHierarchy } from "@/shared";
import {
  Button,
  Checkbox,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ScrollArea,
  Separator,
  cn,
} from "@/ui";
import { ChevronDown, Filter } from "lucide-react";
import { useState } from "react";
import { boundaryDisplayName, cascadeByParent } from "../../utils/boundary";
import type { BoundarySearchFilters } from "../../types/boundary";

type FilterCategory = "state" | "district" | "block";

interface BoundaryFilterPanelProps {
  boundaryData: BoundaryHierarchy | undefined;
  filters: BoundarySearchFilters;
  onFilterChange: (filters: BoundarySearchFilters) => void;
  onAddBoundary: () => void;
  onBulkAdd: () => void;
}

export function BoundaryFilterPanel({
  boundaryData,
  filters,
  onFilterChange,
  onAddBoundary,
  onBulkAdd,
}: BoundaryFilterPanelProps) {
  const { t } = useTranslate();
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<FilterCategory>("state");
  const [categorySearch, setCategorySearch] = useState("");

  const districtsForSelectedStates = cascadeByParent(boundaryData?.districts ?? [], filters.state);
  const blocksForSelectedDistricts = cascadeByParent(boundaryData?.blocks ?? [], filters.district);

  const categories: Array<{ key: FilterCategory; label: string; options: { code: string }[] }> = [
    { key: "state", label: translateOr(t, "CS_STATE", "State"), options: boundaryData?.states ?? [] },
    { key: "district", label: translateOr(t, "CS_DISTRICT", "District"), options: districtsForSelectedStates },
    { key: "block", label: translateOr(t, "CS_BLOCK", "Block"), options: blocksForSelectedDistricts },
  ];

  const activeOptions = categories.find((category) => category.key === activeCategory)?.options ?? [];
  const searchLower = categorySearch.trim().toLowerCase();
  const visibleOptions = activeOptions
    .map((option) => ({ code: option.code, name: boundaryDisplayName(option.code, t) }))
    .filter((option) => (searchLower ? option.name.toLowerCase().includes(searchLower) : true))
    .sort((a, b) => {
      const aSelected = filters[activeCategory].includes(a.code);
      const bSelected = filters[activeCategory].includes(b.code);
      if (aSelected !== bSelected) return aSelected ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

  function toggleOption(category: FilterCategory, code: string) {
    const current = filters[category];
    const nextCurrent = current.includes(code)
      ? current.filter((value) => value !== code)
      : [...current, code];

    const next: BoundarySearchFilters = { ...filters, [category]: nextCurrent };

    // Selecting/removing a parent boundary prunes any now-invalid children,
    // matching fa's BoundaryTable/Filter.js cascade-reset-on-remove behavior.
    if (category === "state") {
      const validDistricts = cascadeByParent(boundaryData?.districts ?? [], nextCurrent).map((d) => d.code);
      next.district = filters.district.filter((code) => validDistricts.includes(code));
      const validBlocks = cascadeByParent(boundaryData?.blocks ?? [], next.district).map((b) => b.code);
      next.block = filters.block.filter((code) => validBlocks.includes(code));
    } else if (category === "district") {
      const validBlocks = cascadeByParent(boundaryData?.blocks ?? [], nextCurrent).map((b) => b.code);
      next.block = filters.block.filter((code) => validBlocks.includes(code));
    }

    onFilterChange(next);
  }

  const hasActiveFilters =
    filters.state.length > 0 || filters.district.length > 0 || filters.block.length > 0;

  function clearAll() {
    onFilterChange({ state: [], district: [], block: [] });
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-3">
        <Popover
          open={open}
          onOpenChange={(nextOpen) => {
            setOpen(nextOpen);
            if (nextOpen) setCategorySearch("");
          }}
        >
          <PopoverTrigger asChild>
            <button
              type="button"
              className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-md border border-primary px-3 text-sm font-semibold text-primary"
            >
              <Filter className="size-4" />
              {translateOr(t, "CORE_COMMON_FILTER", "Filter")}
              <Separator orientation="vertical" className="h-4" />
              <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-0">
            <div className="flex">
              <div className="w-36 shrink-0 border-r border-border py-2">
                {categories.map((category) => (
                  <button
                    key={category.key}
                    type="button"
                    onClick={() => {
                      setActiveCategory(category.key);
                      setCategorySearch("");
                    }}
                    className={cn(
                      "block w-full border-l-2 px-4 py-2 text-left text-sm transition-colors",
                      activeCategory === category.key
                        ? "border-primary font-semibold text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
              <div className="w-64 shrink-0 space-y-3 p-3">
                <Input
                  value={categorySearch}
                  onChange={(event) => setCategorySearch(event.target.value)}
                  placeholder={translateOr(t, "ES_COMMON_SEARCH", "Search")}
                />
                <ScrollArea className="h-56 pr-3">
                  <div className="space-y-3">
                    {visibleOptions.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        {translateOr(t, "ES_COMMON_NO_OPTIONS", "No options found")}
                      </p>
                    ) : (
                      visibleOptions.map((option) => (
                        <label
                          key={option.code}
                          className="flex cursor-pointer items-center gap-2 text-sm font-semibold"
                        >
                          <Checkbox
                            className="size-5 rounded-md border-2 border-primary"
                            checked={filters[activeCategory].includes(option.code)}
                            onCheckedChange={() => toggleOption(activeCategory, option.code)}
                          />
                          {option.name}
                        </label>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <button
          type="button"
          disabled={!hasActiveFilters}
          onClick={clearAll}
          className={cn(
            "text-sm transition-colors",
            hasActiveFilters
              ? "cursor-pointer text-foreground hover:text-primary"
              : "text-muted-foreground/50",
          )}
        >
          {translateOr(t, "ES_IM_CLEAR_ALL_FILTERS", "clear all filters")}
        </button>
      </div>

      <div className="flex items-center gap-3">
        <Button type="button" variant="outline" onClick={onAddBoundary}>
          {translateOr(t, "FA_ADD_BOUNDARY", "Add Boundary")}
        </Button>
        <Button type="button" variant="outline" onClick={onBulkAdd}>
          {translateOr(t, "BULK_ADD", "Bulk Add")}
        </Button>
      </div>
    </div>
  );
}
