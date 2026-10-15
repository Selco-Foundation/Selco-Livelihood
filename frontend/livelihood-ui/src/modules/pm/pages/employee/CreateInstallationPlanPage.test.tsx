import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useInstallationPlanById } from "../../hooks/use-installation-plan-by-id";
import { useInstallationPlanReviewer } from "../../hooks/use-installation-plan-reviewer";
import { useInstallationPlanScope } from "../../hooks/use-installation-plan-scope";
import { useInstallationPlanTemplates } from "../../hooks/use-installation-plan-templates";
import { useProjectById } from "../../hooks/use-project-by-id";
import { useSaveInstallationPlan } from "../../hooks/use-save-installation-plan";
import { useVendorAssignmentSearch } from "../../hooks/use-vendor-assignment-search";
import { checkInstallationScope } from "../../services/installation-scope";
import { publishInstallationPlan } from "../../services/installation-plan";
import { validateVendorAssignment } from "../../services/vendor-assignment";
import { CreateInstallationPlanPage } from "./CreateInstallationPlanPage";
import type { PlanDetailsValue } from "../../components/steps/PlanDetailsStep";

const mockNavigate = vi.fn();
let mockSearchState: { projectId?: string; planId?: string; step?: number } = { projectId: "project-1" };

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
vi.mock("../../hooks/use-installation-plan-by-id", () => ({ useInstallationPlanById: vi.fn() }));
vi.mock("../../hooks/use-installation-plan-reviewer", () => ({ useInstallationPlanReviewer: vi.fn() }));
vi.mock("../../hooks/use-installation-plan-scope", () => ({ useInstallationPlanScope: vi.fn() }));
vi.mock("../../hooks/use-installation-plan-templates", () => ({ useInstallationPlanTemplates: vi.fn() }));
vi.mock("../../hooks/use-save-installation-plan", () => ({ useSaveInstallationPlan: vi.fn() }));
vi.mock("../../hooks/use-vendor-assignment-search", () => ({ useVendorAssignmentSearch: vi.fn() }));
vi.mock("../../services/installation-scope", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/installation-scope")>();
  return { ...actual, checkInstallationScope: vi.fn() };
});
vi.mock("../../services/installation-plan", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/installation-plan")>();
  return { ...actual, publishInstallationPlan: vi.fn() };
});
vi.mock("../../services/vendor-assignment", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/vendor-assignment")>();
  return { ...actual, validateVendorAssignment: vi.fn() };
});

// Step components are exercised in their own test files; here the page's own orchestration
// (step gating, hydration, save/publish flow) is what's under test, so each step is replaced
// with a minimal stub exposing its key props/callbacks.
vi.mock("../../components/steps/PlanDetailsStep", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../components/steps/PlanDetailsStep")>();
  return {
    ...actual,
    PlanDetailsStep: ({ value, onChange }: { value: PlanDetailsValue; onChange: (v: PlanDetailsValue) => void }) => (
      <div>
        <span>Plan Details Step</span>
        <button
          type="button"
          onClick={() =>
            onChange({ ...value, geographyDetails: { states: [{ code: "KA" }], blocks: [{ code: "B1", districtCode: "D1", stateCode: "KA" }] }, sectorCodes: ["SOLAR"], reviewerCode: "rev-1", startDate: 1000, endDate: 2000 })
          }
        >
          Fill Plan Details
        </button>
      </div>
    ),
  };
});
vi.mock("../../components/steps/InstallationScopeStep", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../components/steps/InstallationScopeStep")>();
  return {
    ...actual,
    InstallationScopeStep: ({ onScopeApplied }: { onScopeApplied?: (v: unknown) => void }) => (
      <div>
        <span>Installation Scope Step</span>
        <button
          type="button"
          onClick={() => onScopeApplied?.([{ siteId: "f1", included: true, solutionCode: "SOLAR" }])}
        >
          Apply Scope
        </button>
      </div>
    ),
  };
});
vi.mock("../../components/steps/TemplateStep", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../components/steps/TemplateStep")>();
  return {
    ...actual,
    TemplateStep: ({ onChange }: { onChange: (updater: (prev: unknown[]) => unknown[]) => void }) => (
      <div>
        <span>Template Step</span>
        <button type="button" onClick={() => onChange(() => [{ solutionCode: "SOLAR", uploaded: true }])}>
          Upload Template
        </button>
      </div>
    ),
  };
});
vi.mock("../../components/steps/TechnicianAssignmentStep", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../components/steps/TechnicianAssignmentStep")>();
  return {
    ...actual,
    TechnicianAssignmentStep: ({ onChange }: { onChange: (v: unknown[]) => void }) => (
      <div>
        <span>Technician Assignment Step</span>
        <button
          type="button"
          onClick={() =>
            onChange([{ facilityId: "f1", componentType: "SOLAR", componentSequence: 1, vendorOrgId: "org-1", vendorUserId: "u1" }])
          }
        >
          Assign Vendor
        </button>
      </div>
    ),
  };
});

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <CreateInstallationPlanPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mockSearchState = { projectId: "project-1" };
  mockNavigate.mockReset();
  vi.mocked(useProjectById).mockReturnValue({
    data: { id: "project-1", tenantId: "tenant-1", startDate: 1000, endDate: 100_000_000, additionalDetails: {} },
  } as never);
  vi.mocked(useInstallationPlanById).mockReturnValue({ data: undefined } as never);
  vi.mocked(useInstallationPlanReviewer).mockReturnValue({ data: undefined, isLoading: false } as never);
  vi.mocked(useInstallationPlanScope).mockReturnValue({ data: [], isLoading: false } as never);
  vi.mocked(useInstallationPlanTemplates).mockReturnValue({ data: [], isLoading: false } as never);
  vi.mocked(useVendorAssignmentSearch).mockReturnValue({ data: { sites: [] } } as never);
  vi.mocked(useSaveInstallationPlan).mockReturnValue({
    mutateAsync: vi.fn().mockResolvedValue({ plan: { id: "plan-1" } }),
    isPending: false,
  } as never);
  vi.mocked(checkInstallationScope).mockReset();
  vi.mocked(publishInstallationPlan).mockReset();
  vi.mocked(validateVendorAssignment).mockReset();
});

