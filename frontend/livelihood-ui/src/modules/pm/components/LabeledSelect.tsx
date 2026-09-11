import { Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui";

interface LabeledSelectOption {
  code: string;
  name: string;
}

interface LabeledSelectProps<TOption extends LabeledSelectOption> {
  label?: string;
  required?: boolean;
  value: string;
  options: TOption[];
  placeholder?: string;
  disabled?: boolean;
  onChange: (code: string) => void;
}

/** Thin wrapper around the shadcn `Select` primitive for the common
 *  "pick one from a small list of {code, name} options" case, with an
 *  optional field label — used for Sector, Reviewer, and Vendor pickers. */
export function LabeledSelect<TOption extends LabeledSelectOption>({
  label,
  required = false,
  value,
  options,
  placeholder = "Select",
  disabled = false,
  onChange,
}: LabeledSelectProps<TOption>) {
  return (
    <div className="min-w-0 space-y-1.5">
      {label ? (
        <Label>
          {label}
          {required ? <span className="text-destructive"> *</span> : null}
        </Label>
      ) : null}
      <Select value={value || undefined} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.code} value={option.code}>
              {option.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
