import { useState } from "react";
import { Calendar, cn, Popover, PopoverContent, PopoverTrigger } from "@/ui";
import { CalendarIcon } from "lucide-react";

interface DateFieldProps {
  label: string;
  required?: boolean;
  value?: Date;
  onChange: (date: Date | undefined) => void;
  disabled?: boolean;
  /** Dates before this are not selectable (used to bind end date >= start date). */
  minDate?: Date;
  error?: string;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
}

export function DateField({
  label,
  required = false,
  value,
  onChange,
  disabled = false,
  minDate,
  error,
}: DateFieldProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-w-0 flex-1 space-y-1.5">
      <label className="text-sm font-medium text-foreground">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              "livelihood-filter-select flex items-center justify-between gap-2 pr-3 text-left disabled:cursor-not-allowed disabled:opacity-50",
              !value && "text-muted-foreground",
              error && "border-destructive focus-visible:ring-destructive",
            )}
          >
            <span>{value ? formatDate(value) : "mm/dd/yyyy"}</span>
            <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            mode="single"
            selected={value}
            defaultMonth={value ?? minDate}
            disabled={minDate ? { before: minDate } : undefined}
            onSelect={(date) => {
              onChange(date);
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
