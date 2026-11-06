import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/shared";

vi.mock("@/module-registry", () => ({ getModuleOverviews: vi.fn() }));

import { getModuleOverviews } from "@/module-registry";
import { HomePage } from "./HomePage";

function KpiStub() {
  return <div>KPI Widget</div>;
}

function DetailStub() {
  return <div>Detail Widget</div>;
}

function ActionStub() {
  return <button>Action Widget</button>;
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <HomePage />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  useAuthStore.setState({ user: null });
});

describe("HomePage", () => {
  it("renders a plain welcome title when there is no signed-in user", () => {
    useAuthStore.setState({ user: null });
    vi.mocked(getModuleOverviews).mockReturnValue({ kpis: [], details: [], actions: [] });

    renderPage();

    expect(screen.getByRole("heading", { name: "Welcome" })).toBeInTheDocument();
  });

  it("greets the user by first name only, trimming a full name down to it", () => {
    useAuthStore.setState({ user: { name: "  Jane Doe  " } });
    vi.mocked(getModuleOverviews).mockReturnValue({ kpis: [], details: [], actions: [] });

    renderPage();

    expect(screen.getByRole("heading", { name: "Welcome, Jane" })).toBeInTheDocument();
  });

  it("falls back to the username when the user has no display name", () => {
    useAuthStore.setState({ user: { userName: "jdoe" } });
    vi.mocked(getModuleOverviews).mockReturnValue({ kpis: [], details: [], actions: [] });

    renderPage();

    expect(screen.getByRole("heading", { name: "Welcome, jdoe" })).toBeInTheDocument();
  });

  it("does not render a KPI row when there are no kpis", () => {
    useAuthStore.setState({ user: null });
    vi.mocked(getModuleOverviews).mockReturnValue({ kpis: [], details: [], actions: [] });

    renderPage();

    expect(screen.queryByText("KPI Widget")).not.toBeInTheDocument();
  });

  it("renders every kpi/detail/action component supplied by the registered modules", () => {
    useAuthStore.setState({ user: null });
    vi.mocked(getModuleOverviews).mockReturnValue({
      kpis: [{ Component: KpiStub, moduleId: "m1" }],
      details: [{ Component: DetailStub, moduleId: "m1" }],
      actions: [{ Component: ActionStub, moduleId: "m1" }],
    });

    renderPage();

    expect(screen.getByText("KPI Widget")).toBeInTheDocument();
    expect(screen.getByText("Detail Widget")).toBeInTheDocument();
    // TopBar renders the actions slot twice (desktop row + mobile row, toggled
    // by CSS breakpoints that jsdom doesn't apply), so both copies render.
    expect(screen.getAllByText("Action Widget").length).toBeGreaterThan(0);
  });
});
