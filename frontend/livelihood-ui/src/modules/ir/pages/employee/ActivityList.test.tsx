import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReviewActivity } from "../../types/activity-review";

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

vi.mock("@/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared")>();
  return { ...actual, useBoundary: vi.fn() };
});

vi.mock("@/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/ui")>();
  return { ...actual, toast: { success: vi.fn(), warning: vi.fn(), error: vi.fn() } };
});

vi.mock("../../hooks/use-activities", () => ({
  useActivities: vi.fn(),
  useBulkApproveActivities: vi.fn(),
}));
vi.mock("../../hooks/use-activity-status-options", () => ({ useActivityStatusOptions: vi.fn() }));
vi.mock("../../hooks/use-installation-type-options", () => ({ useInstallationTypeOptions: vi.fn() }));
vi.mock("../../hooks/use-installation-plans", () => ({ useInstallationPlans: vi.fn() }));

import { useBoundary, useAuthStore } from "@/shared";
import { toast } from "@/ui";
import { useActivities, useBulkApproveActivities } from "../../hooks/use-activities";
import { useActivityStatusOptions } from "../../hooks/use-activity-status-options";
import { useInstallationTypeOptions } from "../../hooks/use-installation-type-options";
import { useInstallationPlans } from "../../hooks/use-installation-plans";
import { ActivityList } from "./ActivityList";

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
  stateCodes: ["ST1"],
  districtCodes: ["D1"],
  blockCodes: ["B1"],
};

function makeActivity(overrides: Partial<ReviewActivity> = {}): ReviewActivity {
  return {
    activityId: "a1",
    facilityId: "f1",
    facilityName: "Facility One",
    componentType: "SOLAR",
    planId: "plan-1",
    status: "SUBMITTED_BY_FIELD_STAFF",
    ...overrides,
  };
}

let bulkApproveMutate = vi.fn();

beforeEach(() => {
  window.history.pushState({}, "", "/employee/installation-plans/plan-1/activities");
  useAuthStore.setState({ user: IR_USER });
  mockNavigate.mockReset();
  mockNavigate.mockReturnValue(Promise.resolve());

  vi.mocked(useInstallationPlans).mockReturnValue({
    data: { plans: [samplePlan], totalCount: 1 },
    isLoading: false,
  } as never);
  vi.mocked(useBoundary).mockReturnValue({
    data: { blocks: [], facilities: [], districts: [] },
    isLoading: false,
  } as never);
  vi.mocked(useActivityStatusOptions).mockReturnValue({
    options: [{ code: "REJECTED_BY_QC_SPOC", name: "Rejected" }],
  } as never);
  vi.mocked(useInstallationTypeOptions).mockReturnValue({ options: [] } as never);
  vi.mocked(useActivities).mockReturnValue({
    data: { activities: [makeActivity()], totalCount: 1 },
    isLoading: false,
  } as never);
  bulkApproveMutate = vi.fn();
  vi.mocked(useBulkApproveActivities).mockReturnValue({
    mutate: bulkApproveMutate,
    isPending: false,
  } as never);
});

// TopBar renders LanguageSwitcher, which calls useLanguages -> useQuery, so
// every render needs a real QueryClient in context even though every ir hook
// used directly by this page is itself mocked above.
function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ActivityList />
    </QueryClientProvider>,
  );
}

function selectFirstRow(user: ReturnType<typeof userEvent.setup>) {
  return user.click(screen.getAllByRole("checkbox")[1]);
}

async function openAndConfirmBulkApprove(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /Approve Selected/ }));
  await user.click(screen.getByRole("button", { name: "Confirm" }));
}

