import { afterEach, describe, expect, it } from "vitest";
import { useUiStore } from "./ui-store";

const initialState = useUiStore.getState();

afterEach(() => {
  useUiStore.setState(initialState, true);
});

describe("useUiStore", () => {
  it("defaults sidebarOpen to true", () => {
    expect(useUiStore.getState().sidebarOpen).toBe(true);
  });

  describe("setSidebarOpen", () => {
    it("sets sidebarOpen to the given value", () => {
      useUiStore.getState().setSidebarOpen(false);
      expect(useUiStore.getState().sidebarOpen).toBe(false);

      useUiStore.getState().setSidebarOpen(true);
      expect(useUiStore.getState().sidebarOpen).toBe(true);
    });
  });

  describe("toggleSidebar", () => {
    it("flips sidebarOpen from true to false and back", () => {
      useUiStore.getState().setSidebarOpen(true);

      useUiStore.getState().toggleSidebar();
      expect(useUiStore.getState().sidebarOpen).toBe(false);

      useUiStore.getState().toggleSidebar();
      expect(useUiStore.getState().sidebarOpen).toBe(true);
    });
  });
});
