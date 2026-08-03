/**
 * Unit tests for the UI state store (Zustand).
 *
 * Covers: useUiStore state (sidebarOpen) and methods (setSidebarOpen, toggleSidebar).
 * Testing approach: Direct store state access and mutation via getState().method(...).
 * No provider wrapper needed as this is a direct Zustand store access.
 */
import { describe, expect, it } from "vitest";
import { useUiStore } from "./ui-store";

/**
 * useUiStore: Zustand store for UI state. Initially sidebarOpen is true.
 * Provides setSidebarOpen (explicit set) and toggleSidebar (flip) methods.
 */
describe("useUiStore", () => {
  it("starts with the sidebar open", () => {
    expect(useUiStore.getState().sidebarOpen).toBe(true);
  });

  /**
   * setSidebarOpen: Sets the sidebar open/closed state explicitly.
   * Inputs: open (boolean).
   */
  it("setSidebarOpen sets the value explicitly", () => {
    useUiStore.getState().setSidebarOpen(false);
    expect(useUiStore.getState().sidebarOpen).toBe(false);
  });

  /**
   * toggleSidebar: Flips the sidebar open/closed state.
   * No inputs required.
   */
  it("toggleSidebar flips the current value", () => {
    useUiStore.setState({ sidebarOpen: true });
    useUiStore.getState().toggleSidebar();
    expect(useUiStore.getState().sidebarOpen).toBe(false);
    useUiStore.getState().toggleSidebar();
    expect(useUiStore.getState().sidebarOpen).toBe(true);
  });
});
