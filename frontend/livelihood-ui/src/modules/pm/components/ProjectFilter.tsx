import { translateOr, useTranslate } from "@/shared";
import { Checkbox, cn, Input, Popover, PopoverContent, PopoverTrigger, ScrollArea, Separator } from "@/ui";
import { ChevronDown, Filter } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { useBoundaryTree } from "../hooks/use-boundary-tree";
import type { ProjectListFilters } from "../types/project";

type FilterCategory = "state" | "status";

interface ProjectFilterProps {
  value: ProjectListFilters;
  onChange: (filters: ProjectListFilters) => void;
  searchSlot: ReactNode;
}

/** Project-list adaptation of the Inbox filter popover. */
export function ProjectFilter({ value, onChange, searchSlot }: ProjectFilterProps) {
  const { t } = useTranslate();
  const { data: hierarchy } = useBoundaryTree();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<FilterCategory>("state");
  const [search, setSearch] = useState("");

  const categories = useMemo(
    () => [
      {
        key: "state" as const,
        label: translateOr(t, "ES_PM_STATE", "State"),
        options: (hierarchy?.states ?? []).map((state) => ({ code: state.code, name: state.name })),
      },
      {
        key: "status" as const,
        label: translateOr(t, "ES_PM_STATUS", "Status"),
        options: [
          { code: "ACTIVE", name: translateOr(t, "ES_PM_ACTIVE", "Active") },
          { code: "DRAFT", name: translateOr(t, "ES_PM_DRAFT", "Draft") },
        ],
      },
    ],
    [hierarchy?.states, t],
  );
  const activeCategory = categories.find((item) => item.key === category)!;
  const selectedCodes = category === "state" ? value.stateCodes : value.statuses;
  const visibleOptions = activeCategory.options
    .filter((option) => option.name.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => Number(selectedCodes.includes(b.code)) - Number(selectedCodes.includes(a.code)) || a.name.localeCompare(b.name));
  const hasActiveFilters = value.stateCodes.length > 0 || value.statuses.length > 0;

  function toggle(code: string) {
    const nextCodes = selectedCodes.includes(code)
      ? selectedCodes.filter((selected) => selected !== code)
      : [...selectedCodes, code];
    onChange(category === "state" ? { ...value, stateCodes: nextCodes } : { ...value, statuses: nextCodes });
  }

  function clearFilters() {
    onChange({ stateCodes: [], statuses: [] });
  }

  return (
    <div className="livelihood-card p-4 md:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <Popover
          open={open}
          onOpenChange={(nextOpen) => {
            setOpen(nextOpen);
            if (nextOpen) setSearch("");
          }}
        >
          <PopoverTrigger asChild>
            <button
              type="button"
              className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-md border border-primary px-3 text-sm font-semibold text-primary"
            >
              <Filter className="size-4" />
              {translateOr(t, "ES_IM_FILTERS", "Filters")}
              <Separator orientation="vertical" className="h-4" />
              <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-0">
            <div className="flex">
              <div className="w-40 shrink-0 border-r border-border py-2">
                {categories.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      setCategory(item.key);
                      setSearch("");
                    }}
                    className={cn(
                      "block w-full border-l-2 px-4 py-2 text-left text-sm transition-colors",
                      category === item.key
                        ? "border-primary font-semibold text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="w-64 shrink-0 space-y-3 p-3">
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={translateOr(t, "ES_COMMON_SEARCH", "Search")}
                />
                <ScrollArea className="h-56 pr-3">
                  <div className="space-y-3">
                    {visibleOptions.map((option) => (
                      <label key={option.code} className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
                        <Checkbox
                          className="size-5 rounded-md border-2 border-primary"
                          checked={selectedCodes.includes(option.code)}
                          onCheckedChange={() => toggle(option.code)}
                        />
                        {option.name}
                      </label>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </PopoverContent>
        </Popover>
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center lg:justify-end">
          {searchSlot}
          <button
            type="button"
            disabled={!hasActiveFilters}
            onClick={clearFilters}
            className={cn(
              "shrink-0 text-left text-sm transition-colors",
              hasActiveFilters ? "cursor-pointer text-foreground hover:text-primary" : "cursor-default text-muted-foreground/50",
            )}
          >
            {translateOr(t, "ES_IM_CLEAR_ALL_FILTERS", "clear all filters")}
          </button>
        </div>
      </div>
    </div>
  );
}
