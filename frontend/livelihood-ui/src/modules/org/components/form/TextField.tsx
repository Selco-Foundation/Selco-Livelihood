import { Input } from "@/ui";
import { Info } from "lucide-react";
import type { ComponentProps } from "react";

interface TextFieldProps extends Omit<ComponentProps<typeof Input>, "onChange" | "value"> {
  label: string;
  value: string;
  required?: boolean;
  error?: string;
  hint?: string;
  onChange: (value: string) => void;
}

export function TextField({ label, value, required, error, hint, onChange, ...inputProps }: TextFieldProps) {
  return (
    <div className="min-w-0 space-y-1.5">
      <label className="text-sm font-medium text-foreground">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </label>
      <Input
        {...inputProps}
        value={value}
        aria-invalid={Boolean(error)}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? (
        <p className="flex items-center gap-1 text-xs text-destructive">
          <Info className="size-3.5 shrink-0" />
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
