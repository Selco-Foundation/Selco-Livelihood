import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/shared";
import { toast } from "@/ui";
import { buildDummyAmcReports } from "../../constants/dummy-amc-reports";
import { useAmcReport } from "../../hooks/use-amc-report";
import { useApproveAmcReport, useSendAmcReportForRework } from "../../hooks/use-amc-review-actions";
import { AmcReportDetailPage } from "./AmcReportDetailPage";

vi.mock("@tanstack/react-router", () => ({
  useParams: () => ({ reportId: "amc-report-1" }),
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/ui")>();
  return { ...actual, toast: { success: vi.fn(), error: vi.fn() } };
});

vi.mock("../../hooks/use-amc-report", () => ({ useAmcReport: vi.fn() }));
vi.mock("../../hooks/use-amc-review-actions", () => ({
  useApproveAmcReport: vi.fn(),
  useSendAmcReportForRework: vi.fn(),
}));

const reports = buildDummyAmcReports(Date.now());
const pendingReport = reports.find((report) => report.id === "amc-report-1")!;
const autoApprovedReport = reports.find((report) => report.approvedBy === "SYSTEM")!;

const approveMutate = vi.fn();
const reworkMutate = vi.fn();

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AmcReportDetailPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  useAuthStore.setState({ accessToken: "token-1", user: { uuid: "u1", roles: [{ code: "AMC_REVIEWER" }] } });
  approveMutate.mockReset();
  reworkMutate.mockReset();
  vi.mocked(useAmcReport).mockReturnValue({ data: pendingReport, isLoading: false } as never);
  vi.mocked(useApproveAmcReport).mockReturnValue({ mutate: approveMutate, isPending: false } as never);
  vi.mocked(useSendAmcReportForRework).mockReturnValue({ mutate: reworkMutate, isPending: false } as never);
});

afterEach(() => {
  useAuthStore.setState({ accessToken: null, user: null });
});

describe("AmcReportDetailPage", () => {
  it("shows the failed reading with its accepted range", () => {
    renderPage();

    expect(screen.getByText("Why this report was not auto-approved")).toBeInTheDocument();
    const failedRow = screen.getByText("Neutral to earth voltage at PCU output:").closest("li");
    expect(failedRow).toHaveTextContent("9 V");
    expect(failedRow).toHaveTextContent("Accepted range: Less than 7 V");
  });

  it("shows the system status answers and the form sections", () => {
    renderPage();

    expect(screen.getByText("Is the system functional?")).toBeInTheDocument();
    expect(screen.getByText("Capture Readings")).toBeInTheDocument();
  });

  it("approves only after the confirmation, then shows a toast", async () => {
    const user = userEvent.setup();
    approveMutate.mockImplementation((_id, options: { onSuccess: () => void }) => options.onSuccess());
    renderPage();

    await user.click(screen.getByRole("button", { name: "Approve" }));
    expect(approveMutate).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    expect(approveMutate).toHaveBeenCalledWith("amc-report-1", expect.any(Object));
    expect(toast.success).toHaveBeenCalledWith("AMC report approved");
  });

  it("sends for rework with the reason entered in the dialog", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Send for Rework" }));
    await user.type(screen.getByLabelText(/Reason/), "Retake the photo");
    await user.click(screen.getAllByRole("button", { name: "Send for Rework" }).at(-1)!);

    expect(reworkMutate).toHaveBeenCalledWith({ reportId: "amc-report-1", reason: "Retake the photo" }, expect.any(Object));
  });

  it("is view-only for an auto-approved report", () => {
    vi.mocked(useAmcReport).mockReturnValue({ data: autoApprovedReport, isLoading: false } as never);
    renderPage();

    expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
    expect(screen.queryByText("Why this report was not auto-approved")).not.toBeInTheDocument();
  });

  it("renders nothing for a user without the AMC reviewer role", () => {
    useAuthStore.setState({ user: { uuid: "u2", roles: [{ code: "PROJECT_MANAGER" }] } });

    const { container } = renderPage();

    expect(container).toBeEmptyDOMElement();
  });
});
