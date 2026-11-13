import { translateOr, useTranslate } from "@/shared";
import { Button, Calendar, cn, Popover, PopoverContent, PopoverTrigger } from "@/ui";
import { format } from "date-fns";
import { CalendarIcon, X } from "lucide-react";

export interface DateRangeValue {
  from?: number;
  to?: number;
}

interface DateRangeFieldProps {
  label: string;
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
}

function endOfDay(date: Date): number {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end.getTime();
}

export function DateRangeField({ label, value, onChange }: Readonly<DateRangeFieldProps>) {
  const { t } = useTranslate();
  const from = value.from ? new Date(value.from) : undefined;
  const to = value.to ? new Date(value.to) : undefined;
  const hasValue = Boolean(from || to);

  const text = from
    ? `${format(from, "dd MMM yyyy")} - ${to ? format(to, "dd MMM yyyy") : "…"}`
    : label;

  return (
    <div className="flex items-center gap-1">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            size="sm"
            variant="outline"
            aria-label={label}
            className={cn("justify-start gap-2 font-normal", !hasValue && "text-muted-foreground")}
          >
            <CalendarIcon className="size-4" />
            {text}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            mode="range"
            selected={{ from, to }}
            onSelect={(range) =>
              onChange({ from: range?.from?.getTime(), to: range?.to ? endOfDay(range.to) : undefined })
            }
            numberOfMonths={2}
            autoFocus
          />
        </PopoverContent>
      </Popover>
      {hasValue ? (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-8"
          aria-label={translateOr(t, "ES_AMC_CLEAR_DATE_RANGE", "Clear date range")}
          onClick={() => onChange({})}
        >
          <X className="size-4" />
        </Button>
      ) : null}
    </div>
  );
}
