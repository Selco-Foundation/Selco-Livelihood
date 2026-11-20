import { afterEach, describe, expect, it } from "vitest";
import { amcReportListKey, INITIAL_AMC_REPORT_LIST_STATE, useAmcReportListStore } from "./report-list-store";

afterEach(() => {
  useAmcReportListStore.setState({ lists: {} });
});

describe("useAmcReportListStore", () => {
  it("keeps each list's state apart and merges updates", () => {
    const all = amcReportListKey(undefined, "pending");
    const project = amcReportListKey("p1", "pending");

    useAmcReportListStore.getState().update(all, { searchText: "name1" });
    useAmcReportListStore.getState().update(all, { currentPage: 2 });

    expect(useAmcReportListStore.getState().lists[all]).toEqual({
      ...INITIAL_AMC_REPORT_LIST_STATE,
      searchText: "name1",
      currentPage: 2,
    });
    expect(useAmcReportListStore.getState().lists[project]).toBeUndefined();
    expect(project).toBe("p1:pending");
  });
});
