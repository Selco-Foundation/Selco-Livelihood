import { useId, useMemo, useState } from "react";
import { ChevronDown, Info, Search, X } from "lucide-react";
import { translateOr, useTranslate } from "@/shared";
import { cn } from "../lib/utils";
import { Checkbox } from "./ui/checkbox";
import { Input } from "./ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

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
  /** Restrict to at most one selection — picking an option replaces the
   *  current selection instead of adding to it, and the Select All row is
   *  hidden. Use when the underlying field only ever stores a single value
   *  (e.g. field-planner's single-state geography), so the picker can't
   *  silently let the user choose more than what will actually be saved. */
  single?: boolean;
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
  placeholder,
  searchPlaceholder,
  noOptionsLabel,
  selectAllLabel,
  disabled = false,
  error,
  hideChips = false,
  single = false,
}: Readonly<MultiSelectProps<TOption>>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { t } = useTranslate();
  const resolvedPlaceholder = placeholder ?? translateOr(t, "ES_COMMON_SELECT_PLACEHOLDER", "Select");
  const resolvedSearchPlaceholder = searchPlaceholder ?? translateOr(t, "ES_COMMON_SEARCH", "Search");
  const resolvedNoOptionsLabel = noOptionsLabel ?? translateOr(t, "ES_COMMON_NO_OPTIONS", "No options found");
  const resolvedSelectAllLabel = selectAllLabel ?? translateOr(t, "ES_COMMON_SELECT_ALL", "Select All");
  // Names the trigger and ties the error text to it. Without this a screen reader announces the
  // control as just "N selected", with no field name -- and this primitive backs every
  // State/District/Block/Sector field in both PM wizards, so that is every one of them.
  //
  // aria-labelledby rather than the label's htmlFor: <label for> only names form controls, and
  // the trigger is a <button>, which it does not name at all. Listing the trigger's own id second
  // keeps its value in the announcement, so it reads "State, required, 3 selected".
  const triggerId = useId();
  const labelId = `${triggerId}-label`;
  const errorId = `${triggerId}-error`;

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

  // Membership, not a length comparison. `selected` can hold a code that is not among `options`
  // -- a district still selected after its state was deselected, say, or a value from saved data
  // whose option list has since narrowed. Comparing counts calls that "all selected", so Select
  // All renders checked and clicking it *clears* the selection instead of completing it.
  const allSelected = sortedOptions.length > 0 && sortedOptions.every((option) => selectedSet.has(option.code));

  function toggleOption(code: string) {
    if (single) {
      onChange(selectedSet.has(code) ? [] : [code]);
      setOpen(false);
      return;
    }
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
      <label id={labelId} className="text-sm font-medium text-foreground">
        {label}
        {/* The asterisk is decoration; the word carries the same meaning to assistive technology,
            which is how the required state reaches it now that aria-required has been dropped. */}
        {required ? (
          <>
            <span className="text-destructive" aria-hidden="true"> *</span>
            <span className="sr-only">{translateOr(t, "ES_COMMON_REQUIRED_SUFFIX", " (required)")}</span>
          </>
        ) : null}
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
                aria-label={`${translateOr(t, "ES_COMMON_REMOVE", "Remove")} ${option.name}`}
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
            id={triggerId}
            disabled={disabled}
            // No aria-required or aria-invalid here: neither is supported on role="button", and
            // asserting them is worse than leaving them off. The required state travels in the
            // label text instead, and the error stays linked through aria-describedby.
            aria-labelledby={`${labelId} ${triggerId}`}
            aria-describedby={error ? errorId : undefined}
            className={cn(
              "livelihood-filter-select flex items-center justify-between gap-2 pr-3 text-left disabled:cursor-not-allowed disabled:opacity-50",
              selectedOptions.length === 0 && "text-muted-foreground",
              error && "border-destructive focus-visible:ring-destructive",
            )}
          >
            <span className="truncate">
              {selectedOptions.length > 0
                ? t("ES_COMMON_N_SELECTED", {
                    count: selectedOptions.length,
                    defaultValue: "{{count}} selected",
                  })
                : resolvedPlaceholder}
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
              placeholder={resolvedSearchPlaceholder}
              className="h-8 pl-8 text-sm"
            />
          </div>

          {sortedOptions.length > 0 && !single ? (
            // A real <button>, not a styled div with a role: it gets Enter/Space activation and
            // focusability for free, rather than reimplementing both by hand.
            <button
              type="button"
              onClick={toggleSelectAll}
              className="mb-1 flex w-full cursor-pointer items-center gap-2 rounded-sm bg-transparent px-2 py-1.5 text-left text-sm font-medium text-primary hover:underline"
            >
              <Checkbox checked={allSelected} tabIndex={-1} className="pointer-events-none" />
              {resolvedSelectAllLabel}
            </button>
          ) : null}

          <div className="flex max-h-56 flex-col gap-0.5 overflow-y-auto pr-2">
            {filteredOptions.length === 0 ? (
              <p className="px-2 py-1.5 text-sm text-muted-foreground">{resolvedNoOptionsLabel}</p>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option.code}
                  type="button"
                  onClick={() => toggleOption(option.code)}
                  className="flex w-full cursor-pointer items-center gap-2 rounded-sm bg-transparent px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                >
                  <Checkbox
                    checked={selectedSet.has(option.code)}
                    tabIndex={-1}
                    className="pointer-events-none"
                  />
                  <span className="truncate">{option.name}</span>
                </button>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
      {error ? (
        <p id={errorId} className="flex items-center gap-1 text-xs text-destructive">
          <Info className="size-3.5 shrink-0" />
          {error}
        </p>
      ) : null}
    </div>
  );
}
