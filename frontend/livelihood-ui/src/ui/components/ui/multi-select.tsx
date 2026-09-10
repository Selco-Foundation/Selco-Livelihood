import { useMemo, useState } from "react";
import { ChevronDown, Info, Search, X } from "lucide-react";
import { cn } from "../../lib/utils";
import { Checkbox } from "./checkbox";
import { Input } from "./input";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

export interface MultiSelectOption {
  code: string;
  name: string;
}

export interface MultiSelectProps<TOption extends MultiSelectOption> {
  label: string;
  required?: boolean;
  options: TOption[];
  selected: string[];
  onChange: (codes: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  noOptionsLabel?: string;
  selectAllLabel?: string;
  disabled?: boolean;
  error?: string;
  /** Suppress the inline removable-chip row — use when the caller renders
   *  its own selection summary elsewhere (e.g. a shared panel covering
   *  several MultiSelects) instead of repeating it under every field. */
  hideChips?: boolean;
}

/**
 * Generic multi-select combobox: select-all, ascending-name sort, and
 * removable chips rendered above the trigger (capped at two rows with an
 * internal scroll so a large selection can't push surrounding layout off
 * screen). Domain-specific cascading (e.g. deselecting a parent pruning a
 * child selection) is the composing screen's responsibility, not this
 * primitive's — it has no notion of a parent/child relationship between
 * separate MultiSelect instances.
 */
export function MultiSelect<TOption extends MultiSelectOption>({
  label,
  required = false,
  options,
  selected,
  onChange,
  placeholder = "Select",
  searchPlaceholder = "Search",
  noOptionsLabel = "No options found",
  selectAllLabel = "Select All",
  disabled = false,
  error,
  hideChips = false,
}: MultiSelectProps<TOption>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const sortedOptions = useMemo(
    () => [...options].sort((a, b) => a.name.localeCompare(b.name)),
    [options],
  );

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const selectedOptions = useMemo(
    () => sortedOptions.filter((option) => selectedSet.has(option.code)),
    [sortedOptions, selectedSet],
  );

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return sortedOptions;
    return sortedOptions.filter((option) => option.name.toLowerCase().includes(normalizedQuery));
  }, [sortedOptions, query]);

  const allSelected = sortedOptions.length > 0 && selected.length === sortedOptions.length;

  function toggleOption(code: string) {
    if (selectedSet.has(code)) {
      onChange(selected.filter((existing) => existing !== code));
    } else {
      onChange([...selected, code]);
    }
  }

  function toggleSelectAll() {
    onChange(allSelected ? [] : sortedOptions.map((option) => option.code));
  }

  function removeChip(code: string) {
    onChange(selected.filter((existing) => existing !== code));
  }

  return (
    <div className="min-w-0 space-y-1.5">
      <label className="text-sm font-medium text-foreground">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </label>

      {!hideChips && selectedOptions.length > 0 ? (
        <div className="flex max-h-16 flex-wrap gap-1.5 overflow-y-auto rounded-md border border-transparent p-0.5">
          {selectedOptions.map((option) => (
            <span
              key={option.code}
              className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground"
            >
              {option.name}
              <button
                type="button"
                onClick={() => removeChip(option.code)}
                aria-label={`Remove ${option.name}`}
                className="rounded-full hover:bg-black/10"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <Popover
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) setQuery("");
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              "livelihood-filter-select flex items-center justify-between gap-2 pr-3 text-left disabled:cursor-not-allowed disabled:opacity-50",
              selectedOptions.length === 0 && "text-muted-foreground",
              error && "border-destructive focus-visible:ring-destructive",
            )}
          >
            <span className="truncate">
              {selectedOptions.length > 0
                ? `${selectedOptions.length} selected`
                : placeholder}
            </span>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-(--radix-popover-trigger-width) p-2"
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              className="h-8 pl-8 text-sm"
            />
          </div>

          {sortedOptions.length > 0 ? (
            <div
              role="button"
              tabIndex={0}
              onClick={toggleSelectAll}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  toggleSelectAll();
                }
              }}
              className="mb-1 flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm font-medium text-primary hover:underline"
            >
              <Checkbox checked={allSelected} tabIndex={-1} className="pointer-events-none" />
              {selectAllLabel}
            </div>
          ) : null}

          <div className="flex max-h-56 flex-col gap-0.5 overflow-y-auto pr-2">
            {filteredOptions.length === 0 ? (
              <p className="px-2 py-1.5 text-sm text-muted-foreground">{noOptionsLabel}</p>
            ) : (
              filteredOptions.map((option) => (
                <div
                  key={option.code}
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleOption(option.code)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      toggleOption(option.code);
                    }
                  }}
                  className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                >
                  <Checkbox
                    checked={selectedSet.has(option.code)}
                    tabIndex={-1}
                    className="pointer-events-none"
                  />
                  <span className="truncate">{option.name}</span>
                </div>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
      {error ? (
        <p className="flex items-center gap-1 text-xs text-destructive">
          <Info className="size-3.5 shrink-0" />
          {error}
        </p>
      ) : null}
    </div>
  );
}
