import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useFacility } from "@/shared/hooks/use-facility";
import { useInstallationSolutions } from "../../hooks/use-installation-solutions";
import { useSolutionTemplateUpload } from "../../hooks/use-solution-template-upload";
import { isTemplateStepValid, TemplateStep } from "./TemplateStep";

vi.mock("@/shared/hooks/use-facility", () => ({ useFacility: vi.fn() }));
vi.mock("../../hooks/use-installation-solutions", () => ({ useInstallationSolutions: vi.fn() }));
vi.mock("../../hooks/use-solution-template-upload", () => ({ useSolutionTemplateUpload: vi.fn() }));

function roundTrip(overrides: Partial<ReturnType<typeof useSolutionTemplateUpload>> = {}) {
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
    createTemplate: vi.fn(),
    downloadPreview: vi.fn(),
    ...overrides,
  } as unknown as ReturnType<typeof useSolutionTemplateUpload>;
}

describe("isTemplateStepValid", () => {
  it("is false when there are no solutions in scope", () => {
    expect(isTemplateStepValid([], [])).toBe(false);
  });

  it("is true only once every unique solution code has an uploaded entry", () => {
    expect(isTemplateStepValid([{ solutionCode: "SOLAR", uploaded: true }], ["SOLAR"])).toBe(true);
    expect(isTemplateStepValid([{ solutionCode: "SOLAR", uploaded: false }], ["SOLAR"])).toBe(false);
    expect(isTemplateStepValid([{ solutionCode: "SOLAR", uploaded: true }], ["SOLAR", "MACHINE"])).toBe(false);
  });
});

