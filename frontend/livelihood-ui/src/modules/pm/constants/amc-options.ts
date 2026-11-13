// Hardcoded until the AMC frequency and duration MDMS masters exist (decision recorded in
// development/AMC_module/03-lld.md §3a). Replace with an MDMS-backed hook and delete this file then.

export const AMC_DEFAULT_FREQUENCY_MONTHS = 6;
export const AMC_DEFAULT_YEARS = 1;

export const AMC_FREQUENCY_OPTIONS = [
  { months: 6, labelKey: "ES_PM_AMC_FREQUENCY_6_MONTHS", fallback: "6 months" },
  { months: 12, labelKey: "ES_PM_AMC_FREQUENCY_1_YEAR", fallback: "1 year" },
] as const;

export const AMC_YEARS_OPTIONS = [
  { years: 1, labelKey: "ES_PM_AMC_YEARS_1", fallback: "1 year" },
  { years: 2, labelKey: "ES_PM_AMC_YEARS_2", fallback: "2 years" },
  { years: 3, labelKey: "ES_PM_AMC_YEARS_3", fallback: "3 years" },
] as const;
