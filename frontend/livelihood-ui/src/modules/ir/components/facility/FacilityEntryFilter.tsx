import { translateOr, useTranslate } from "@/shared";
import {
  Button,
  Checkbox,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ScrollArea,
  Separator,
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  cn,
} from "@/ui";
import { ChevronDown, Download, Filter, Search } from "lucide-react";
import { useState } from "react";

export interface FacilityFilterOption {
  code: string;
  name: string;
}

type FacilityFilterCategory = "district" | "block" | "status";

export interface FacilityEntryFilterState {
  district: string[];
  block: string[];
  status: string[];
}

interface FacilityEntryFilterProps {
  districtOptions: FacilityFilterOption[];
  blockOptions: FacilityFilterOption[];
  statusOptions: FacilityFilterOption[];
  filters: FacilityEntryFilterState;
  searchText: string;
  onFilterChange: (filters: FacilityEntryFilterState) => void;
  onSearchTextChange: (searchText: string) => void;
  onDownload: () => void;
}

export const EMPTY_FACILITY_FILTERS: FacilityEntryFilterState = {
  district: [],
  block: [],
  status: [],
};

export function FacilityEntryFilter({
  districtOptions,
  blockOptions,
  statusOptions,
  filters,
  searchText,
  onFilterChange,
  onSearchTextChange,
  onDownload,
}: FacilityEntryFilterProps) {
  const { t } = useTranslate();

  // Two independent open states — see InboxFilter for why the desktop Popover
  // and mobile Sheet can't share one boolean.
  const [desktopFiltersOpen, setDesktopFiltersOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<FacilityFilterCategory>("district");
  const [categorySearch, setCategorySearch] = useState("");

  const categories = [
    { key: "district" as const, label: translateOr(t, "ES_IR_DISTRICT", "District"), options: districtOptions },
    { key: "block" as const, label: translateOr(t, "ES_IR_BLOCK", "Block"), options: blockOptions },
    { key: "status" as const, label: translateOr(t, "ES_IR_STATUS", "Status"), options: statusOptions },
  ];

  const activeCategoryData = categories.find((category) => category.key === activeCategory);
  const searchLower = categorySearch.trim().toLowerCase();
  const visibleOptions = (activeCategoryData?.options ?? [])
    .filter((option) => (searchLower ? option.name.toLowerCase().includes(searchLower) : true))
    .slice()
    .sort((a, b) => {
      const aSelected = filters[activeCategory].includes(a.code);
      const bSelected = filters[activeCategory].includes(b.code);
      if (aSelected !== bSelected) return aSelected ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

  function toggleOption(category: FacilityFilterCategory, code: string) {
    const current = filters[category];
    onFilterChange({
      ...filters,
      [category]: current.includes(code)
        ? current.filter((value) => value !== code)
        : [...current, code],
    });
  }

  const hasActiveFilters =
    filters.district.length > 0 || filters.block.length > 0 || filters.status.length > 0;

  function handleClearAllFilters() {
    onFilterChange(EMPTY_FACILITY_FILTERS);
  }

  const optionsContent =
    visibleOptions.length === 0 ? (
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
    );

  return (
    <div className="lg:rounded-lg lg:border lg:border-border lg:bg-card lg:p-5 lg:shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-5">
          <div className="hidden lg:block">
            <Popover
              open={desktopFiltersOpen}
              onOpenChange={(open) => {
                setDesktopFiltersOpen(open);
                if (open) {
                  setCategorySearch("");
                }
              }}
            >
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-md border border-primary px-3 text-sm font-semibold text-primary"
                >
                  <Filter className="size-4" />
                  {translateOr(t, "ES_IR_FILTERS", "Filters")}
                  <Separator orientation="vertical" className="h-4" />
                  <ChevronDown
                    className={cn(
                      "size-4 transition-transform",
                      desktopFiltersOpen && "rotate-180",
                    )}
                  />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto p-0">
                <div className="flex">
                  <div className="w-40 shrink-0 border-r border-border py-2">
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
                      <div className="space-y-3">{optionsContent}</div>
                    </ScrollArea>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="lg:hidden">
            <Sheet
              open={mobileFiltersOpen}
              onOpenChange={(open) => {
                setMobileFiltersOpen(open);
                if (open) {
                  setCategorySearch("");
                }
              }}
            >
              <SheetTrigger asChild>
                <button
                  type="button"
                  className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-md border border-primary px-3 text-sm font-semibold text-primary"
                >
                  <Filter className="size-4" />
                  <Separator orientation="vertical" className="h-4" />
                  <ChevronDown
                    className={cn(
                      "size-4 transition-transform",
                      mobileFiltersOpen && "rotate-180",
                    )}
                  />
                </button>
              </SheetTrigger>
              <SheetContent
                side="bottom"
                showCloseButton={false}
                className="max-h-[85dvh] rounded-t-2xl p-0"
              >
                <div className="mx-auto mt-3 h-1.5 w-10 shrink-0 rounded-full bg-border" />
                <SheetHeader className="shrink-0 pb-0">
                  <SheetTitle className="text-lg">
                    {translateOr(t, "ES_IR_FILTERS", "Filters")}
                  </SheetTitle>
                </SheetHeader>
                <div className="flex shrink-0 gap-6 overflow-x-auto border-b border-border px-4">
                  {categories.map((category) => (
                    <button
                      key={category.key}
                      type="button"
                      onClick={() => {
                        setActiveCategory(category.key);
                        setCategorySearch("");
                      }}
                      className={cn(
                        "shrink-0 border-b-2 px-1 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                        activeCategory === category.key
                          ? "border-primary text-primary"
                          : "border-transparent text-muted-foreground",
                      )}
                    >
                      {category.label}
                    </button>
                  ))}
                </div>
                <div className="flex-1 space-y-3 overflow-y-auto p-4">
                  <Input
                    value={categorySearch}
                    onChange={(event) => setCategorySearch(event.target.value)}
                    placeholder={translateOr(t, "ES_COMMON_SEARCH", "Search")}
                  />
                  <div className="space-y-3">{optionsContent}</div>
                </div>
                <SheetFooter className="flex-row gap-3 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    disabled={!hasActiveFilters}
                    onClick={() => {
                      handleClearAllFilters();
                      setMobileFiltersOpen(false);
                    }}
                  >
                    {translateOr(t, "ES_IM_CLEAR_ALL_FILTERS", "clear all filters")}
                  </Button>
                  <Button
                    type="button"
                    className="flex-1"
                    onClick={() => setMobileFiltersOpen(false)}
                  >
                    {translateOr(t, "ES_IM_APPLY_FILTERS", "Apply filters")}
                  </Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:shrink-0">
          <div className="relative sm:w-72">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchText}
              onChange={(event) => onSearchTextChange(event.target.value)}
              placeholder={translateOr(t, "ES_IR_SEARCH_END_USERS", "Search End Users")}
              className="pl-9"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={onDownload}
          >
            <Download className="size-4" />
            {translateOr(t, "ES_COMMON_DOWNLOAD", "Download")}
          </Button>
          <button
            type="button"
            disabled={!hasActiveFilters}
            onClick={handleClearAllFilters}
            className={cn(
              "hidden text-sm transition-colors lg:block",
              hasActiveFilters
                ? "cursor-pointer text-foreground hover:text-primary"
                : "text-muted-foreground/50",
            )}
          >
            {translateOr(t, "ES_IM_CLEAR_ALL_FILTERS", "clear all filters")}
          </button>
        </div>
      </div>
    </div>
  );
}