describe("TemplateStep", () => {
  beforeEach(() => {
    vi.mocked(useInstallationSolutions).mockReturnValue({ data: [{ code: "SOLAR", name: "Solar Panel Kit" }] } as never);
    vi.mocked(useSolutionTemplateUpload).mockReturnValue(roundTrip());
    vi.mocked(useFacility).mockReturnValue({
      data: { facilities: [{ facilityId: "f1", facilityName: "Site One" }] },
    } as never);
  });

  const scope = [{ siteId: "f1", included: true, solutionCode: "SOLAR" }];

  it("shows a message when no solutions are in scope yet", () => {
    render(
      <TemplateStep planId="plan-1" scope={[]} projectGeography={{}} value={[]} onChange={vi.fn()} />,
    );

    expect(screen.getByText(/No solutions in scope yet/i)).toBeInTheDocument();
  });

  it("renders one card per distinct solution in scope, with its resolved display name", () => {
    render(
      <TemplateStep planId="plan-1" scope={scope} projectGeography={{}} value={[]} onChange={vi.fn()} />,
    );

    expect(screen.getByText("Solar Panel Kit")).toBeInTheDocument();
  });

  it("lists the assigned site's resolved name from facility data", () => {
    render(
      <TemplateStep planId="plan-1" scope={scope} projectGeography={{}} value={[]} onChange={vi.fn()} />,
    );

    expect(screen.getByText("Site One")).toBeInTheDocument();
  });

  it("shows 'Template uploaded' once the value marks the solution as uploaded", () => {
    render(
      <TemplateStep
        planId="plan-1"
        scope={scope}
        projectGeography={{}}
        value={[{ solutionCode: "SOLAR", uploaded: true }]}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Template uploaded")).toBeInTheDocument();
  });

  it("calls downloadTemplate when the card's Download Template button is clicked", async () => {
    const downloadTemplate = vi.fn();
    vi.mocked(useSolutionTemplateUpload).mockReturnValue(roundTrip({ downloadTemplate }));
    const user = userEvent.setup();

    render(
      <TemplateStep planId="plan-1" scope={scope} projectGeography={{}} value={[]} onChange={vi.fn()} />,
    );
    await user.click(screen.getByRole("button", { name: /Download Template/i }));

    expect(downloadTemplate).toHaveBeenCalled();
  });

  it("disables the Upload Template button when locked", () => {
    render(
      <TemplateStep planId="plan-1" scope={scope} projectGeography={{}} value={[]} onChange={vi.fn()} locked />,
    );

    expect(screen.getByRole("button", { name: /Upload Template/i })).toBeDisabled();
  });

  it("shows a 'Validating...' caption while the round-trip is validating and not yet uploaded", () => {
    vi.mocked(useSolutionTemplateUpload).mockReturnValue(roundTrip({ status: "validating" }));

    render(
      <TemplateStep planId="plan-1" scope={scope} projectGeography={{}} value={[]} onChange={vi.fn()} />,
    );

    expect(screen.getByText("Validating...")).toBeInTheDocument();
  });

  it("clicking Upload Template opens the hidden file picker", async () => {
    const user = userEvent.setup();
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(() => {});
    render(
      <TemplateStep planId="plan-1" scope={scope} projectGeography={{}} value={[]} onChange={vi.fn()} />,
    );

    await user.click(screen.getByRole("button", { name: /Upload Template/i }));

    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });

  it("uploads a valid .xlsx file via the hidden input", () => {
    const uploadAndValidate = vi.fn();
    vi.mocked(useSolutionTemplateUpload).mockReturnValue(roundTrip({ uploadAndValidate }));
    const { container } = render(
      <TemplateStep planId="plan-1" scope={scope} projectGeography={{}} value={[]} onChange={vi.fn()} />,
    );
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["data"], "template.xlsx");

    fireEvent.change(input, { target: { files: [file] } });

    expect(uploadAndValidate).toHaveBeenCalledWith(file);
  });

  it("shows an invalid-file-type message and does not upload a rejected extension", () => {
    const uploadAndValidate = vi.fn();
    vi.mocked(useSolutionTemplateUpload).mockReturnValue(roundTrip({ uploadAndValidate }));
    const { container } = render(
      <TemplateStep planId="plan-1" scope={scope} projectGeography={{}} value={[]} onChange={vi.fn()} />,
    );
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["data"], "template.csv");

    fireEvent.change(input, { target: { files: [file] } });

    expect(uploadAndValidate).not.toHaveBeenCalled();
    expect(screen.getByText("Please upload a valid .xlsx file")).toBeInTheDocument();
  });

  it("does not upload when locked, even for a valid file", () => {
    const uploadAndValidate = vi.fn();
    vi.mocked(useSolutionTemplateUpload).mockReturnValue(roundTrip({ uploadAndValidate }));
    const { container } = render(
      <TemplateStep planId="plan-1" scope={scope} projectGeography={{}} value={[]} onChange={vi.fn()} locked />,
    );
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [new File(["data"], "template.xlsx")] } });

    expect(uploadAndValidate).not.toHaveBeenCalled();
  });

  it("calls createTemplate once validatedFile changes identity, and marks the solution uploaded when it resolves true", async () => {
    const createTemplate = vi.fn().mockResolvedValue(true);
    const onChange = vi.fn();
    vi.mocked(useSolutionTemplateUpload).mockReturnValue(roundTrip({ validatedFile: null, createTemplate }));
    const { rerender } = render(
      <TemplateStep planId="plan-1" scope={scope} projectGeography={{}} value={[]} onChange={onChange} />,
    );
    expect(createTemplate).not.toHaveBeenCalled();

    const validatedFile = { blob: new Blob(["x"]), filename: "validated.xlsx" };
    vi.mocked(useSolutionTemplateUpload).mockReturnValue(roundTrip({ validatedFile, createTemplate }));
    rerender(
      <TemplateStep planId="plan-1" scope={scope} projectGeography={{}} value={[]} onChange={onChange} />,
    );

    await vi.waitFor(() => expect(createTemplate).toHaveBeenCalled());
    await vi.waitFor(() => expect(onChange).toHaveBeenCalled());
    const updater = onChange.mock.calls.at(-1)![0] as (prev: unknown[]) => unknown[];
    expect(updater([])).toEqual([{ solutionCode: "SOLAR", uploaded: true }]);
    expect(updater([{ solutionCode: "SOLAR", uploaded: false }, { solutionCode: "MACHINE", uploaded: true }])).toEqual([
      { solutionCode: "MACHINE", uploaded: true },
      { solutionCode: "SOLAR", uploaded: true },
    ]);
  });

  it("does not mark the solution uploaded when createTemplate resolves false", async () => {
    const createTemplate = vi.fn().mockResolvedValue(false);
    const onChange = vi.fn();
    vi.mocked(useSolutionTemplateUpload).mockReturnValue(roundTrip({ validatedFile: null, createTemplate }));
    const { rerender } = render(
      <TemplateStep planId="plan-1" scope={scope} projectGeography={{}} value={[]} onChange={onChange} />,
    );

    const validatedFile = { blob: new Blob(["x"]), filename: "validated.xlsx" };
    vi.mocked(useSolutionTemplateUpload).mockReturnValue(roundTrip({ validatedFile, createTemplate }));
    rerender(
      <TemplateStep planId="plan-1" scope={scope} projectGeography={{}} value={[]} onChange={onChange} />,
    );

    await vi.waitFor(() => expect(createTemplate).toHaveBeenCalled());
    expect(onChange).not.toHaveBeenCalled();
  });

  it("reports busy when a card is uploading and idle again once it settles", () => {
    const onBusyChange = vi.fn();
    vi.mocked(useSolutionTemplateUpload).mockReturnValue(roundTrip({ isBusy: true }));
    const { rerender } = render(
      <TemplateStep
        planId="plan-1"
        scope={scope}
        projectGeography={{}}
        value={[]}
        onChange={vi.fn()}
        onBusyChange={onBusyChange}
      />,
    );
    expect(onBusyChange).toHaveBeenLastCalledWith(true);

    vi.mocked(useSolutionTemplateUpload).mockReturnValue(roundTrip({ isBusy: false }));
    rerender(
      <TemplateStep
        planId="plan-1"
        scope={scope}
        projectGeography={{}}
        value={[]}
        onChange={vi.fn()}
        onBusyChange={onBusyChange}
      />,
    );

    expect(onBusyChange).toHaveBeenLastCalledWith(false);
  });

  it("paginates solutions in scope, resetting to the first page when the page size changes", async () => {
    const user = userEvent.setup();
    const manySolutions = Array.from({ length: 12 }, (_, i) => ({ code: `SOL${i}`, name: `Solution ${i}` }));
    vi.mocked(useInstallationSolutions).mockReturnValue({ data: manySolutions } as never);
    const manyScope = manySolutions.map((solution) => ({
      siteId: "f1",
      included: true,
      solutionCode: solution.code,
    }));

    render(
      <TemplateStep planId="plan-1" scope={manyScope} projectGeography={{}} value={[]} onChange={vi.fn()} />,
    );

    expect(screen.getByText("Solution 0")).toBeInTheDocument();
    expect(screen.queryByText("Solution 11")).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Items per Page"), "20");

    expect(screen.getByText("Solution 11")).toBeInTheDocument();
  });

  it("moves to the next and previous page via the pagination controls", async () => {
    const user = userEvent.setup();
    const manySolutions = Array.from({ length: 12 }, (_, i) => ({ code: `SOL${i}`, name: `Solution ${i}` }));
    vi.mocked(useInstallationSolutions).mockReturnValue({ data: manySolutions } as never);
    const manyScope = manySolutions.map((solution) => ({
      siteId: "f1",
      included: true,
      solutionCode: solution.code,
    }));

    render(
      <TemplateStep planId="plan-1" scope={manyScope} projectGeography={{}} value={[]} onChange={vi.fn()} />,
    );

    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Solution 11")).toBeInTheDocument();
    expect(screen.queryByText("Solution 0")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Previous" }));
    expect(screen.getByText("Solution 0")).toBeInTheDocument();
  });
});
