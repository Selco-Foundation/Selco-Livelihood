import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "@/ui";
import { useAmcSchedules } from "../../hooks/use-amc-schedules";
import { useInstallationPlanById } from "../../hooks/use-installation-plan-by-id";
import { useProjectById } from "../../hooks/use-project-by-id";
import { useUpdateAmcSchedules } from "../../hooks/use-update-amc-schedules";
import type { RawAmcSchedule } from "../../types/amc";
import { EditAmcPage } from "./EditAmcPage";

const navigate = vi.fn();

const mockSearch = { projectId: "project-1", planId: "plan-1" };

vi.mock("@tanstack/react-router", () => ({
  useSearch: () => mockSearch,
  useNavigate: () => navigate,
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

vi.mock("../../hooks/use-project-by-id", () => ({ useProjectById: vi.fn() }));
vi.mock("../../hooks/use-installation-plan-by-id", () => ({ useInstallationPlanById: vi.fn() }));
vi.mock("../../hooks/use-amc-schedules", () => ({ useAmcSchedules: vi.fn() }));
vi.mock("../../hooks/use-update-amc-schedules", () => ({ useUpdateAmcSchedules: vi.fn() }));

function schedule(overrides: Partial<RawAmcSchedule>): RawAmcSchedule {
  return {
    id: "amc-1",
    fieldPlanId: "plan-1",
    facilityId: "site-1",
    endUser: { name: "user979", mobileNumber: "9876543210" },
    boundary: { state: "Assam", district: "Kamrup", block: "Rangia" },
    componentType: "SOLAR",
    installationReportFirstSubmissionDate: Date.UTC(2026, 10, 6),
    configurationStartDate: Date.UTC(2026, 10, 6),
    visitFrequencyMonths: 6,
    durationMonths: 24,
    ...overrides,
  };
}

const mutate = vi.fn();

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <EditAmcPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  navigate.mockReset();
  mutate.mockReset();
  vi.mocked(toast.success).mockReset();
  vi.mocked(useProjectById).mockReturnValue({ data: { id: "project-1", name: "JUS-12345-26-26" } } as never);
  vi.mocked(useInstallationPlanById).mockReturnValue({ data: { id: "plan-1", name: "IN-INS-2026-28" } } as never);
  vi.mocked(useAmcSchedules).mockReturnValue({ data: { AmcSchedules: [schedule({})] }, isLoading: false } as never);
  vi.mocked(useUpdateAmcSchedules).mockReturnValue({ mutate, isPending: false } as never);
});

async function changeFrequencyToOneYear(endUserName = "user979") {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: `AMC frequency, ${endUserName}` }));
  await user.click(screen.getByRole("button", { name: "1 year" }));
  return user;
}

describe("EditAmcPage", () => {
  it("shows the plan code, the info banner and the end users' read-only details", () => {
    renderPage();

    expect(screen.getByText("IN-INS-2026-28")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("The assigned vendor is changed from the Admin module.");
    expect(screen.getByText("user979")).toBeInTheDocument();
    expect(screen.getByText("9876543210")).toBeInTheDocument();
    expect(screen.getByText("Solar")).toBeInTheDocument();
  });

  it("keeps Save disabled until a value changes", async () => {
    renderPage();
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();

    await changeFrequencyToOneYear();

    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
  });

  it("saves nothing and names the row when a value is missing", async () => {
    vi.mocked(useAmcSchedules).mockReturnValue({
      data: {
        AmcSchedules: [
          schedule({}),
          schedule({ id: "amc-2", endUser: { name: "user980", mobileNumber: "9845012876" }, configurationStartDate: null }),
        ],
      },
      isLoading: false,
    } as never);
    renderPage();

    const user = await changeFrequencyToOneYear();
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByRole("alert")).toHaveTextContent("user980: AMC start date is required");
    expect(mutate).not.toHaveBeenCalled();
  });

  it("saves the edited rows, shows a toast and returns to the project", async () => {
    mutate.mockImplementation((_variables, options: { onSuccess: () => void }) => options.onSuccess());
    renderPage();

    const user = await changeFrequencyToOneYear();
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(mutate).toHaveBeenCalledWith(
      {
        original: [schedule({})],
        rows: [expect.objectContaining({ id: "amc-1", frequencyMonths: 12 })],
      },
      expect.any(Object),
    );
    expect(toast.success).toHaveBeenCalledWith("AMC schedule saved");
    expect(navigate).toHaveBeenCalledWith(expect.objectContaining({ search: { projectId: "project-1" } }));
  });

  it("lets a not-yet-installed site keep a blank start date, shown as Pending activation", async () => {
    vi.mocked(useAmcSchedules).mockReturnValue({
      data: {
        AmcSchedules: [
          schedule({}),
          schedule({
            id: "amc-2",
            endUser: { name: "user980", mobileNumber: "9845012876" },
            installationReportFirstSubmissionDate: null,
            configurationStartDate: null,
          }),
        ],
      },
      isLoading: false,
    } as never);
    renderPage();

    expect(screen.getByText("Not installed yet")).toBeInTheDocument();
    expect(screen.getByText("Pending activation")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "AMC start date, user980" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "AMC start date, user980" })).toHaveTextContent("After installation");
    expect(screen.getByRole("button", { name: "AMC start date, user979" })).toBeEnabled();

    const user = await changeFrequencyToOneYear();
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(mutate).toHaveBeenCalled();
  });

  it("recalculates the first AMC due date and total AMCs as values change", async () => {
    renderPage();
    expect(screen.getByText("06 May 2027")).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "4" })).toBeInTheDocument();

    await changeFrequencyToOneYear();

    expect(screen.getByText("06 Nov 2027")).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "2" })).toBeInTheDocument();
  });

  it("shows the plan code of a static demo plan", () => {
    vi.mocked(useInstallationPlanById).mockReturnValue({ data: null } as never);
    mockSearch.planId = "demo-amc-plan-partial";
    renderPage();

    expect(screen.getByText("IN-INS-2026-42")).toBeInTheDocument();
    mockSearch.planId = "plan-1";
  });
});
