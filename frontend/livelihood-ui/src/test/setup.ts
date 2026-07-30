import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup();
});

// jsdom doesn't implement matchMedia; src/ui/hooks/use-mobile.ts depends on it.
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// jsdom doesn't implement ResizeObserver; Radix's ScrollArea (used inside
// InboxFilter's popover/sheet content) reads it on mount.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = window.ResizeObserver ?? (ResizeObserverStub as unknown as typeof ResizeObserver);

// window.globalConfigs is injected at runtime in production (see vite-env.d.ts);
// stub a default so shared/config/global-config.ts doesn't crash on `?.` misses.
// Individual tests override via `window.globalConfigs = { getConfig: ... }`.
window.globalConfigs = {
  getConfig: () => undefined,
};
