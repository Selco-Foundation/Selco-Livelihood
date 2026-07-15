import type { SelectOption } from "../../types/create-incident";
import { useMemo } from "react";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/ui";
import { Info } from "lucide-react";

interface FormComboboxFieldProps {
  label: string;
  required?: boolean;
  value: string;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  onChange: (option: SelectOption | null) => void;
}

export function FormComboboxField({
  label,
  required = false,
  value,
  options,
  placeholder = "Select",
  disabled = false,
  error,
  onChange,
}: FormComboboxFieldProps) {
  const selectedOption = useMemo(
    () => options.find((option) => option.code === value) ?? null,
    [options, value],
  );

  return (
    <div className="min-w-0 space-y-1.5">
      <label className="text-sm font-medium text-foreground">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </label>
      <Combobox
        items={options}
        value={selectedOption}
        onValueChange={(option) => onChange(option)}
        itemToStringLabel={(option) => option.name}
        itemToStringValue={(option) => option.code}
        isItemEqualToValue={(a, b) => a.code === b.code}
        disabled={disabled}
      >
        <ComboboxInput
          placeholder={placeholder}
          showClear={!!selectedOption}
          aria-invalid={!!error}
          disabled={disabled}
        />
        <ComboboxContent>
          <ComboboxEmpty>No results found</ComboboxEmpty>
          <ComboboxList>
            {(option: SelectOption) => (
              <ComboboxItem key={option.code} value={option}>
                {option.name}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      {error ? (
        <p className="flex items-center gap-1 text-xs text-destructive">
          <Info className="size-3.5 shrink-0" />
          {error}
        </p>
      ) : null}
    </div>
  );
}
