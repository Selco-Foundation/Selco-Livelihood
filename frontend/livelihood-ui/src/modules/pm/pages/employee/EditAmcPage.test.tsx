import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "@/ui";
import { useAmcSchedules } from "../../hooks/use-amc-schedules";
import { useInstallationPlanById } from "../../hooks/use-installation-plan-by-id";
import { useProjectById } from "../../hooks/use-project-by-id";
import { useTurnOffAmc } from "../../hooks/use-turn-off-amc";
import { useUpdateAmcSchedules } from "../../hooks/use-update-amc-schedules";
import type { RawAmcConfiguration } from "../../types/amc";
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
vi.mock("../../hooks/use-amc-options", () => ({
  useAmcOptions: () => ({
    frequencyOptions: [
      { months: 1, labelKey: "AMC_FREQUENCY_ONE_MONTH", fallback: "1 month" },
      { months: 6, labelKey: "AMC_FREQUENCY_SIX_MONTHS", fallback: "6 months" },
      { months: 12, labelKey: "AMC_FREQUENCY_ONE_YEAR", fallback: "1 year" },
    ],
    yearsOptions: [
      { years: 1, labelKey: "AMC_DURATION_ONE_YEAR", fallback: "1 year" },
      { years: 2, labelKey: "AMC_DURATION_TWO_YEARS", fallback: "2 years" },
      { years: 3, labelKey: "AMC_DURATION_THREE_YEARS", fallback: "3 years" },
    ],
  }),
}));
vi.mock("../../hooks/use-amc-schedules", () => ({ useAmcSchedules: vi.fn() }));
vi.mock("../../hooks/use-update-amc-schedules", () => ({ useUpdateAmcSchedules: vi.fn() }));
vi.mock("../../hooks/use-amc-visits", () => ({ useAmcVisits: () => ({ data: [], isLoading: false, isError: false }) }));
vi.mock("../../hooks/use-turn-off-amc", () => ({ useTurnOffAmc: vi.fn() }));

const turnOff = vi.fn();

