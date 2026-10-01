import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useBoundaryTree } from "../../hooks/use-boundary-tree";
import { useReviewerOptions } from "../../hooks/use-reviewer-options";
import { useSectors } from "../../hooks/use-sectors";
import { isPlanDetailsValid, PlanDetailsStep, type PlanDetailsValue } from "./PlanDetailsStep";

vi.mock("../../hooks/use-boundary-tree", () => ({ useBoundaryTree: vi.fn() }));
vi.mock("../../hooks/use-sectors", () => ({ useSectors: vi.fn() }));
vi.mock("../../hooks/use-reviewer-options", () => ({ useReviewerOptions: vi.fn() }));

const hierarchy = {
  states: [{ code: "KA", name: "Karnataka" }, { code: "AS", name: "Assam" }],
  districts: [{ code: "D1", name: "D1", stateCode: "KA" }],
  blocks: [{ code: "B1", name: "B1", districtCode: "D1", stateCode: "KA" }],
};

beforeEach(() => {
  Element.prototype.hasPointerCapture = Element.prototype.hasPointerCapture ?? (() => false);
  Element.prototype.setPointerCapture = Element.prototype.setPointerCapture ?? (() => {});
  Element.prototype.releasePointerCapture = Element.prototype.releasePointerCapture ?? (() => {});
  Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? (() => {});
  vi.mocked(useBoundaryTree).mockReturnValue({ data: hierarchy } as never);
  vi.mocked(useSectors).mockReturnValue({ data: [{ code: "SOLAR", name: "SOLAR" }] } as never);
  vi.mocked(useReviewerOptions).mockReturnValue({ data: [{ code: "rev-1", name: "Reviewer One" }] } as never);
});

const baseValue: PlanDetailsValue = { geographyDetails: {}, sectorCodes: [], reviewerCode: "" };
const projectGeography = {
  states: [{ code: "KA" }],
  districts: [{ code: "D1", stateCode: "KA" }],
  blocks: [{ code: "B1", districtCode: "D1", stateCode: "KA" }],
};

describe("isPlanDetailsValid", () => {
  function valid(overrides: Partial<PlanDetailsValue> = {}): PlanDetailsValue {
    return {
      geographyDetails: { states: [{ code: "KA" }], blocks: [{ code: "B1", districtCode: "D1", stateCode: "KA" }] },
      sectorCodes: ["SOLAR"],
      reviewerCode: "rev-1",
      startDate: 1000,
      endDate: 2000,
      ...overrides,
    };
  }

  it("is true when every field is set and dates are ordered correctly", () => {
    expect(isPlanDetailsValid(valid())).toBe(true);
  });

  it("is false when geography, sector, or reviewer is missing", () => {
    expect(isPlanDetailsValid(valid({ geographyDetails: {} }))).toBe(false);
    expect(isPlanDetailsValid(valid({ sectorCodes: [] }))).toBe(false);
    expect(isPlanDetailsValid(valid({ reviewerCode: "" }))).toBe(false);
  });

  it("is false when startDate is after endDate", () => {
    expect(isPlanDetailsValid(valid({ startDate: 2000, endDate: 1000 }))).toBe(false);
  });

  it("is false when the plan's start date is before the project's start date (by calendar day)", () => {
    const projectStart = new Date(2026, 0, 10).getTime();
    const planStart = new Date(2026, 0, 9).getTime();
    expect(isPlanDetailsValid(valid({ startDate: planStart }), projectStart)).toBe(false);
  });

  it("is true when the plan's start date equals the project's start date (same calendar day)", () => {
    const projectStart = new Date(2026, 0, 10, 5, 30).getTime();
    const planStart = new Date(2026, 0, 10, 0, 0).getTime();
    expect(isPlanDetailsValid(valid({ startDate: planStart, endDate: planStart + 86400000 }), projectStart)).toBe(true);
  });

  it("is false when the plan's end date is after the project's end date (by calendar day)", () => {
    const projectEnd = new Date(2026, 0, 20).getTime();
    const planEnd = new Date(2026, 0, 21).getTime();
    expect(isPlanDetailsValid(valid({ endDate: planEnd }), undefined, projectEnd)).toBe(false);
  });
});

