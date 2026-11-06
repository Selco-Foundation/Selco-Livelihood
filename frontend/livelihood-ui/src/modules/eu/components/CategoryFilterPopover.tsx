import { translateOr, useTranslate } from "@/shared";
import { Checkbox, Input, Popover, PopoverContent, PopoverTrigger, ScrollArea, Separator, cn } from "@/ui";
import { ChevronDown, Filter } from "lucide-react";
import { useState } from "react";

export interface FilterOption {
  code: string;
  name: string;
}

export interface FilterCategoryDef {
  key: string;
  label: string;
  options: FilterOption[];
}

interface CategoryFilterPopoverProps {
  categories: FilterCategoryDef[];
  selected: Record<string, string[]>;
  onToggle: (categoryKey: string, code: string) => void;
  onClearAll: () => void;
}

/**
 * A multi-category, checkbox-list filter popover — the pattern already used
 * by `FacilityFilterPanel`/`BoundaryFilterPanel`, factored out once it needed
 * a third and fourth home (Activity/Asset tabs) rather than being copied
 * again with only the category list changing.
 */
export function CategoryFilterPopover({
  categories,
  selected,
  onToggle,
  onClearAll,
}: CategoryFilterPopoverProps) {
  const { t } = useTranslate();
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(categories[0]?.key ?? "");
  const [categorySearch, setCategorySearch] = useState("");

  const activeOptions = categories.find((category) => category.key === activeCategory)?.options ?? [];
  const searchLower = categorySearch.trim().toLowerCase();
  const visibleOptions = activeOptions
    .filter((option) => (searchLower ? option.name.toLowerCase().includes(searchLower) : true))
    .slice()
    .sort((a, b) => {
      const aSelected = (selected[activeCategory] ?? []).includes(a.code);
      const bSelected = (selected[activeCategory] ?? []).includes(b.code);
      if (aSelected !== bSelected) return aSelected ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

  const hasActiveFilters = Object.values(selected).some((codes) => codes.length > 0);

  return (
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
                          checked={(selected[activeCategory] ?? []).includes(option.code)}
                          onCheckedChange={() => onToggle(activeCategory, option.code)}
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
        onClick={onClearAll}
        className={cn(
          "text-sm transition-colors",
          hasActiveFilters ? "cursor-pointer text-foreground hover:text-primary" : "text-muted-foreground/50",
        )}
      >
        {translateOr(t, "ES_IM_CLEAR_ALL_FILTERS", "clear all filters")}
      </button>
    </div>
  );
}
