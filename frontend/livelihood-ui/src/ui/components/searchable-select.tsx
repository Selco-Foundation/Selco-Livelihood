import { useId, useMemo, useState } from "react";
import { translateOr, useTranslate } from "@/shared";
import { cn } from "@/ui/lib/utils";
import { Input } from "@/ui/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/components/ui/popover";
import { ChevronDown, Info, Search } from "lucide-react";

export interface SearchableSelectOption {
  code: string;
  name: string;
}

interface SearchableSelectBaseProps<TOption extends SearchableSelectOption> {
  required?: boolean;
  value: string;
  options: TOption[];
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  onChange: (option: TOption | null) => void;
}

/**
 * A visible label, or an invisible one — but never neither.
 *
 * Dropping the label is legitimate: inside a table the column header is the field name, and
 * repeating it on every row would be noise. What is not legitimate is the result, a trigger whose
 * only accessible name is its own current value, so a keyboard user tabbing through the technician
 * grid hears "Select, Select, Select" with no idea which column or which row they are in. Making
 * this a union means omitting both is a compile error rather than something to notice in an audit.
 */
export type SearchableSelectProps<TOption extends SearchableSelectOption> =
  SearchableSelectBaseProps<TOption> &
    (
      | { label: string; ariaLabel?: string }
      | { label?: undefined; ariaLabel: string }
    );

/**
 * Single-select dropdown with a search box for filtering the option list — the `MultiSelect`
 * sibling's single-select counterpart, and the same Popover+Input pattern, so it needs no
 * dependency beyond what the kit already has. Originated as the Incident Management module's
 * `FormSelectField` and was promoted here once the PM module needed the identical behavior.
 */
export function SearchableSelect<TOption extends SearchableSelectOption>({
  label,
  ariaLabel,
  required = false,
  value,
  options,
  placeholder,
  disabled = false,
  error,
  onChange,
}: Readonly<SearchableSelectProps<TOption>>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { t } = useTranslate();
  // Same reasoning as MultiSelect: without these the trigger announces only its current value,
  // and `required` is visual-only.
  const triggerId = useId();
  const labelId = `${triggerId}-label`;
  const errorId = `${triggerId}-error`;
  const resolvedPlaceholder = placeholder ?? translateOr(t, "ES_COMMON_SELECT_PLACEHOLDER", "Select");

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
          {/* Decorative; the word beside it is what assistive technology reads. */}
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
            // Neither aria-required nor aria-invalid is supported on role="button", so the
            // required state travels in the label text and the error stays linked by description.
            // With a visible label the trigger's own id is listed second, so the value is
            // announced after the field name; without one, ariaLabel carries the whole name.
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
                {translateOr(t, "ES_COMMON_NO_OPTIONS", "No options found")}
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
