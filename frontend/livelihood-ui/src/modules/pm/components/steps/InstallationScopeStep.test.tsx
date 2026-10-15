import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useInstallationScopeIngestion } from "../../hooks/use-installation-scope-ingestion";
import { InstallationScopeStep, isScopeValid } from "./InstallationScopeStep";

vi.mock("../../hooks/use-installation-scope-ingestion", () => ({ useInstallationScopeIngestion: vi.fn() }));

function roundTrip(overrides: Partial<ReturnType<typeof useInstallationScopeIngestion>> = {}) {
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
  } as unknown as ReturnType<typeof useInstallationScopeIngestion>;
}

beforeEach(() => {
  vi.mocked(useInstallationScopeIngestion).mockReturnValue(roundTrip());
});

describe("isScopeValid", () => {
  it("requires at least one included entry, each with a solutionCode", () => {
    expect(isScopeValid([{ siteId: "f1", included: true, solutionCode: "SOLAR" }])).toBe(true);
    expect(isScopeValid([{ siteId: "f1", included: false }])).toBe(false);
    expect(isScopeValid([{ siteId: "f1", included: true }])).toBe(false);
    expect(isScopeValid([])).toBe(false);
  });

  it("ignores excluded entries when checking for a missing solutionCode", () => {
    expect(
      isScopeValid([
        { siteId: "f1", included: true, solutionCode: "SOLAR" },
        { siteId: "f2", included: false },
      ]),
    ).toBe(true);
  });
});

describe("InstallationScopeStep", () => {
  it("disables the download button when there's no plan, no sectors, or no project blocks yet", () => {
    render(
      <InstallationScopeStep
        planId={undefined}
        projectId="project-1"
        projectGeography={{}}
        sectorCodes={[]}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /Download Installation Scope/i })).toBeDisabled();
  });

  it("enables the download button once plan/sectors/geography are all ready", () => {
    render(
      <InstallationScopeStep
        planId="plan-1"
        projectId="project-1"
        projectGeography={{ blocks: [{ code: "B1", districtCode: "D1", stateCode: "KA" }] }}
        sectorCodes={["SOLAR"]}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /Download Installation Scope/i })).toBeEnabled();
  });

  it("calls onChange and onScopeApplied with the entries once an upload resolves", async () => {
    const entries = [{ siteId: "f1", included: true, solutionCode: "SOLAR" }];
    const uploadAndValidate = vi.fn().mockResolvedValue(entries);
    vi.mocked(useInstallationScopeIngestion).mockReturnValue(roundTrip({ uploadAndValidate }));
    const onChange = vi.fn();
    const onScopeApplied = vi.fn();

    render(
      <InstallationScopeStep
        planId="plan-1"
        projectId="project-1"
        projectGeography={{}}
        sectorCodes={["SOLAR"]}
        onChange={onChange}
        onScopeApplied={onScopeApplied}
      />,
    );
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const { fireEvent } = await import("@testing-library/react");
    fireEvent.change(input, { target: { files: [new File(["x"], "scope.xlsx")] } });

    await vi.waitFor(() => expect(onChange).toHaveBeenCalledWith(entries));
    expect(onScopeApplied).toHaveBeenCalledWith(entries);
  });
});
