/**
 * Unit tests for the useIsMobile hook.
 *
 * Covers: useIsMobile() — detects if viewport width is below the mobile breakpoint (768px)
 * and updates on media query changes.
 * Testing approach: Mocks window.matchMedia and window.innerWidth; simulates viewport resizing
 * and media query listener callbacks. No provider wrapper needed as this is a custom hook
 * that only uses window APIs.
 */
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useIsMobile } from "./use-mobile";

function setViewportWidth(width: number) {
  Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: width });
}

function mockMatchMediaCapturingListener() {
  let changeListener: (() => void) | undefined;
  vi.spyOn(window, "matchMedia").mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: (_event: string, listener: () => void) => {
      changeListener = listener;
    },
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
  return () => changeListener?.();
}

afterEach(() => {
  vi.restoreAllMocks();
});

/**
 * useIsMobile: React hook that returns a boolean indicating if the current viewport width is below 768px.
 * Uses window.matchMedia to listen for media query changes and updates on viewport resize.
 * Returns boolean (coerced to false if undefined).
 */
describe("useIsMobile", () => {
  it("returns true when the viewport is under the mobile breakpoint", () => {
    mockMatchMediaCapturingListener();
    setViewportWidth(500);

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(true);
  });

  it("returns false when the viewport is at or above the mobile breakpoint", () => {
    mockMatchMediaCapturingListener();
    setViewportWidth(1024);

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);
  });

  it("updates when the media query change listener fires after a resize", () => {
    const triggerChange = mockMatchMediaCapturingListener();
    setViewportWidth(1024);

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    setViewportWidth(400);
    act(() => {
      triggerChange();
    });

    expect(result.current).toBe(true);
  });
});
