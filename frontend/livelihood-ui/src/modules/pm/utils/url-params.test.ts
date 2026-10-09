import { describe, expect, it, vi } from "vitest";
import { fetchAllPages, BULK_PAGE_SIZE } from "./url-params";

describe("fetchAllPages", () => {
  it("stops as soon as a page comes back shorter than the page size", async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce(Array.from({ length: 3 }, (_, i) => i))
      .mockResolvedValueOnce([99]);

    const rows = await fetchAllPages(fetchPage, 3);

    expect(rows).toEqual([0, 1, 2, 99]);
    expect(fetchPage).toHaveBeenCalledTimes(2);
    expect(fetchPage).toHaveBeenNthCalledWith(1, 3, 0);
    expect(fetchPage).toHaveBeenNthCalledWith(2, 3, 3);
  });

  it("returns a single page's rows when it is already short of a full page", async () => {
    const fetchPage = vi.fn().mockResolvedValue([1, 2]);

    const rows = await fetchAllPages(fetchPage, 5);

    expect(rows).toEqual([1, 2]);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it("defaults the page size to BULK_PAGE_SIZE", async () => {
    const fetchPage = vi.fn().mockResolvedValue([]);

    await fetchAllPages(fetchPage);

    expect(fetchPage).toHaveBeenCalledWith(BULK_PAGE_SIZE, 0);
  });

  it("stops after MAX_PAGES even if every page is full (runaway guard)", async () => {
    const fetchPage = vi.fn().mockResolvedValue(Array.from({ length: 2 }, (_, i) => i));

    const rows = await fetchAllPages(fetchPage, 2);

    expect(fetchPage).toHaveBeenCalledTimes(200);
    expect(rows).toHaveLength(400);
  });
});
