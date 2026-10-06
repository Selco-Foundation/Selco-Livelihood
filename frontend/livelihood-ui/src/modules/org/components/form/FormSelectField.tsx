import { translateOr, useTranslate } from "@/shared";
import { cn, Input, Popover, PopoverContent, PopoverTrigger } from "@/ui";
import { ChevronDown, Info, Search } from "lucide-react";
import { useMemo, useState } from "react";

export interface SelectOption {
  code: string;
  name: string;
}

interface FormSelectFieldProps {
  label: string;
  required?: boolean;
  value: string;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  /** Show a search box above the options — for long lists such as districts or blocks. */
  searchable?: boolean;
  onChange: (option: SelectOption | null) => void;
}

/** Single-select popover — module-local copy of eu's `FormSelectField` (no cross-module imports). */
export function FormSelectField({
  label,
  required = false,
  value,
  options,
  placeholder,
  disabled = false,
  error,
  searchable = false,
  onChange,
}: FormSelectFieldProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { t } = useTranslate();
  const resolvedPlaceholder = placeholder ?? translateOr(t, "ES_COMMON_SELECT_PLACEHOLDER", "Select");

  const selectedOption = useMemo(
    () => options.find((option) => option.code === value) ?? null,
    [options, value],
  );

  const visibleOptions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return normalized ? options.filter((option) => option.name.toLowerCase().includes(normalized)) : options;
  }, [options, query]);

  return (
    <div className="min-w-0 space-y-1.5">
      <label className="text-sm font-medium text-foreground">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </label>
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
          onOpenAutoFocus={(event) => searchable || event.preventDefault()}
        >
          {searchable ? (
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
          ) : null}
          <div className="flex max-h-[min(14rem,calc(var(--radix-popover-content-available-height)-3rem))] flex-col gap-0.5 overflow-y-auto">
            {visibleOptions.length === 0 ? (
              <p className="px-2 py-1.5 text-sm text-muted-foreground">
                {translateOr(t, "ES_COMMON_NO_OPTIONS", "No options found")}
              </p>
            ) : (
              visibleOptions.map((option) => (
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
        <p className="flex items-center gap-1 text-xs text-destructive">
          <Info className="size-3.5 shrink-0" />
          {error}
        </p>
      ) : null}
    </div>
  );
}
