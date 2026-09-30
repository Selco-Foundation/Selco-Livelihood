import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockNavigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
  Link: ({
    to,
    children,
    onClick,
    ...rest
  }: {
    to: string;
    children: React.ReactNode;
    onClick?: (event: React.MouseEvent) => void;
  }) => (
    <a href={to} onClick={onClick} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("../../hooks/use-installation-plans", () => ({ useInstallationPlans: vi.fn() }));

import { useAuthStore } from "@/shared";
import { useInstallationPlans } from "../../hooks/use-installation-plans";
import { InstallationPlanInbox } from "./InstallationPlanInbox";

const IR_USER = { roles: [{ code: "INSTALLATION_REPORT_APPROVER_QC_TEAM" }] };

const samplePlan = {
  planId: "plan-1",
  planName: "Plan Alpha",
  tenantId: "tenant-1",
  totalFacilities: 25,
  startDate: "01/01/2026",
  endDate: "01/02/2026",
  pendingReviewCount: 5,
  completionRate: 40,
};

beforeEach(() => {
  useAuthStore.setState({ user: IR_USER });
  mockNavigate.mockReset();
  mockNavigate.mockReturnValue(Promise.resolve());

  vi.mocked(useInstallationPlans).mockReturnValue({
    data: { plans: [samplePlan], totalCount: 1 },
    isLoading: false,
  } as never);
});

// TopBar renders LanguageSwitcher, which calls useLanguages -> useQuery, so
// every render needs a real QueryClient in context even though useInstallationPlans
// itself is mocked above.
function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <InstallationPlanInbox />
    </QueryClientProvider>,
  );
}

describe("InstallationPlanInbox", () => {
  it("renders nothing when the user lacks IR access", () => {
    useAuthStore.setState({ user: { roles: [{ code: "OTHER" }] } });
    const { container } = renderPage();
    expect(container).toBeEmptyDOMElement();
  });

  it("shows a loading skeleton and no pagination while plans are loading", () => {
    vi.mocked(useInstallationPlans).mockReturnValue({ data: undefined, isLoading: true } as never);
    renderPage();
    expect(document.querySelector('[data-slot="skeleton"]')).toBeInTheDocument();
    expect(screen.queryByText("Previous")).not.toBeInTheDocument();
  });

  it("renders the fetched plans in the table", () => {
    renderPage();
    expect(screen.getByText("Plan Alpha")).toBeInTheDocument();
  });

  it("typing a search resets pagination and passes the trimmed search text through to the query", async () => {
    const user = userEvent.setup();
    vi.mocked(useInstallationPlans).mockReturnValue({
      data: { plans: [samplePlan], totalCount: 25 },
      isLoading: false,
    } as never);
    renderPage();

    await user.click(screen.getByText("Next"));
    await waitFor(() => {
      const lastCall = vi.mocked(useInstallationPlans).mock.calls.at(-1)!;
      expect(lastCall[0]).toMatchObject({ pageOffset: 10 });
    });

    await user.type(screen.getByLabelText("Search Installation Plan"), "solar");

    await waitFor(
      () => {
        const lastCall = vi.mocked(useInstallationPlans).mock.calls.at(-1)!;
        expect(lastCall[0]).toMatchObject({ searchText: "solar", pageOffset: 0 });
      },
      { timeout: 2000 },
    );
  });
});
