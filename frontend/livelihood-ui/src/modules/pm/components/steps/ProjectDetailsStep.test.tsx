vi.mock("../../hooks/use-justification-code-prefix", () => ({ useJustificationCodePrefix: vi.fn() }));

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useJustificationCodePrefix } from "../../hooks/use-justification-code-prefix";
import { isProjectDetailsValid, ProjectDetailsStep, type ProjectDetailsValue } from "./ProjectDetailsStep";

const mockUseJustificationCodePrefix = vi.mocked(useJustificationCodePrefix);

beforeEach(() => {
  Element.prototype.hasPointerCapture = Element.prototype.hasPointerCapture ?? (() => false);
  Element.prototype.setPointerCapture = Element.prototype.setPointerCapture ?? (() => {});
  Element.prototype.releasePointerCapture = Element.prototype.releasePointerCapture ?? (() => {});
  Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? (() => {});
  mockUseJustificationCodePrefix.mockReturnValue({ data: "JUS" } as ReturnType<typeof useJustificationCodePrefix>);
});

describe("isProjectDetailsValid for an existing project", () => {
  it("accepts a legacy code that doesn't match the new format, but still needs the dates", () => {
    expect(isProjectDetailsValid({ justificationCode: "SLKA", startDate: 1, endDate: 2 }, true)).toBe(true);
    expect(isProjectDetailsValid({ justificationCode: "SLKA", startDate: 1, endDate: 2 })).toBe(false);
    expect(isProjectDetailsValid({ justificationCode: "SLKA", endDate: 2 }, true)).toBe(false);
    expect(isProjectDetailsValid({ justificationCode: "SLKA", startDate: 3, endDate: 2 }, true)).toBe(false);
  });

  it("still requires a code", () => {
    expect(isProjectDetailsValid({ justificationCode: "", startDate: 1, endDate: 2 }, true)).toBe(false);
  });
});

describe("isProjectDetailsValid", () => {
  it("requires exactly 5 digits with an optional 1-2 digit suffix for the justification code", () => {
    expect(isProjectDetailsValid({ justificationCode: "98234", startDate: 1, endDate: 2 })).toBe(true);
    expect(isProjectDetailsValid({ justificationCode: "98234-1", startDate: 1, endDate: 2 })).toBe(true);
    expect(isProjectDetailsValid({ justificationCode: "98234-10", startDate: 1, endDate: 2 })).toBe(true);
    expect(isProjectDetailsValid({ justificationCode: "98234-100", startDate: 1, endDate: 2 })).toBe(false);
    expect(isProjectDetailsValid({ justificationCode: "9823", startDate: 1, endDate: 2 })).toBe(false);
    expect(isProjectDetailsValid({ justificationCode: "982345", startDate: 1, endDate: 2 })).toBe(false);
    expect(isProjectDetailsValid({ justificationCode: "ABCDE", startDate: 1, endDate: 2 })).toBe(false);
    expect(isProjectDetailsValid({ justificationCode: "98234-", startDate: 1, endDate: 2 })).toBe(false);
    expect(isProjectDetailsValid({ justificationCode: "98234-a", startDate: 1, endDate: 2 })).toBe(false);
  });

  it("requires both startDate and endDate to be set", () => {
    expect(isProjectDetailsValid({ justificationCode: "98234", endDate: 2 })).toBe(false);
    expect(isProjectDetailsValid({ justificationCode: "98234", startDate: 1 })).toBe(false);
  });

  it("requires startDate to be on or before endDate", () => {
    expect(isProjectDetailsValid({ justificationCode: "98234", startDate: 2, endDate: 1 })).toBe(false);
    expect(isProjectDetailsValid({ justificationCode: "98234", startDate: 1, endDate: 1 })).toBe(true);
  });
});

describe("ProjectDetailsStep", () => {
  const baseValue: ProjectDetailsValue = { justificationCode: "" };

  it("shows the MDMS-sourced prefix and strips non-digit, non-dash characters from the input", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ProjectDetailsStep value={baseValue} onChange={onChange} />);

    expect(screen.getByText("JUS-")).toBeInTheDocument();

    await user.type(screen.getByLabelText(/Justification Code/i), "9a8 2-3");

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ justificationCode: expect.stringMatching(/^[\d-]*$/) }));
  });

  it("shows an inline format error once 5+ characters are typed but the shape is still invalid", () => {
    render(
      <ProjectDetailsStep
        value={{ justificationCode: "98234-100" }}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText(/Enter a valid code/i)).toBeInTheDocument();
  });

  it("shows no inline error for a locked legacy code", () => {
    render(<ProjectDetailsStep value={{ justificationCode: "SLKAB" }} onChange={vi.fn()} locked />);

    expect(screen.queryByText(/Enter a valid code/i)).not.toBeInTheDocument();
  });

  it("shows no inline error while fewer than 5 digits have been typed", () => {
    render(<ProjectDetailsStep value={{ justificationCode: "982" }} onChange={vi.fn()} />);

    expect(screen.queryByText(/Enter a valid code/i)).not.toBeInTheDocument();
  });

  it("shows no inline error once a valid code is typed", () => {
    render(<ProjectDetailsStep value={{ justificationCode: "98234-1" }} onChange={vi.fn()} />);

    expect(screen.queryByText(/Enter a valid code/i)).not.toBeInTheDocument();
  });

  it("prefers an externally-supplied error (e.g. a backend duplicate-code rejection) over the format error", () => {
    render(
      <ProjectDetailsStep
        value={{ justificationCode: "98234" }}
        onChange={vi.fn()}
        errors={{ justificationCode: "Already in use" }}
      />,
    );

    expect(screen.getByText("Already in use")).toBeInTheDocument();
  });

  it("falls back to a default prefix while the MDMS master is loading", () => {
    mockUseJustificationCodePrefix.mockReturnValue({ data: undefined } as ReturnType<typeof useJustificationCodePrefix>);
    render(<ProjectDetailsStep value={baseValue} onChange={vi.fn()} />);

    expect(screen.getByText("JUS-")).toBeInTheDocument();
  });

  it("shows a field-specific error when given one", () => {
    render(
      <ProjectDetailsStep value={baseValue} onChange={vi.fn()} errors={{ justificationCode: "Required" }} />,
    );

    expect(screen.getByText("Required")).toBeInTheDocument();
  });

  it("disables inputs when locked", () => {
    render(<ProjectDetailsStep value={baseValue} onChange={vi.fn()} locked />);

    expect(screen.getByLabelText(/Justification Code/i)).toBeDisabled();
  });

  it("shows the locked description text when locked", () => {
    render(<ProjectDetailsStep value={baseValue} onChange={vi.fn()} locked />);

    expect(screen.getByText(/locked once the project is created/i)).toBeInTheDocument();
  });
});
