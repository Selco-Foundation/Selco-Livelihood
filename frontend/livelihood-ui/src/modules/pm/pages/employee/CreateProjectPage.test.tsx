import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useBoundaryTree } from "../../hooks/use-boundary-tree";
import { useSaveProject } from "../../hooks/use-create-project";
import { useFacilityIngestion } from "../../hooks/use-facility-ingestion";
import { useProjectById } from "../../hooks/use-project-by-id";
import { scheduleProject } from "../../services/project";
import { CreateProjectPage } from "./CreateProjectPage";

const mockNavigate = vi.fn();
let mockSearchState: { projectId?: string; step?: number } = {};

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
  useSearch: () => mockSearchState,
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("../../hooks/use-project-by-id", () => ({ useProjectById: vi.fn() }));
vi.mock("../../hooks/use-create-project", () => ({ useSaveProject: vi.fn() }));
vi.mock("../../hooks/use-boundary-tree", () => ({ useBoundaryTree: vi.fn() }));
vi.mock("../../hooks/use-facility-ingestion", () => ({ useFacilityIngestion: vi.fn() }));
vi.mock("../../services/project", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/project")>();
  return { ...actual, scheduleProject: vi.fn() };
});

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <CreateProjectPage />
    </QueryClientProvider>,
  );
}

function ingestionRoundTrip(overrides: Partial<ReturnType<typeof useFacilityIngestion>> = {}) {
  return {
    status: "idle",
    isBusy: false,
    errorCount: 0,
    errorMessage: undefined,
    errorIsGuidance: false,
    validatedFile: null,
    previewFile: null,
    previewHasErrors: false,
    downloadTemplate: vi.fn(),
    uploadAndValidate: vi.fn(),
    createFromValidated: vi.fn(),
    downloadPreview: vi.fn(),
    ...overrides,
  } as unknown as ReturnType<typeof useFacilityIngestion>;
}

beforeEach(() => {
  Element.prototype.hasPointerCapture = Element.prototype.hasPointerCapture ?? (() => false);
  Element.prototype.setPointerCapture = Element.prototype.setPointerCapture ?? (() => {});
  Element.prototype.releasePointerCapture = Element.prototype.releasePointerCapture ?? (() => {});
  Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? (() => {});
  mockSearchState = {};
  mockNavigate.mockReset();
  vi.mocked(useProjectById).mockReturnValue({ data: undefined } as never);
  vi.mocked(useBoundaryTree).mockReturnValue({ data: { states: [] } } as never);
  vi.mocked(useFacilityIngestion).mockReturnValue(ingestionRoundTrip());
  vi.mocked(useSaveProject).mockReturnValue({
    mutateAsync: vi.fn().mockResolvedValue({ id: "project-1", additionalDetails: {} }),
    isPending: false,
  } as never);
  vi.mocked(scheduleProject).mockReset();
});

describe("CreateProjectPage", () => {
  it("shows step 1 (Project Details) by default with Next disabled until valid", () => {
    renderPage();

    expect(screen.getByLabelText(/Justification Code/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });

  it("bounces back from step 3 to step 2 when there is no projectId yet", () => {
    mockSearchState = { step: 3 };
    renderPage();

    expect(mockNavigate).toHaveBeenCalledWith({ search: expect.any(Function), replace: true });
  });

  it("shows the Geography Details step content when step=2", () => {
    mockSearchState = { step: 2 };
    renderPage();

    expect(screen.getByRole("heading", { level: 2, name: "Geography Details" })).toBeInTheDocument();
  });

  const geographyHierarchy = {
    states: [{ code: "KA", name: "Karnataka" }],
    districts: [{ code: "D1", name: "D1", stateCode: "KA" }],
    blocks: [{ code: "B1", name: "B1", districtCode: "D1", stateCode: "KA" }],
  };

  async function selectFullGeography(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole("button", { name: /^State/i }));
    await user.click(within(screen.getByRole("dialog")).getByText("Karnataka"));
    await user.click(screen.getByRole("button", { name: /^District/i }));
    await user.click(within(screen.getByRole("dialog")).getByText("D1"));
    await user.click(screen.getByRole("button", { name: /^Block/i }));
    await user.click(within(screen.getByRole("dialog")).getByText("B1"));
  }

  it("persists geography and advances to step 3 on Next", async () => {
    const user = userEvent.setup();
    const mutateAsync = vi.fn().mockResolvedValue({ id: "project-1", additionalDetails: { geographyDetails: {} } });
    vi.mocked(useSaveProject).mockReturnValue({ mutateAsync, isPending: false } as never);
    vi.mocked(useBoundaryTree).mockReturnValue({ data: geographyHierarchy } as never);
    mockSearchState = { step: 2 };
    renderPage();

    await selectFullGeography(user);
    await user.click(screen.getByRole("button", { name: "Next" }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith({ search: expect.any(Function), replace: true }),
    );
  });

  it("shows a save-failed message when persisting geography fails", async () => {
    const user = userEvent.setup();
    const mutateAsync = vi.fn().mockRejectedValue(new Error("boom"));
    vi.mocked(useSaveProject).mockReturnValue({ mutateAsync, isPending: false } as never);
    vi.mocked(useBoundaryTree).mockReturnValue({ data: geographyHierarchy } as never);
    mockSearchState = { step: 2 };
    renderPage();

    await selectFullGeography(user);
    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(await screen.findByText("Couldn't save the project. Please try again.")).toBeInTheDocument();
  });

  it("locks the project details step's fields once editing an existing project", () => {
    mockSearchState = { projectId: "project-1", step: 1 };
    vi.mocked(useProjectById).mockReturnValue({
      data: {
        id: "project-1",
        tenantId: "tenant-1",
        additionalDetails: { justificationCode: "SLKA" },
        startDate: 1000,
        endDate: 2000,
      },
    } as never);
    renderPage();

    expect(screen.getByLabelText(/Justification Code/i)).toBeDisabled();
  });

  it("opens the confirm dialog on Submit, and shows the success card once scheduling succeeds", async () => {
    const user = userEvent.setup();
    mockSearchState = { projectId: "project-1", step: 3 };
    vi.mocked(useProjectById).mockReturnValue({
      data: { id: "project-1", tenantId: "tenant-1", name: "Project A", additionalDetails: {} },
    } as never);
    vi.mocked(useFacilityIngestion).mockReturnValue(ingestionRoundTrip({ status: "done" }));
    vi.mocked(scheduleProject).mockResolvedValue({ id: "project-1", tenantId: "tenant-1", name: "Project A" });
    renderPage();

    await user.click(screen.getByRole("button", { name: "Submit" }));
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Confirm & Submit" }));

    expect(await screen.findByText("Project Created!")).toBeInTheDocument();
    expect(screen.getByText("Project A")).toBeInTheDocument();
  });

  it("shows a submit-failed message in the dialog when scheduling fails", async () => {
    const user = userEvent.setup();
    mockSearchState = { projectId: "project-1", step: 3 };
    vi.mocked(useProjectById).mockReturnValue({
      data: { id: "project-1", tenantId: "tenant-1", name: "Project A", additionalDetails: {} },
    } as never);
    vi.mocked(useFacilityIngestion).mockReturnValue(ingestionRoundTrip({ status: "done" }));
    vi.mocked(scheduleProject).mockRejectedValue(new Error("boom"));
    renderPage();

    await user.click(screen.getByRole("button", { name: "Submit" }));
    await user.click(screen.getByRole("button", { name: "Confirm & Submit" }));

    expect(await screen.findByText("Failed to submit the project. Please try again.")).toBeInTheDocument();
  });
});
