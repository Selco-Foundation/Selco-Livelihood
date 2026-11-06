import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useIsMobile } from "./use-mobile";

describe("useIsMobile", () => {
  it("reflects whether the window width is under the mobile breakpoint", () => {
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(window.innerWidth < 768);
  });
});
