export interface FacilityActivity {
  id: string;
  activityType?: string;
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
