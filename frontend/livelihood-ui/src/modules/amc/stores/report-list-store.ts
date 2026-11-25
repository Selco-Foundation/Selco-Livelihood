import { create } from "zustand";
import { EMPTY_AMC_REPORT_FILTERS, type AmcReportFilterState } from "../components/AmcReportFilter";

export interface AmcReportListState {
  filters: AmcReportFilterState;
  searchText: string;
  currentPage: number;
  pageSize: number;
}

export const INITIAL_AMC_REPORT_LIST_STATE: AmcReportListState = {
  filters: EMPTY_AMC_REPORT_FILTERS,
  searchText: "",
  currentPage: 0,
  pageSize: 10,
};

interface AmcReportListStore {
  /** Keyed by list (all reports or one project) and tab; kept for the session only. */
  lists: Record<string, AmcReportListState>;
  update: (key: string, patch: Partial<AmcReportListState>) => void;
}

/**
 * Remembers each reports list's filters, search and page while the reviewer opens a report and
 * comes back, so the list is where they left it.
 */
export const useAmcReportListStore = create<AmcReportListStore>((set) => ({
  lists: {},
  update: (key, patch) =>
    set((state) => ({
      lists: { ...state.lists, [key]: { ...(state.lists[key] ?? INITIAL_AMC_REPORT_LIST_STATE), ...patch } },
    })),
}));

export function amcReportListKey(projectId: string | undefined, tab: string): string {
  return `${projectId ?? "all"}:${tab}`;
}
