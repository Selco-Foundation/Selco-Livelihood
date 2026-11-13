import { format } from "date-fns";

/** Same "06 Nov 2026" format the PM module uses for project and plan dates. */
export function formatAmcDate(epochMs: number | undefined): string {
  return epochMs ? format(new Date(epochMs), "dd MMM yyyy") : "-";
}
