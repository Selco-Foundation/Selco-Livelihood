import { translateOr, useTranslate } from "@/shared";
import {
  Checkbox,
  cn,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ScrollArea,
  Separator,
} from "@/ui";
import { ChevronDown, Filter, Search } from "lucide-react";
import { useState } from "react";
import type { AmcReportStatus, AmcReportTab } from "../types/amc-report";
import type { AmcFilterOption, AmcFilterOptions } from "../utils/filter-options";
import { DateRangeField } from "./DateRangeField";

export interface AmcReportFilterState {
  vendors: string[];
  states: string[];
  districts: string[];
  blocks: string[];
  statuses: AmcReportStatus[];
  slaBreachedOnly: boolean;
  submittedFrom?: number;
  submittedTo?: number;
}

export const EMPTY_AMC_REPORT_FILTERS: AmcReportFilterState = {
  vendors: [],
  states: [],
  districts: [],
  blocks: [],
  statuses: [],
  slaBreachedOnly: false,
};

type ListCategory = "vendors" | "states" | "districts" | "blocks" | "statuses";
type Category = ListCategory | "sla";

interface AmcReportFilterProps {
  tab: AmcReportTab;
  options: AmcFilterOptions;
  filters: AmcReportFilterState;
  searchText: string;
  onFilterChange: (filters: AmcReportFilterState) => void;
  onSearchTextChange: (searchText: string) => void;
}

/** Modelled on IR's ActivityFilter (copied, not imported: modules must not import each other). */
export function AmcReportFilter({
  tab,
  options,
  filters,
  searchText,
  onFilterChange,
  onSearchTextChange,
}: Readonly<AmcReportFilterProps>) {
  const { t } = useTranslate();
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<Category>("vendors");
  const [categorySearch, setCategorySearch] = useState("");

  const statusOptions: AmcFilterOption[] = [
    { code: "PENDING_APPROVAL", name: translateOr(t, "ES_AMC_STATUS_PENDING_APPROVAL", "Pending approval") },
    { code: "REJECTED", name: translateOr(t, "ES_AMC_STATUS_REJECTED", "Sent for rework") },
    { code: "APPROVED", name: translateOr(t, "ES_AMC_STATUS_APPROVED", "Approved") },
  ];

  // The Auto-Approved tab only filters by vendor and geography (PRD 5.5.6).
  const categories: Array<{ key: Category; label: string; options?: AmcFilterOption[] }> = [
    { key: "vendors", label: translateOr(t, "ES_AMC_VENDOR", "Vendor"), options: options.vendors },
    { key: "states", label: translateOr(t, "CS_STATE", "State"), options: options.states },
    { key: "districts", label: translateOr(t, "CS_DISTRICT", "District"), options: options.districts },
    { key: "blocks", label: translateOr(t, "CS_BLOCK", "Block"), options: options.blocks },
    ...(tab === "pending"
      ? [
          { key: "statuses" as const, label: translateOr(t, "ES_AMC_REPORT_STATUS", "Report Status"), options: statusOptions },
          { key: "sla" as const, label: translateOr(t, "ES_AMC_SLA_BREACHED", "SLA Breached") },
        ]
      : []),
  ];

  const active = categories.find((category) => category.key === activeCategory) ?? categories[0];
  const searchLower = categorySearch.trim().toLowerCase();
  const visibleOptions = (active.options ?? []).filter((option) =>
    searchLower ? option.name.toLowerCase().includes(searchLower) : true,
  );

  function toggleOption(category: ListCategory, code: string) {
    const current = filters[category] as string[];
    onFilterChange({
      ...filters,
      [category]: current.includes(code) ? current.filter((value) => value !== code) : [...current, code],
    });
  }

  const hasActiveFilters =
    filters.vendors.length > 0 ||
    filters.states.length > 0 ||
    filters.districts.length > 0 ||
    filters.blocks.length > 0 ||
    filters.statuses.length > 0 ||
    filters.slaBreachedOnly ||
    Boolean(filters.submittedFrom || filters.submittedTo);

  return (
    <div className="livelihood-card flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-3">
        <Popover
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (next) setCategorySearch("");
          }}
        >
          <PopoverTrigger asChild>
            <button
              type="button"
              className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-md border border-primary px-3 text-sm font-semibold text-primary"
            >
              <Filter className="size-4" />
              {translateOr(t, "ES_AMC_FILTERS", "Filters")}
              <Separator orientation="vertical" className="h-4" />
              <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-0">
            <div className="flex">
              <div className="w-44 shrink-0 border-r border-border py-2">
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
                      active.key === category.key
                        ? "border-primary font-semibold text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
              <div className="w-64 shrink-0 space-y-3 p-3">
                {active.key === "sla" ? (
                  <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
                    <Checkbox
                      className="size-5 rounded-md border-2 border-primary"
                      checked={filters.slaBreachedOnly}
                      onCheckedChange={(checked) => onFilterChange({ ...filters, slaBreachedOnly: checked === true })}
                    />
                    {translateOr(t, "ES_AMC_ONLY_SLA_BREACHED", "Only SLA breached")}
                  </label>
                ) : (
                  <>
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
                            <label key={option.code} className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
                              <Checkbox
                                className="size-5 rounded-md border-2 border-primary"
                                checked={(filters[active.key as ListCategory] as string[]).includes(option.code)}
                                onCheckedChange={() => toggleOption(active.key as ListCategory, option.code)}
                              />
                              {option.name}
                            </label>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {tab === "pending" ? (
          <DateRangeField
            label={translateOr(t, "ES_AMC_SUBMISSION_DATE_RANGE", "Submission date")}
            value={{ from: filters.submittedFrom, to: filters.submittedTo }}
            onChange={(range) => onFilterChange({ ...filters, submittedFrom: range.from, submittedTo: range.to })}
          />
        ) : null}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchText}
            onChange={(event) => onSearchTextChange(event.target.value)}
            placeholder={translateOr(t, "ES_AMC_SEARCH_END_USER", "Search end user name or phone")}
            aria-label={translateOr(t, "ES_AMC_SEARCH_END_USER", "Search end user name or phone")}
            className="pl-9"
          />
        </div>
        <button
          type="button"
          disabled={!hasActiveFilters}
          onClick={() => onFilterChange(EMPTY_AMC_REPORT_FILTERS)}
          className={cn(
            "text-sm transition-colors",
            hasActiveFilters ? "cursor-pointer text-foreground hover:text-primary" : "text-muted-foreground/50",
          )}
        >
          {translateOr(t, "ES_IM_CLEAR_ALL_FILTERS", "clear all filters")}
        </button>
      </div>
    </div>
  );
}
