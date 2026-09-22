import { translateOr, useTranslate } from "@/shared";
import { Button, Calendar, cn, Popover, PopoverContent, PopoverTrigger } from "@/ui";
import { format } from "date-fns";
import { CalendarIcon, Info } from "lucide-react";
import { useState } from "react";

// How far the year dropdown reaches when the field has no min/max of its own. Wide on both sides
// on purpose: these bounds exist only to give the dropdown a list to render, not to express a
// business rule, so they should never be the reason a real date can't be picked.
const YEARS_SELECTABLE_BACK = 30;
const YEARS_SELECTABLE_FORWARD = 30;

interface DateFieldProps {
  label: string;
  required?: boolean;
  value?: number;
  onChange: (value: number | undefined) => void;
  disabled?: boolean;
  error?: string;
  minDate?: Date;
  maxDate?: Date;
}

export function DateField({
  label,
  required = false,
  value,
  onChange,
  disabled,
  error,
  minDate,
  maxDate,
}: DateFieldProps) {
  const { t } = useTranslate();
  const [open, setOpen] = useState(false);
  const selectedDate = value ? new Date(value) : undefined;

  // A list of matchers rather than one object, so each bound is independent and optional —
  // an empty list simply disables nothing.
  const disabledMatcher = [...(minDate ? [{ before: minDate }] : []), ...(maxDate ? [{ after: maxDate }] : [])];

  // The month/year dropdowns need an explicit navigable range — without one the picker offers no
  // year list at all, leaving month-by-month arrow clicking as the only way to reach a distant
  // date. Bounded by the field's own min/max where it has them, otherwise a window wide enough
  // for project and plan dates.
  const currentYear = new Date().getFullYear();
  const startMonth = minDate ?? new Date(currentYear - YEARS_SELECTABLE_BACK, 0, 1);
  const endMonth = maxDate ?? new Date(currentYear + YEARS_SELECTABLE_FORWARD, 11, 31);

  return (
    <div className="min-w-0 space-y-1.5">
      <label className="text-sm font-medium text-foreground">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full justify-start gap-2 text-left font-normal",
              !selectedDate && "text-muted-foreground",
              error && "border-destructive",
            )}
          >
            <CalendarIcon className="size-4" />
            {selectedDate ? format(selectedDate, "dd MMM yyyy") : translateOr(t, "ES_PM_SELECT_DATE", "Select date")}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              onChange(date?.getTime());
              // Close as soon as a date is picked — a single-date field has
              // nothing left to do once a day is chosen.
              setOpen(false);
            }}
            disabled={disabledMatcher}
            captionLayout="dropdown"
            startMonth={startMonth}
            endMonth={endMonth}
            defaultMonth={selectedDate ?? minDate}
            autoFocus
          />
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
