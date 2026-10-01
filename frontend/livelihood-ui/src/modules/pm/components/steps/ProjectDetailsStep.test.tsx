import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { isProjectDetailsValid, ProjectDetailsStep, type ProjectDetailsValue } from "./ProjectDetailsStep";

beforeEach(() => {
  Element.prototype.hasPointerCapture = Element.prototype.hasPointerCapture ?? (() => false);
  Element.prototype.setPointerCapture = Element.prototype.setPointerCapture ?? (() => {});
  Element.prototype.releasePointerCapture = Element.prototype.releasePointerCapture ?? (() => {});
  Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? (() => {});
});

describe("isProjectDetailsValid", () => {
  it("requires exactly 4 uppercase letters for the justification code", () => {
    expect(isProjectDetailsValid({ justificationCode: "SLKA", startDate: 1, endDate: 2 })).toBe(true);
    expect(isProjectDetailsValid({ justificationCode: "slka", startDate: 1, endDate: 2 })).toBe(false);
    expect(isProjectDetailsValid({ justificationCode: "SLK", startDate: 1, endDate: 2 })).toBe(false);
    expect(isProjectDetailsValid({ justificationCode: "SLKAA", startDate: 1, endDate: 2 })).toBe(false);
  });

  it("requires both startDate and endDate to be set", () => {
    expect(isProjectDetailsValid({ justificationCode: "SLKA", endDate: 2 })).toBe(false);
    expect(isProjectDetailsValid({ justificationCode: "SLKA", startDate: 1 })).toBe(false);
  });

  it("requires startDate to be on or before endDate", () => {
    expect(isProjectDetailsValid({ justificationCode: "SLKA", startDate: 2, endDate: 1 })).toBe(false);
    expect(isProjectDetailsValid({ justificationCode: "SLKA", startDate: 1, endDate: 1 })).toBe(true);
  });
});

describe("ProjectDetailsStep", () => {
  const baseValue: ProjectDetailsValue = { justificationCode: "" };

  it("uppercases and strips non-letters from the justification code input", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ProjectDetailsStep value={baseValue} onChange={onChange} />);

    await user.type(screen.getByLabelText(/Justification Code/i), "s1k a");

    expect(onChange).toHaveBeenCalledWith({ justificationCode: "S" });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ justificationCode: expect.stringMatching(/^[A-Z]*$/) }));
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
