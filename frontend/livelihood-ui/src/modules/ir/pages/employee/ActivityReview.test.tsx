import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ActivityReviewDetail, AssetSectionContent, ReviewActivity } from "../../types/activity-review";
import { irActivitiesPath } from "../../utils/paths";

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
  return { ...actual, reloadModule: vi.fn().mockResolvedValue(undefined) };
});

vi.mock("@/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/ui")>();
  return { ...actual, toast: { success: vi.fn(), warning: vi.fn(), error: vi.fn() } };
});

vi.mock("../../hooks/use-activity-review", () => ({
  useActivityReview: vi.fn(),
  useLoadSectionMedia: vi.fn(),
  useSubmitActivityReview: vi.fn(),
}));
vi.mock("../../hooks/use-installation-plans", () => ({ useInstallationPlans: vi.fn() }));
vi.mock("../../hooks/use-rejection-reason-options", () => ({ useRejectionReasonOptions: vi.fn() }));

import { useAuthStore } from "@/shared";
import { toast } from "@/ui";
import {
  useActivityReview,
  useLoadSectionMedia,
  useSubmitActivityReview,
} from "../../hooks/use-activity-review";
import { useInstallationPlans } from "../../hooks/use-installation-plans";
import { useRejectionReasonOptions } from "../../hooks/use-rejection-reason-options";
import { ActivityReview } from "./ActivityReview";

const IR_USER = { roles: [{ code: "INSTALLATION_REPORT_APPROVER_QC_TEAM" }] };

const sampleActivity: ReviewActivity = {
  activityId: "activity-1",
  facilityId: "facility-1",
  facilityName: "Facility One",
  componentType: "SOLAR",
  planId: "plan-1",
  status: "SUBMITTED_BY_FIELD_STAFF",
};

const panelSection: AssetSectionContent = {
  kind: "ASSET",
  id: "PANEL",
  labelKey: "ES_IR_PANEL",
  label: "Panel",
  specifications: [],
  images: [],
  videos: [],
};

function makeDetail(overrides: Partial<ActivityReviewDetail> = {}): ActivityReviewDetail {
  return {
    activity: sampleActivity,
    sections: [panelSection],
    auditTrail: [],
    sectionDocuments: {},
    workflowDocuments: [{ documentType: "INSTALLATION_REPORT_BOM", fileStoreId: "fs-1" }],
    ...overrides,
  };
}

let submitMutate = vi.fn();

beforeEach(() => {
  // Radix Select (inside RejectionReasonDialog, opened from ReviewSections)
  // relies on pointer-capture and scroll APIs jsdom doesn't implement.
  Element.prototype.hasPointerCapture = Element.prototype.hasPointerCapture ?? (() => false);
  Element.prototype.setPointerCapture = Element.prototype.setPointerCapture ?? (() => {});
  Element.prototype.releasePointerCapture = Element.prototype.releasePointerCapture ?? (() => {});
  Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? (() => {});

  window.history.pushState(
    {},
    "",
    "/employee/installation-plans/plan-1/activities/activity-1/review",
  );
  useAuthStore.setState({ user: IR_USER });
  mockNavigate.mockReset();
  mockNavigate.mockReturnValue(Promise.resolve());

  vi.mocked(useActivityReview).mockReturnValue({ data: makeDetail(), isLoading: false } as never);
  vi.mocked(useLoadSectionMedia).mockReturnValue(vi.fn().mockResolvedValue({ images: [], videos: [] }));
  submitMutate = vi.fn();
  vi.mocked(useSubmitActivityReview).mockReturnValue({
    mutate: submitMutate,
    isPending: false,
  } as never);
  vi.mocked(useInstallationPlans).mockReturnValue({
    data: { plans: [], totalCount: 0 },
    isLoading: false,
  } as never);
  vi.mocked(useRejectionReasonOptions).mockReturnValue({
    data: [
      { code: "DAMAGED", name: "Damaged" },
      { code: "OTHER", name: "Other" },
    ],
  } as never);
});

// TopBar renders LanguageSwitcher, which calls useLanguages -> useQuery, so
// every render needs a real QueryClient in context even though every ir hook
// used directly by this page is itself mocked above.
function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ActivityReview />
    </QueryClientProvider>,
  );
}

describe("ActivityReview", () => {
  it("renders nothing when the user lacks IR access", () => {
    useAuthStore.setState({ user: { roles: [{ code: "OTHER" }] } });
    const { container } = renderPage();
    expect(container).toBeEmptyDOMElement();
  });

  it("shows a loading indicator while the review is loading", () => {
    vi.mocked(useActivityReview).mockReturnValue({ data: undefined, isLoading: true } as never);
    renderPage();
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("shows a not-found message when the activity could not be found", () => {
    vi.mocked(useActivityReview).mockReturnValue({ data: null, isLoading: false } as never);
    renderPage();
    expect(screen.getByText("This activity could not be found.")).toBeInTheDocument();
  });

  it("renders the activity info and review sections once loaded", () => {
    renderPage();
    expect(screen.getByRole("heading", { name: "Facility One" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Panel/ })).toBeInTheDocument();
  });

  it("hides the approve/reject action bar once the activity is no longer pending review", () => {
    vi.mocked(useActivityReview).mockReturnValue({
      data: makeDetail({ activity: { ...sampleActivity, status: "APPROVED_BY_QC_SPOC" } }),
      isLoading: false,
    } as never);
    renderPage();
    expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reject" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add rejection reason" })).not.toBeInTheDocument();
  });

  it("gates approve submission behind the confirm dialog", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Approve" }));
    expect(screen.getByText("Approve this report?")).toBeInTheDocument();
    expect(submitMutate).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByText("Approve this report?")).not.toBeInTheDocument();
    expect(submitMutate).not.toHaveBeenCalled();
  });

  it("submits an approve action once confirmed, then toasts success and navigates back to the activities list", async () => {
    const user = userEvent.setup();
    submitMutate.mockImplementation((_input, opts) => {
      opts.onSuccess();
    });
    renderPage();

    await user.click(screen.getByRole("button", { name: "Approve" }));
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    expect(submitMutate).toHaveBeenCalledWith(
      {
        activityId: "activity-1",
        action: "APPROVE",
        rejectionReasons: undefined,
        documents: [{ documentType: "INSTALLATION_REPORT_BOM", fileStoreId: "fs-1" }],
      },
      expect.anything(),
    );
    expect(toast.success).toHaveBeenCalledWith("Report approved");
    expect(mockNavigate).toHaveBeenCalledWith({ to: irActivitiesPath("plan-1") });
  });

  it("adds a rejection reason (enabling Reject over Approve) then submits a reject action with the accumulated reasons", async () => {
    const user = userEvent.setup();
    submitMutate.mockImplementation((_input, opts) => {
      opts.onSuccess();
    });
    renderPage();

    await user.click(screen.getByRole("button", { name: "Add rejection reason" }));
    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "Damaged" }));
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(screen.getByRole("button", { name: "Reject" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Approve" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Reject" }));
    expect(screen.getByText("Reject this report?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    expect(submitMutate).toHaveBeenCalledWith(
      {
        activityId: "activity-1",
        action: "REJECT",
        rejectionReasons: {
          PANEL: [expect.objectContaining({ reasonCode: "DAMAGED", reasonLabel: "Damaged", comment: "" })],
        },
        documents: [{ documentType: "INSTALLATION_REPORT_BOM", fileStoreId: "fs-1" }],
      },
      expect.anything(),
    );
    expect(toast.success).toHaveBeenCalledWith("Report rejected");
  });
});
