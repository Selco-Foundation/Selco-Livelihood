import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useInstallationPlansSearch } from "../../hooks/use-installation-plans-search";
import { useInstallationPlanFacilityCounts } from "../../hooks/use-installation-plan-facility-counts";
import { useProjectById } from "../../hooks/use-project-by-id";
import { ProjectDetailsPage } from "./ProjectDetailsPage";

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ProjectDetailsPage />
    </QueryClientProvider>,
  );
}

let mockSearchState: { projectId?: string } = { projectId: "project-1" };

vi.mock("@tanstack/react-router", () => ({
  useSearch: () => mockSearchState,
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("../../hooks/use-project-by-id", () => ({ useProjectById: vi.fn() }));
vi.mock("../../hooks/use-installation-plans-search", () => ({ useInstallationPlansSearch: vi.fn() }));
vi.mock("../../hooks/use-installation-plan-facility-counts", () => ({
  useInstallationPlanFacilityCounts: vi.fn(),
}));

beforeEach(() => {
  mockSearchState = { projectId: "project-1" };
  vi.mocked(useProjectById).mockReturnValue({
    data: {
      id: "project-1",
      tenantId: "tenant-1",
      name: "Project A",
      startDate: 1000,
      endDate: 2000,
      additionalDetails: {
        status: "SCHEDULED",
        geographyDetails: {
          states: [{ code: "KA", name: "Karnataka" }],
          districts: [{ code: "D1", stateCode: "KA" }],
          blocks: [{ code: "B1", districtCode: "D1", stateCode: "KA" }],
        },
      },
    },
  } as never);
  vi.mocked(useInstallationPlansSearch).mockReturnValue({ data: { plans: [], totalCount: 0 }, isLoading: false } as never);
  vi.mocked(useInstallationPlanFacilityCounts).mockReturnValue({ data: {} } as never);
});

describe("ProjectDetailsPage", () => {
  it("shows the project's name as the page title", () => {
    renderPage();

    expect(screen.getAllByText("Project A").length).toBeGreaterThan(0);
  });

  it("shows the resolved state names and district/block selected counts", () => {
    renderPage();

    expect(screen.getByText("Karnataka")).toBeInTheDocument();
  });

  it("shows the formatted project status", () => {
    renderPage();

    expect(screen.getByText("Scheduled")).toBeInTheDocument();
  });

  it("links Add New to the create-installation-plan path with the current projectId", () => {
    renderPage();

    expect(screen.getByRole("link", { name: /Add New/i })).toBeInTheDocument();
  });

  it("shows the installation plans table with an empty state when there are none", () => {
    renderPage();

    expect(screen.getByText("No installation plans yet")).toBeInTheDocument();
  });

  it("shows '-' as the title while the project hasn't loaded yet", () => {
    vi.mocked(useProjectById).mockReturnValue({ data: undefined } as never);

    renderPage();

    expect(screen.getAllByText("-").length).toBeGreaterThan(0);
  });
});
