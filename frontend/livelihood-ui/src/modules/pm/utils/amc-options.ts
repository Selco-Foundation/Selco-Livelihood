export interface AmcFrequencyOption {
  months: number;
  labelKey: string;
  fallback: string;
}

export interface AmcYearsOption {
  years: number;
  labelKey: string;
  fallback: string;
}

interface MdmsRow {
  active?: boolean;
  labelKey?: string;
}

const plural = (count: number, unit: string) => `${count} ${unit}${count === 1 ? "" : "s"}`;

/** "1 month", "6 months", "1 year", "18 months": the English label when no translation exists. */
function monthsLabel(months: number): string {
  return months % 12 === 0 ? plural(months / 12, "year") : plural(months, "month");
}

/** Active `AMC.Frequency` rows, shortest first. */
export function toAmcFrequencyOptions(masters: Record<string, unknown[]>): AmcFrequencyOption[] {
  return ((masters.Frequency ?? []) as (MdmsRow & { months?: number })[])
    .filter((row) => row.active !== false && Number.isInteger(row.months) && (row.months as number) > 0)
    .map((row) => ({
      months: row.months as number,
      labelKey: row.labelKey ?? `AMC_FREQUENCY_${row.months}`,
      fallback: monthsLabel(row.months as number),
    }))
    .sort((a, b) => a.months - b.months);
}

/** Active `AMC.Duration` rows, shortest first. */
export function toAmcYearsOptions(masters: Record<string, unknown[]>): AmcYearsOption[] {
  return ((masters.Duration ?? []) as (MdmsRow & { years?: number })[])
    .filter((row) => row.active !== false && Number.isInteger(row.years) && (row.years as number) > 0)
    .map((row) => ({
      years: row.years as number,
      labelKey: row.labelKey ?? `AMC_DURATION_${row.years}`,
      fallback: plural(row.years as number, "year"),
    }))
    .sort((a, b) => a.years - b.years);
}