describe("PlanDetailsStep", () => {
  it("only offers state options that belong to the project's own geography", async () => {
    const user = userEvent.setup();
    render(
      <PlanDetailsStep value={baseValue} onChange={vi.fn()} projectGeography={{ states: [{ code: "KA" }] }} />,
    );

    await user.click(screen.getByRole("button", { name: /^State/i }));

    expect(screen.getByText("Karnataka")).toBeInTheDocument();
    expect(screen.queryByText("Assam")).not.toBeInTheDocument();
  });

  it("selecting a state updates geographyDetails", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PlanDetailsStep value={baseValue} onChange={onChange} projectGeography={projectGeography} />);

    await user.click(screen.getByRole("button", { name: /^State/i }));
    const popover = screen.getByRole("dialog");
    await user.click(within(popover).getByText("Karnataka"));

    expect(onChange).toHaveBeenCalledWith({
      ...baseValue,
      geographyDetails: { states: [{ code: "KA" }], districts: [], blocks: [] },
    });
  });

  it("selecting a reviewer via the SearchableSelect sets reviewerCode", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PlanDetailsStep value={baseValue} onChange={onChange} projectGeography={projectGeography} />);

    await user.click(screen.getByRole("button", { name: /Assign Installation Reviewer/i }));
    await user.click(screen.getByText("Reviewer One"));

    expect(onChange).toHaveBeenCalledWith({ ...baseValue, reviewerCode: "rev-1" });
  });

  it("disables geography/sector fields when locked", () => {
    render(<PlanDetailsStep value={baseValue} onChange={vi.fn()} projectGeography={projectGeography} locked />);

    expect(screen.getByRole("button", { name: /^State/i })).toBeDisabled();
  });

  it("keeps the reviewer field editable when reviewerLocked is explicitly false, even if locked", () => {
    render(
      <PlanDetailsStep
        value={baseValue}
        onChange={vi.fn()}
        projectGeography={projectGeography}
        locked
        reviewerLocked={false}
      />,
    );

    expect(screen.getByRole("button", { name: /Assign Installation Reviewer/i })).toBeEnabled();
  });

  it("selecting a district updates geographyDetails, keeping the already-selected state", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const value: PlanDetailsValue = { ...baseValue, geographyDetails: { states: [{ code: "KA" }] } };
    render(<PlanDetailsStep value={value} onChange={onChange} projectGeography={projectGeography} />);

    await user.click(screen.getByRole("button", { name: /^District/i }));
    const popover = screen.getByRole("dialog");
    await user.click(within(popover).getByText("D1"));

    expect(onChange).toHaveBeenCalledWith({
      ...value,
      geographyDetails: { states: [{ code: "KA" }], districts: [{ code: "D1", stateCode: "KA" }], blocks: [] },
    });
  });

  it("selecting a block updates geographyDetails, keeping state and district", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const value: PlanDetailsValue = {
      ...baseValue,
      geographyDetails: { states: [{ code: "KA" }], districts: [{ code: "D1", stateCode: "KA" }] },
    };
    render(<PlanDetailsStep value={value} onChange={onChange} projectGeography={projectGeography} />);

    await user.click(screen.getByRole("button", { name: /^Block/i }));
    const popover = screen.getByRole("dialog");
    await user.click(within(popover).getByText("B1"));

    expect(onChange).toHaveBeenCalledWith({
      ...value,
      geographyDetails: {
        ...value.geographyDetails,
        blocks: [{ code: "B1", districtCode: "D1", stateCode: "KA" }],
      },
    });
  });

  it("selecting a sector updates sectorCodes", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PlanDetailsStep value={baseValue} onChange={onChange} projectGeography={projectGeography} />);

    await user.click(screen.getByRole("button", { name: /^Sector/i }));
    const popover = screen.getByRole("dialog");
    await user.click(within(popover).getByText("SOLAR"));

    expect(onChange).toHaveBeenCalledWith({ ...baseValue, sectorCodes: ["SOLAR"] });
  });

  it("picking start and end dates updates the value", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PlanDetailsStep value={baseValue} onChange={onChange} projectGeography={projectGeography} />);

    const dateTriggers = screen.getAllByRole("button", { name: "Select date" });
    await user.click(dateTriggers[0]);
    const startDay = document.querySelector(".rdp-day:not([aria-disabled='true']) button") as HTMLElement;
    await user.click(startDay);
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ startDate: expect.any(Number) }));

    await user.click(dateTriggers[1]);
    const endDay = document.querySelector(".rdp-day:not([aria-disabled='true']) button") as HTMLElement;
    await user.click(endDay);
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ endDate: expect.any(Number) }));
  });

  it("removes a state chip, clearing any districts/blocks that belonged to it", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const value: PlanDetailsValue = {
      ...baseValue,
      geographyDetails: {
        states: [{ code: "KA" }],
        districts: [{ code: "D1", stateCode: "KA" }],
        blocks: [{ code: "B1", districtCode: "D1", stateCode: "KA" }],
      },
    };
    render(<PlanDetailsStep value={value} onChange={onChange} projectGeography={projectGeography} />);

    await user.click(screen.getByRole("button", { name: /Remove Karnataka/i }));

    expect(onChange).toHaveBeenCalledWith({
      ...value,
      geographyDetails: { states: [], districts: [], blocks: [] },
    });
  });

  it("removes a district chip via handleDistrictsChange, dropping any blocks under it too", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const value: PlanDetailsValue = {
      ...baseValue,
      geographyDetails: {
        states: [{ code: "KA" }],
        districts: [{ code: "D1", stateCode: "KA" }],
        blocks: [{ code: "B1", districtCode: "D1", stateCode: "KA" }],
      },
    };
    render(<PlanDetailsStep value={value} onChange={onChange} projectGeography={projectGeography} />);

    await user.click(screen.getByRole("button", { name: /Remove D1/i }));

    expect(onChange).toHaveBeenCalledWith({
      ...value,
      geographyDetails: { states: [{ code: "KA" }], districts: [], blocks: [] },
    });
  });

  it("removes a block chip via handleBlocksChange", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const value: PlanDetailsValue = {
      ...baseValue,
      geographyDetails: {
        states: [{ code: "KA" }],
        districts: [{ code: "D1", stateCode: "KA" }],
        blocks: [{ code: "B1", districtCode: "D1", stateCode: "KA" }],
      },
    };
    render(<PlanDetailsStep value={value} onChange={onChange} projectGeography={projectGeography} />);

    await user.click(screen.getByRole("button", { name: /Remove B1/i }));

    expect(onChange).toHaveBeenCalledWith({
      ...value,
      geographyDetails: { ...value.geographyDetails, blocks: [] },
    });
  });

  it("removes a sector chip, clearing sectorCodes", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const value: PlanDetailsValue = { ...baseValue, sectorCodes: ["SOLAR"] };
    render(<PlanDetailsStep value={value} onChange={onChange} projectGeography={projectGeography} />);

    await user.click(screen.getByRole("button", { name: /Remove SOLAR/i }));

    expect(onChange).toHaveBeenCalledWith({ ...value, sectorCodes: [] });
  });
});
