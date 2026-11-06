import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useFacilityIngestion } from "../../hooks/use-facility-ingestion";
import { EndUserDataStep, type EndUserDataStepHandle } from "./EndUserDataStep";

vi.mock("../../hooks/use-facility-ingestion", () => ({ useFacilityIngestion: vi.fn() }));

function roundTrip(overrides: Partial<ReturnType<typeof useFacilityIngestion>> = {}) {
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
  vi.mocked(useFacilityIngestion).mockReturnValue(roundTrip());
});

describe("EndUserDataStep", () => {
  it("renders the upload panel wired to the ingestion round-trip's state", () => {
    render(<EndUserDataStep projectId="project-1" geographyDetails={{}} onComplete={vi.fn()} />);

    expect(screen.getByRole("button", { name: /Download Template/i })).toBeInTheDocument();
  });

  it("reports busy state changes to the parent via onBusyChange", () => {
    vi.mocked(useFacilityIngestion).mockReturnValue(roundTrip({ isBusy: true }));
    const onBusyChange = vi.fn();

    render(
      <EndUserDataStep projectId="project-1" geographyDetails={{}} onComplete={vi.fn()} onBusyChange={onBusyChange} />,
    );

    expect(onBusyChange).toHaveBeenCalledWith(true);
  });

  it("reports submit availability only once status is done and not busy", () => {
    vi.mocked(useFacilityIngestion).mockReturnValue(roundTrip({ status: "done", isBusy: false }));
    const onSubmitAvailabilityChange = vi.fn();

    render(
      <EndUserDataStep
        projectId="project-1"
        geographyDetails={{}}
        onComplete={vi.fn()}
        onSubmitAvailabilityChange={onSubmitAvailabilityChange}
      />,
    );

    expect(onSubmitAvailabilityChange).toHaveBeenCalledWith(true);
  });

  it("reports submit unavailable while busy even if status is done", () => {
    vi.mocked(useFacilityIngestion).mockReturnValue(roundTrip({ status: "done", isBusy: true }));
    const onSubmitAvailabilityChange = vi.fn();

    render(
      <EndUserDataStep
        projectId="project-1"
        geographyDetails={{}}
        onComplete={vi.fn()}
        onSubmitAvailabilityChange={onSubmitAvailabilityChange}
      />,
    );

    expect(onSubmitAvailabilityChange).toHaveBeenCalledWith(false);
  });

  it("exposes a submit() handle that calls onComplete", async () => {
    const onComplete = vi.fn().mockResolvedValue(undefined);
    const ref = createRef<EndUserDataStepHandle>();

    render(<EndUserDataStep ref={ref} projectId="project-1" geographyDetails={{}} onComplete={onComplete} />);
    await ref.current?.submit();

    expect(onComplete).toHaveBeenCalled();
  });
});
