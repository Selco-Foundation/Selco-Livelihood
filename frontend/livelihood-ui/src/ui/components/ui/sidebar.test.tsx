import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SidebarProvider, useSidebar } from "./sidebar";

function TestConsumer() {
  const { state } = useSidebar();
  return <span data-testid="sidebar-state">{state}</span>;
}

afterEach(() => {
  document.cookie = "sidebar_state=; path=/; max-age=0";
});

describe("SidebarProvider", () => {
  it("starts expanded by default", () => {
    render(
      <SidebarProvider>
        <TestConsumer />
      </SidebarProvider>,
    );
    expect(screen.getByTestId("sidebar-state")).toHaveTextContent("expanded");
  });

  it("respects a defaultOpen=false prop", () => {
    render(
      <SidebarProvider defaultOpen={false}>
        <TestConsumer />
      </SidebarProvider>,
    );
    expect(screen.getByTestId("sidebar-state")).toHaveTextContent("collapsed");
  });

  it("toggles state and persists it to a cookie on Cmd/Ctrl+B", async () => {
    const user = userEvent.setup();
    render(
      <SidebarProvider>
        <TestConsumer />
      </SidebarProvider>,
    );

    expect(screen.getByTestId("sidebar-state")).toHaveTextContent("expanded");

    await user.keyboard("{Control>}b{/Control}");

    expect(screen.getByTestId("sidebar-state")).toHaveTextContent("collapsed");
    expect(document.cookie).toContain("sidebar_state=false");
  });

  it("toggles back to expanded on a second shortcut press", async () => {
    const user = userEvent.setup();
    render(
      <SidebarProvider>
        <TestConsumer />
      </SidebarProvider>,
    );

    await user.keyboard("{Control>}b{/Control}");
    await user.keyboard("{Control>}b{/Control}");

    expect(screen.getByTestId("sidebar-state")).toHaveTextContent("expanded");
    expect(document.cookie).toContain("sidebar_state=true");
  });

  it("throws when useSidebar is used outside a SidebarProvider", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow(
      "useSidebar must be used within a SidebarProvider.",
    );
    consoleErrorSpy.mockRestore();
  });
});
