import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/shared";
import { toast } from "@/ui";
import { useAmcProject } from "../../hooks/use-amc-projects";
import { useAmcRejectionReasons } from "../../hooks/use-amc-rejection-reasons";
import { useAmcFileUrls, useAmcReport } from "../../hooks/use-amc-report";
import { useApproveAmcReport, useSendAmcReportForRework } from "../../hooks/use-amc-review-actions";
import type { AmcReport } from "../../types/amc-report";
import { AmcReportDetailPage } from "./AmcReportDetailPage";

vi.mock("@tanstack/react-router", () => ({
  useParams: () => ({ reportId: "amc-report-1" }),
  useSearch: () => searchParams,
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

vi.mock("../../hooks/use-amc-report", () => ({ useAmcReport: vi.fn(), useAmcFileUrls: vi.fn() }));
vi.mock("../../hooks/use-amc-projects", () => ({ useAmcProject: vi.fn() }));
vi.mock("../../hooks/use-amc-rejection-reasons", () => ({ useAmcRejectionReasons: vi.fn() }));
vi.mock("../../hooks/use-amc-review-actions", () => ({
  useApproveAmcReport: vi.fn(),
  useSendAmcReportForRework: vi.fn(),
}));

const pendingReport: AmcReport = {
  id: "amc-report-1",
  projectId: "p1",
  endUserName: "name1",
  endUserPhone: "6753325754",
  state: "Karnataka",
  district: "Haveri",
  block: "Haveri",
  vendorName: "Bright Future Energy",
  fieldStaffName: "amcField",
  visitNumber: 2,
  totalVisits: 12,
  status: "PENDING_APPROVAL",
  sla: { daysRemaining: 6, breached: false },
  systemInUse: true,
  systemFunctional: false,
  ruleResults: [
    {
      code: "NE_VOLTAGE_PCU_OUTPUT",
      labelKey: "AMC_RULE_NE_VOLTAGE_PCU_OUTPUT",
      label: "Neutral to earth voltage at PCU output",
      reading: "9 V",
      acceptedRangeKey: "AMC_RULE_NE_VOLTAGE_PCU_OUTPUT_RANGE",
      acceptedRange: "less than 7 V",
      passed: false,
    },
  ],
  sections: [
    {
      code: "READINGS",
      titleKey: "ES_AMC_SECTION_READINGS",
      title: "Readings",
      fields: [{ labelKey: "ES_AMC_FIELD_X", label: "Inverter output voltage", value: "230 V" }],
    },
  ],
  photos: [{ documentType: "AMC_VERIFICATION_PHOTO", fileStoreId: "f1", titleKey: "ES_AMC_PHOTO_X", title: "Verification photo" }],
  history: [{ action: "REJECT", actor: "Rev", date: 1, reasons: [{ code: "OTHERS", comment: "Retake" }] }],
  reportPdfFileStoreId: "pdf1",
};
const autoApprovedReport: AmcReport = { ...pendingReport, status: "APPROVED", approvedBy: "SYSTEM", sla: undefined };

let searchParams: { projectId?: string } = {};
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
  searchParams = {};
  approveMutate.mockReset();
  reworkMutate.mockReset();
  vi.mocked(useAmcReport).mockReturnValue({ data: pendingReport, isLoading: false } as never);
  vi.mocked(useAmcProject).mockReturnValue({ data: { projectName: "JUS-12345-09-26-28" } } as never);
  vi.mocked(useAmcRejectionReasons).mockReturnValue({
    data: [
      { code: "UPLOADED_IMAGES_NOT_CLEAR", name: "Uploaded images are not clear" },
      { code: "OTHERS", name: "Others" },
    ],
  } as never);
  vi.mocked(useAmcFileUrls).mockReturnValue({ data: { f1: "https://files/f1.jpg", pdf1: "https://files/r.pdf" } } as never);
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
    expect(failedRow).toHaveTextContent("Accepted range: less than 7 V");
  });

  it("shows the system status, the answers, the photos, the PDF link, the project and the history", () => {
    renderPage();

    expect(screen.getByText("Is the system functional?")).toBeInTheDocument();
    expect(screen.getByText("Readings")).toBeInTheDocument();
    expect(screen.getByText("230 V")).toBeInTheDocument();
    expect(screen.getByText("Verification photo")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Download report PDF/ })).toHaveAttribute("href", "https://files/r.pdf");
    expect(screen.getByText("JUS-12345-09-26-28")).toBeInTheDocument();
    expect(screen.getByText("Others: Retake")).toBeInTheDocument();
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

  it("sends for rework with the reasons picked in the dialog", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Send for Rework" }));
    await user.click(screen.getByText("Uploaded images are not clear"));
    await user.click(screen.getAllByRole("button", { name: "Send for Rework" }).at(-1)!);

    expect(reworkMutate).toHaveBeenCalledWith(
      { reportId: "amc-report-1", reasons: [{ reason: "UPLOADED_IMAGES_NOT_CLEAR" }] },
      expect.any(Object),
    );
  });

  it("leads back to the project when opened from a project's list", () => {
    searchParams = { projectId: "p1" };
    renderPage();

    expect(screen.getByRole("link", { name: "AMC Projects" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "JUS-12345-09-26-28" })).toHaveAttribute(
      "href",
      expect.stringContaining("/employee/amc/projects/p1"),
    );
  });

  it("is view-only for an auto-approved report, without an SLA", () => {
    vi.mocked(useAmcReport).mockReturnValue({ data: autoApprovedReport, isLoading: false } as never);
    renderPage();

    expect(screen.queryByText("SLA days remaining")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
    expect(screen.queryByText("Why this report was not auto-approved")).not.toBeInTheDocument();
  });

  it("renders nothing for a user without the AMC reviewer role", () => {
    useAuthStore.setState({ user: { uuid: "u2", roles: [{ code: "PROJECT_MANAGER" }] } });

    const { container } = renderPage();

    expect(container).toBeEmptyDOMElement();
  });
});