function schedule(overrides: Partial<RawAmcConfiguration>): RawAmcConfiguration {
  return {
    id: "amc-1",
    status: "ACTIVE",
    activityFacilityId: "row-1",
    endUserName: "user979",
    endUserPhone: "9876543210",
    state: "Assam",
    district: "Kamrup",
    block: "Rangia",
    installationApprovedDate: Date.UTC(2026, 10, 6),
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
  vi.mocked(toast.error).mockReset();
  vi.mocked(useProjectById).mockReturnValue({ data: { id: "project-1", name: "JUS-12345-26-26" } } as never);
  vi.mocked(useInstallationPlanById).mockReturnValue({ data: { id: "plan-1", name: "IN-INS-2026-28" } } as never);
  vi.mocked(useAmcSchedules).mockReturnValue({ data: { configurations: [schedule({})], visits: [] }, isLoading: false } as never);
  vi.mocked(useUpdateAmcSchedules).mockReturnValue({ mutate, isPending: false } as never);
  turnOff.mockReset();
  vi.mocked(useTurnOffAmc).mockReturnValue({ mutate: turnOff, isPending: false } as never);
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
        visits: [],
        configurations: [
          schedule({}),
          schedule({ id: "amc-2", activityFacilityId: "row-2", endUserName: "user980", endUserPhone: "9845012876", configurationStartDate: null }),
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

  it("saves the edited rows, shows a toast and stays on the page", async () => {
    mutate.mockImplementation((_variables, options: { onSuccess: () => void }) => options.onSuccess());
    renderPage();

    const user = await changeFrequencyToOneYear();
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(mutate).toHaveBeenCalledWith(
      {
        original: [expect.objectContaining({ id: "amc-1", frequencyMonths: 6 })],
        rows: [expect.objectContaining({ id: "amc-1", frequencyMonths: 12 })],
      },
      expect.any(Object),
    );
    expect(toast.success).toHaveBeenCalledWith("AMC schedule saved", { description: undefined });
    expect(navigate).not.toHaveBeenCalled();
  });

  it("lets a not-yet-installed site keep a blank start date, shown as Pending activation", async () => {
    vi.mocked(useAmcSchedules).mockReturnValue({
      data: {
        visits: [],
        configurations: [
          schedule({}),
          schedule({
            id: "amc-2",
            activityFacilityId: "row-2",
            status: "PENDING_ACTIVATION",
            endUserName: "user980",
            endUserPhone: "9845012876",
            installationApprovedDate: null,
            configurationStartDate: null,
          }),
        ],
      },
      isLoading: false,
    } as never);
    renderPage();

    expect(screen.getByText("Not installed yet")).toBeInTheDocument();
    // Once as the AMC status, once in place of the first due date.
    expect(screen.getAllByText("Pending activation")).toHaveLength(2);
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

  it("shows each AMC's vendor, and says what a field staff change did to the visits", async () => {
    vi.mocked(useAmcSchedules).mockReturnValue({
      data: { configurations: [schedule({ vendorName: "Bright Future" })], visits: [] },
      isLoading: false,
    } as never);
    mutate.mockImplementation((_variables, options: { onSuccess: (results: unknown) => void }) =>
      options.onSuccess([{ activityFacilityId: "row-1", outcome: "CHANGED", visitsMoved: 1, visitsReset: 0 }]),
    );
    renderPage();
    expect(screen.getByText("Bright Future")).toBeInTheDocument();

    const user = await changeFrequencyToOneYear();
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(toast.success).toHaveBeenCalledWith("AMC schedule saved", {
      description: "Visits moved to the new field staff: 1",
    });
  });

  it("names the end user when the save is refused", async () => {
    mutate.mockImplementation((_variables, options: { onError: (error: unknown) => void }) =>
      options.onError({ response: { data: { Errors: [{ code: "AMC_START_DATE_LOCKED", message: "row 1 (amc-1), configurationStartDate: start date is locked" }] } } }),
    );
    renderPage();

    const user = await changeFrequencyToOneYear();
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(toast.error).toHaveBeenCalledWith(
      "Could not save the AMC schedule",
      { description: "user979: the start date can't change once visit 1 is submitted" },
    );
    expect(navigate).not.toHaveBeenCalled();
  });
  it("opens the visits of an AMC, with the saved schedule", async () => {
    renderPage();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "View visits, user979" }));
    expect(await screen.findByText("AMC visits of user979")).toBeInTheDocument();
  });

  it("turns an AMC off after the confirmation, then shows a toast", async () => {
    turnOff.mockImplementation((_id, options: { onSuccess: () => void }) => options.onSuccess());
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Turn off AMC, user979" }));
    expect(turnOff).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Turn off AMC" }));

    expect(turnOff).toHaveBeenCalledWith("amc-1", expect.any(Object));
    expect(toast.success).toHaveBeenCalledWith("AMC turned off");
  });

  it("locks the start date once a visit is submitted, and refuses fewer visits than that", async () => {
    vi.mocked(useAmcSchedules).mockReturnValue({
      data: {
        configurations: [schedule({})],
        visits: [
          { id: "v1", amcConfigurationId: "amc-1", firstSubmissionDate: 1 },
          { id: "v2", amcConfigurationId: "amc-1", firstSubmissionDate: 2 },
          { id: "v3", amcConfigurationId: "amc-1", firstSubmissionDate: 3 },
        ],
      },
      isLoading: false,
    } as never);
    renderPage();

    expect(screen.getByText("Locked: visit 1 is submitted")).toBeInTheDocument();
    const user = await changeFrequencyToOneYear();
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByText(/3 visits are already submitted/)).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });

  it("shows a completed AMC read-only, without Turn off", () => {
    vi.mocked(useAmcSchedules).mockReturnValue({
      data: { configurations: [schedule({ status: "COMPLETED" })], visits: [] },
      isLoading: false,
    } as never);
    renderPage();

    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "AMC frequency, user979" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Turn off AMC, user979" })).not.toBeInTheDocument();
  });
});
