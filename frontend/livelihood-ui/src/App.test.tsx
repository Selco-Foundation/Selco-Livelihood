import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { mockRouter } = vi.hoisted(() => ({ mockRouter: { __mockRouter: true } }));

vi.mock("./router", () => ({ createAppRouter: () => mockRouter }));

vi.mock("@tanstack/react-router", () => ({
  RouterProvider: ({ router }: { router: unknown }) => (
    <div data-testid="router-provider" data-is-mock-router={router === mockRouter} />
  ),
}));

vi.mock("@/shared", () => ({
  I18nProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="i18n-provider">{children}</div>
  ),
  QueryProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="query-provider">{children}</div>
  ),
}));

vi.mock("@/ui", () => ({
  Toaster: () => <div data-testid="toaster" />,
  TooltipProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-provider">{children}</div>
  ),
}));

import { App } from "./App";

describe("App", () => {
  it("renders without crashing, nesting the router and toaster inside the tooltip/i18n/query providers", () => {
    render(<App />);

    const tooltip = screen.getByTestId("tooltip-provider");
    const i18n = screen.getByTestId("i18n-provider");
    const query = screen.getByTestId("query-provider");
    expect(tooltip).toContainElement(i18n);
    expect(i18n).toContainElement(query);
    expect(query).toContainElement(screen.getByTestId("router-provider"));
    expect(query).toContainElement(screen.getByTestId("toaster"));
  });

  it("passes the router built by createAppRouter into RouterProvider", () => {
    render(<App />);

    expect(screen.getByTestId("router-provider")).toHaveAttribute("data-is-mock-router", "true");
  });
});