describe("CreateInstallationPlanPage", () => {
  it("shows the Plan Details step by default with Next disabled until valid", () => {
    renderPage();

    expect(screen.getByText("Plan Details Step")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });

  it("checks addable sites before creating a brand-new plan, and blocks with a warning when there are none", async () => {
    const user = userEvent.setup();
    vi.mocked(checkInstallationScope).mockResolvedValue({
      addableSiteCount: 0,
      candidatesInGeography: 0,
      candidatesInSectors: 0,
      skippedNoSolution: [],
      skippedLockedElsewhere: [],
      reason: "No sites available here",
    });
    const mutateAsync = vi.fn();
    vi.mocked(useSaveInstallationPlan).mockReturnValue({ mutateAsync, isPending: false } as never);
    renderPage();

    await user.click(screen.getByRole("button", { name: "Fill Plan Details" }));
    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(await screen.findByText("No sites available here")).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("creates the plan and advances to step 2 once addable sites exist", async () => {
    const user = userEvent.setup();
    vi.mocked(checkInstallationScope).mockResolvedValue({
      addableSiteCount: 5,
      candidatesInGeography: 5,
      candidatesInSectors: 5,
      skippedNoSolution: [],
      skippedLockedElsewhere: [],
      reason: null,
    });
    const mutateAsync = vi.fn().mockResolvedValue({ plan: { id: "plan-1" } });
    vi.mocked(useSaveInstallationPlan).mockReturnValue({ mutateAsync, isPending: false } as never);
    renderPage();

    await user.click(screen.getByRole("button", { name: "Fill Plan Details" }));
    await user.click(screen.getByRole("button", { name: "Next" }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith({ search: expect.any(Function), replace: true }),
    );
  });

  it("stays on step 1 and reports the reviewer-assignment failure without losing the new plan id", async () => {
    const user = userEvent.setup();
    vi.mocked(checkInstallationScope).mockResolvedValue({
      addableSiteCount: 5,
      candidatesInGeography: 5,
      candidatesInSectors: 5,
      skippedNoSolution: [],
      skippedLockedElsewhere: [],
      reason: null,
    });
    vi.mocked(useSaveInstallationPlan).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({ plan: { id: "plan-1" }, reviewerError: new Error("boom") }),
      isPending: false,
    } as never);
    renderPage();

    await user.click(screen.getByRole("button", { name: "Fill Plan Details" }));
    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(
      await screen.findByText(/Installation Reviewer could not be assigned/i),
    ).toBeInTheDocument();
  });

  it("gates step navigation: only reachable steps (up to maxAccessibleStep) are clickable", () => {
    mockSearchState = { projectId: "project-1", planId: "plan-1", step: 1 };
    vi.mocked(useInstallationPlanById).mockReturnValue({
      data: { id: "plan-1", tenantId: "tenant-1", projectId: "project-1", additionalDetails: {} },
    } as never);
    vi.mocked(useInstallationPlanScope).mockReturnValue({ data: [], isLoading: false } as never);
    renderPage();

    // With no scope yet, maxAccessibleStep is 2 -- step 3/4 stay disabled.
    expect(screen.getByRole("tab", { name: /Template/i })).toBeDisabled();
    expect(screen.getByRole("tab", { name: /Technician Assignment/i })).toBeDisabled();
  });

  it("shows the publish-readonly banner and hides the footer once the plan is published", () => {
    mockSearchState = { projectId: "project-1", planId: "plan-1", step: 4 };
    vi.mocked(useInstallationPlanById).mockReturnValue({
      data: { id: "plan-1", tenantId: "tenant-1", projectId: "project-1", additionalDetails: { status: "PUBLISHED" } },
    } as never);
    vi.mocked(useInstallationPlanScope).mockReturnValue({
      data: [{ siteId: "f1", included: true, solutionCode: "SOLAR" }],
      isLoading: false,
    } as never);
    vi.mocked(useInstallationPlanTemplates).mockReturnValue({
      data: [{ solutionCode: "SOLAR", uploaded: true }],
      isLoading: false,
    } as never);
    renderPage();

    expect(screen.getByText(/published and can no longer be edited/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Submit" })).not.toBeInTheDocument();
  });

  it("submits: validates the assignment, publishes, and shows the success card", async () => {
    const user = userEvent.setup();
    mockSearchState = { projectId: "project-1", planId: "plan-1", step: 4 };
    vi.mocked(useInstallationPlanById).mockReturnValue({
      data: { id: "plan-1", tenantId: "tenant-1", projectId: "project-1", name: "Plan A", additionalDetails: {} },
    } as never);
    vi.mocked(useInstallationPlanScope).mockReturnValue({
      data: [{ siteId: "f1", included: true, solutionCode: "SOLAR" }],
      isLoading: false,
    } as never);
    vi.mocked(useInstallationPlanTemplates).mockReturnValue({
      data: [{ solutionCode: "SOLAR", uploaded: true }],
      isLoading: false,
    } as never);
    vi.mocked(useVendorAssignmentSearch).mockReturnValue({
      data: {
        sites: [
          {
            facilityId: "f1",
            assets: [{ componentType: "SOLAR", componentSequence: 1, vendorOrgId: "org-1", vendorUserId: "u1" }],
          },
        ],
      },
    } as never);
    vi.mocked(validateVendorAssignment).mockResolvedValue({ valid: true, errors: [] });
    vi.mocked(publishInstallationPlan).mockResolvedValue({
      id: "plan-1",
      tenantId: "tenant-1",
      projectId: "project-1",
      additionalDetails: { status: "PUBLISHED" },
    });
    renderPage();

    await user.click(screen.getByRole("button", { name: "Submit" }));
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Confirm & Submit" }));

    await waitFor(() => expect(publishInstallationPlan).toHaveBeenCalled());
    expect(await screen.findByText("Installation Plan Created!")).toBeInTheDocument();
  });

  it("shows the validation errors when submitting fails vendor-assignment validation", async () => {
    const user = userEvent.setup();
    mockSearchState = { projectId: "project-1", planId: "plan-1", step: 4 };
    vi.mocked(useInstallationPlanById).mockReturnValue({
      data: { id: "plan-1", tenantId: "tenant-1", projectId: "project-1", additionalDetails: {} },
    } as never);
    vi.mocked(useInstallationPlanScope).mockReturnValue({
      data: [{ siteId: "f1", included: true, solutionCode: "SOLAR" }],
      isLoading: false,
    } as never);
    vi.mocked(useInstallationPlanTemplates).mockReturnValue({
      data: [{ solutionCode: "SOLAR", uploaded: true }],
      isLoading: false,
    } as never);
    vi.mocked(useVendorAssignmentSearch).mockReturnValue({
      data: {
        sites: [
          {
            facilityId: "f1",
            assets: [{ componentType: "SOLAR", componentSequence: 1, vendorOrgId: "org-1", vendorUserId: "u1" }],
          },
        ],
      },
    } as never);
    vi.mocked(validateVendorAssignment).mockResolvedValue({
      valid: false,
      errors: [{ message: "REVIEWER_MISSING" }],
    });
    renderPage();

    await user.click(screen.getByRole("button", { name: "Submit" }));
    await user.click(screen.getByRole("button", { name: "Confirm & Submit" }));

    expect(await screen.findByText("REVIEWER_MISSING")).toBeInTheDocument();
    expect(publishInstallationPlan).not.toHaveBeenCalled();
  });
});
