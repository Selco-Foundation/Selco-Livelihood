import type { SelectOption } from "../../types/create-incident";
import { cn } from "@/ui";
import { ChevronDown, Info } from "lucide-react";

interface FormSelectFieldProps {
  label: string;
  required?: boolean;
  value: string;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  onChange: (option: SelectOption | null) => void;
}

export function FormSelectField({
  label,
  required = false,
  value,
  options,
  placeholder = "Select",
  disabled = false,
  error,
  onChange,
}: FormSelectFieldProps) {
  return (
    <div className="min-w-0 space-y-1.5">
      <label className="text-sm font-medium text-foreground">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </label>
      <div className="relative">
        <select
          className={cn(
            "livelihood-filter-select disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-destructive focus-visible:ring-destructive",
          )}
          value={value}
          disabled={disabled}
          onChange={(event) => {
            const next = options.find((option) => option.code === event.target.value) ?? null;
            onChange(next);
          }}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.code} value={option.code}>
              {option.name}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
      </div>
      {error ? (
        <p className="flex items-center gap-1 text-xs text-destructive">
          <Info className="size-3.5 shrink-0" />
          {error}
        </p>
      ) : null}
    </div>
  );
}
