/**
 * Unit tests for src/shared/query/query-client.ts
 *
 * The source module has no functions/components -- it constructs and exports a single
 * `queryClient` singleton (a `QueryClient` instance) with a fixed `defaultOptions.queries`
 * config: `staleTime: 30_000`, `retry: 1`, `refetchOnWindowFocus: false`. Because there is
 * no branching logic to exercise, these tests act as a regression guard against accidental
 * config drift: they assert the exact configured values via `queryClient.getDefaultOptions()`,
 * and additionally prove those values are not just present but actually *wired in* by using
 * the real client to run queries (no query-client mocking, since the client itself is the
 * thing under test) and observing the runtime behavior each option controls:
 *   - `retry: 1` -> a permanently-failing query fetches exactly twice (1 initial + 1 retry)
 *     before settling into the `error` status.
 *   - `staleTime: 30_000` -> data fetched once is still considered fresh (not stale) on an
 *     immediate second read, so a second `fetchQuery` call does not invoke the queryFn again.
 *   - `refetchOnWindowFocus: false` -> configured value is asserted directly; this option only
 *     affects mounted observers/window focus events, which aren't reproducible via fetchQuery.
 * No provider wrapper (QueryClientProvider) or React render is used -- the client's own
 * imperative API (`fetchQuery`, `getQueryData`, `getDefaultOptions`) is sufficient to drive
 * and observe its configured behavior without any DOM/render machinery.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { queryClient } from "./query-client";

// The queryClient module executes at import time, so a fresh import always yields the same
// singleton. Clearing the cache between tests keeps fetch-based assertions independent.
afterEach(() => {
  queryClient.clear();
});

// queryClient: the shared QueryClient instance used app-wide (e.g. wrapped in
// QueryClientProvider at the app root). Its behavior is entirely determined by the
// defaultOptions passed to its constructor in the source file.
describe("queryClient", () => {
  it("is a genuine QueryClient instance exposing the imperative cache API", () => {
    expect(queryClient).toBeDefined();
    expect(typeof queryClient.fetchQuery).toBe("function");
    expect(typeof queryClient.getQueryData).toBe("function");
    expect(typeof queryClient.getDefaultOptions).toBe("function");
  });

  it("is configured with staleTime: 30_000, retry: 1 and refetchOnWindowFocus: false for queries", () => {
    const defaults = queryClient.getDefaultOptions();
    expect(defaults.queries?.staleTime).toBe(30_000);
    expect(defaults.queries?.retry).toBe(1);
    expect(defaults.queries?.refetchOnWindowFocus).toBe(false);
  });

  // retry: 1 means react-query should attempt the queryFn a total of 2 times (1 initial
  // attempt + 1 retry) before giving up and surfacing an error, for a queryFn that always
  // rejects. This is the runtime effect the `retry` default option is meant to produce.
  it("retries a failing query exactly once before failing (retry: 1)", async () => {
    const queryFn = vi.fn().mockRejectedValue(new Error("boom"));

    await expect(
      queryClient.fetchQuery({
        queryKey: ["retry-test"],
        queryFn,
        retryDelay: 0,
      }),
    ).rejects.toThrow("boom");

    expect(queryFn).toHaveBeenCalledTimes(2);
  });

  // staleTime: 30_000 means data fetched once is considered "fresh" for 30 seconds, so a
  // second fetch for the same key within that window should be served from cache without
  // re-invoking the queryFn. This proves staleTime is actually applied, not just configured.
  it("treats freshly-fetched data as fresh for staleTime (30_000ms), skipping a refetch", async () => {
    const queryFn = vi.fn().mockResolvedValue("first-value");

    const first = await queryClient.fetchQuery({
      queryKey: ["stale-test"],
      queryFn,
    });
    expect(first).toBe("first-value");
    expect(queryFn).toHaveBeenCalledTimes(1);

    // Immediately re-fetching the same key: since data is still within staleTime, react-query
    // should return the cached value without calling queryFn again.
    const second = await queryClient.fetchQuery({
      queryKey: ["stale-test"],
      queryFn,
    });
    expect(second).toBe("first-value");
    expect(queryFn).toHaveBeenCalledTimes(1);
  });

  // Per-call options passed to fetchQuery/queries override the client's defaultOptions
  // (react-query merges call-site options over defaults), so a query explicitly configured
  // with retry: 0 should fail on the very first attempt regardless of the client's retry: 1
  // default -- this confirms the default is a default, not a hardcoded/forced behavior.
  it("allows per-query options to override the configured defaults", async () => {
    const queryFn = vi.fn().mockRejectedValue(new Error("no retry"));

    await expect(
      queryClient.fetchQuery({
        queryKey: ["override-test"],
        queryFn,
        retry: 0,
      }),
    ).rejects.toThrow("no retry");

    expect(queryFn).toHaveBeenCalledTimes(1);
  });
});
