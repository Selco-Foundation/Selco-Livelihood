import { translateOr, useTranslate } from "@/shared";
import { Input } from "@/ui";
import { Eye, EyeOff, Info } from "lucide-react";
import { useState } from "react";

interface PasswordFieldProps {
  label: string;
  value: string;
  required?: boolean;
  error?: string;
  hint?: string;
  placeholder?: string;
  onChange: (value: string) => void;
}

/** Masked password input with a show/hide toggle. */
export function PasswordField({ label, value, required, error, hint, placeholder, onChange }: PasswordFieldProps) {
  const { t } = useTranslate();
  const [visible, setVisible] = useState(false);

  return (
    <div className="min-w-0 space-y-1.5">
      <label className="text-sm font-medium text-foreground">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </label>
      <div className="relative">
        <Input
          type={visible ? "text" : "password"}
          autoComplete="new-password"
          value={value}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          className="pr-10"
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={
            visible
              ? translateOr(t, "CORE_LOGIN_PASSWORD_HIDE", "Hide password")
              : translateOr(t, "CORE_LOGIN_PASSWORD_SHOW", "Show password")
          }
          className="absolute inset-y-0 right-3 flex cursor-pointer items-center text-ink-400"
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
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
