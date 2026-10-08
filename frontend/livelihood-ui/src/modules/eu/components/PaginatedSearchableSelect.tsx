import { translateOr, useDebouncedValue, useTranslate } from "@/shared";
import { cn } from "@/ui/lib/utils";
import { Input } from "@/ui/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/components/ui/popover";
import { ChevronDown, Info, Search } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";

export interface PaginatedSearchableSelectOption {
  code: string;
  name: string;
}

interface PaginatedSearchableSelectBaseProps<TOption extends PaginatedSearchableSelectOption> {
  required?: boolean;
  value: string;
  options: TOption[];
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  isLoading?: boolean;
  /** More pages exist beyond what's in `options` — renders a "Load more" row. Omit (or leave
   * false) when the backing endpoint doesn't paginate at all. */
  hasMore?: boolean;
  onLoadMore?: () => void;
  /** Debounced (300ms) server-side search — wire this up when the backing endpoint supports a
   * text filter. Whatever's already in `options` is always filtered locally too, so a caller that
   * omits this still gets instant filtering of whatever's been loaded so far. */
  onQueryChange?: (query: string) => void;
  onChange: (option: TOption | null) => void;
}

/**
 * `SearchableSelect`'s sibling for an option list that's loaded lazily rather than all at once —
 * a server-paginated list ("Load more" appends the next page) and/or a server-searched one
 * (`onQueryChange` re-queries on typing), instead of assuming every option is already in hand.
 */
export type PaginatedSearchableSelectProps<TOption extends PaginatedSearchableSelectOption> =
  PaginatedSearchableSelectBaseProps<TOption> &
    (
      | { label: string; ariaLabel?: string }
      | { label?: undefined; ariaLabel: string }
    );

export function PaginatedSearchableSelect<TOption extends PaginatedSearchableSelectOption>({
  label,
  ariaLabel,
  required = false,
  value,
  options,
  placeholder,
  disabled = false,
  error,
  isLoading = false,
  hasMore = false,
  onLoadMore,
  onQueryChange,
  onChange,
}: Readonly<PaginatedSearchableSelectProps<TOption>>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);
  const { t } = useTranslate();
  const triggerId = useId();
  const labelId = `${triggerId}-label`;
  const errorId = `${triggerId}-error`;
  const resolvedPlaceholder = placeholder ?? translateOr(t, "ES_COMMON_SELECT_PLACEHOLDER", "Select");

  useEffect(() => {
    onQueryChange?.(debouncedQuery);
    // onQueryChange is a caller-supplied callback, not reactive state this effect should re-run for.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery]);

  const selectedOption = useMemo(
    () => options.find((option) => option.code === value) ?? null,
    [options, value],
  );

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return options;
    return options.filter((option) => option.name.toLowerCase().includes(normalizedQuery));
  }, [options, query]);

  return (
    <div className="min-w-0 space-y-1.5">
      {label ? (
        <label id={labelId} className="text-sm font-medium text-foreground">
          {label}
          {required ? (
            <>
              <span className="text-destructive" aria-hidden="true"> *</span>
              <span className="sr-only"> (required)</span>
            </>
          ) : null}
        </label>
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
            aria-labelledby={label ? `${labelId} ${triggerId}` : undefined}
            aria-label={label ? undefined : ariaLabel}
            aria-describedby={error ? errorId : undefined}
            className={cn(
              "livelihood-filter-select flex items-center justify-between gap-2 pr-3 text-left disabled:cursor-not-allowed disabled:opacity-50",
              !selectedOption && "text-muted-foreground",
              error && "border-destructive focus-visible:ring-destructive",
            )}
          >
            <span className="truncate">{selectedOption ? selectedOption.name : resolvedPlaceholder}</span>
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
              placeholder={translateOr(t, "ES_COMMON_SEARCH", "Search")}
              className="h-8 pl-8 text-sm"
            />
          </div>
          <div className="flex max-h-56 flex-col gap-0.5 overflow-y-auto pr-2">
            {filteredOptions.length === 0 ? (
              <p className="px-2 py-1.5 text-sm text-muted-foreground">
                {isLoading
                  ? translateOr(t, "CORE_COMMON_LOADING", "Loading...")
                  : translateOr(t, "ES_COMMON_NO_OPTIONS", "No options found")}
              </p>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option.code}
                  type="button"
                  onClick={() => {
                    onChange(option);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={cn(
                    "w-full cursor-pointer rounded-sm px-2 py-1.5 text-left text-sm hover:underline",
                    option.code === value && "bg-accent text-accent-foreground",
                  )}
                >
                  {option.name}
                </button>
              ))
            )}
            {hasMore ? (
              <button
                type="button"
                disabled={isLoading}
                onClick={() => onLoadMore?.()}
                className="w-full cursor-pointer rounded-sm px-2 py-1.5 text-center text-sm font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading
                  ? translateOr(t, "CORE_COMMON_LOADING", "Loading...")
                  : translateOr(t, "ES_COMMON_LOAD_MORE", "Load more")}
              </button>
            ) : null}
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