describe("ActivityList", () => {
  it("renders nothing when the user lacks IR access", () => {
    useAuthStore.setState({ user: { roles: [{ code: "OTHER" }] } });
    const { container } = renderPage();
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the plan summary and the fetched activities", () => {
    renderPage();
    expect(screen.getByText("Plan Alpha")).toBeInTheDocument();
    expect(screen.getByText("01/01/2026")).toBeInTheDocument();
    expect(screen.getByText("01/02/2026")).toBeInTheDocument();
    expect(screen.getByText("25")).toBeInTheDocument();
    expect(screen.getByText("Facility One")).toBeInTheDocument();
  });

  describe("filters", () => {
    it("changing a filter clears the selection, resets to the first page, and requeries with the new criteria", async () => {
      const user = userEvent.setup();
      vi.mocked(useActivities).mockReturnValue({
        data: {
          activities: [makeActivity({ activityId: "a1" }), makeActivity({ activityId: "a2" })],
          totalCount: 25,
        },
        isLoading: false,
      } as never);

      renderPage();

      await user.click(screen.getByText("Next"));
      await waitFor(() => {
        const lastCall = vi.mocked(useActivities).mock.calls.at(-1)!;
        expect(lastCall[1]).toMatchObject({ pageOffset: 10 });
      });

      await user.click(screen.getAllByRole("checkbox")[1]);
      expect(screen.getByText("Approve Selected (1)")).toBeInTheDocument();

      await user.click(screen.getByText("Filters"));
      await user.click(screen.getByRole("button", { name: "Status" }));
      await user.click(screen.getByText("Rejected"));

      await waitFor(() => {
        const lastCall = vi.mocked(useActivities).mock.calls.at(-1)!;
        expect(lastCall[1]).toMatchObject({
          statuses: ["REJECTED_BY_QC_SPOC"],
          pageOffset: 0,
        });
      });
      expect(screen.getByText("Approve Selected")).toBeInTheDocument();
    });
  });

  describe("bulk approve", () => {
    it("keeps bulk approve gated behind the confirm dialog until confirmed", async () => {
      const user = userEvent.setup();
      renderPage();

      await selectFirstRow(user);
      await user.click(screen.getByRole("button", { name: /Approve Selected/ }));

      expect(screen.getByText("Approve selected activities?")).toBeInTheDocument();
      expect(bulkApproveMutate).not.toHaveBeenCalled();

      await user.click(screen.getByRole("button", { name: "Cancel" }));

      expect(screen.queryByText("Approve selected activities?")).not.toBeInTheDocument();
      expect(bulkApproveMutate).not.toHaveBeenCalled();
    });

    it("shows a success toast, closes the dialog, and clears the selection when every activity approves", async () => {
      const user = userEvent.setup();
      bulkApproveMutate.mockImplementation((_vars, opts) => {
        opts.onSuccess({ status: 200, data: {} });
      });
      renderPage();

      await selectFirstRow(user);
      await openAndConfirmBulkApprove(user);

      expect(bulkApproveMutate).toHaveBeenCalledWith({ activityIds: ["a1"] }, expect.anything());
      expect(toast.success).toHaveBeenCalledWith("Activities approved");
      expect(screen.queryByText("Approve selected activities?")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Approve Selected" })).toBeInTheDocument();
      expect(screen.getAllByRole("checkbox")[1]).not.toBeChecked();
    });

    it("shows a partial-failure warning naming the failed count when some activities fail", async () => {
      const user = userEvent.setup();
      bulkApproveMutate.mockImplementation((_vars, opts) => {
        opts.onSuccess({ status: 207, data: { failedProjectIDs: ["a2", "a3"] } });
      });
      renderPage();

      await selectFirstRow(user);
      await openAndConfirmBulkApprove(user);

      expect(toast.warning).toHaveBeenCalledWith("Approved, but 2 activities could not be approved.");
      expect(screen.queryByText("Approve selected activities?")).not.toBeInTheDocument();
    });

    it("shows an error toast, naming the server's message, when the bulk approve request fails outright", async () => {
      const user = userEvent.setup();
      bulkApproveMutate.mockImplementation((_vars, opts) => {
        opts.onError({ response: { data: { Errors: [{ message: "Network down" }] } } });
      });
      renderPage();

      await selectFirstRow(user);
      await openAndConfirmBulkApprove(user);

      expect(toast.error).toHaveBeenCalledWith("Failed to approve activities", {
        description: "Network down",
      });
      // The selection itself is untouched on error (only onSuccess clears
      // it) — still reflected in the count once the dialog (closed by
      // Radix's own AlertDialogAction click-to-dismiss behavior) is gone.
      expect(screen.getByText("Approve Selected (1)")).toBeInTheDocument();
    });
  });
});
