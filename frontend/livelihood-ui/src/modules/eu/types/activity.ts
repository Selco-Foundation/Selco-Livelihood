export interface FacilityActivity {
  id: string;
  activityType?: string;
  /** "MACHINE" or "SOLAR" — same activityFacility.componentType the
   * installation reviewer's own activity table shows, resolved through the
   * same @/shared componentTypeLabel. */
  componentType?: string;
  projectCode?: string;
  fieldPlanCode?: string;
  activityStartDate?: string;
  activityEndDate?: string;
}

export interface ActivityFilters {
  activityCode: string[];
  // Index signature so this satisfies CategoryFilterPopover's generic
  // `Record<string, string[]>` selected-state prop without a cast.
  [key: string]: string[];
}

export const EMPTY_ACTIVITY_FILTERS: ActivityFilters = {
  activityCode: [],
};
