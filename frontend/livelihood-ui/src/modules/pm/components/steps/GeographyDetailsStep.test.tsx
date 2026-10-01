import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "@/ui";
import { useBoundaryTree } from "../../hooks/use-boundary-tree";
import type { GeographyDetails } from "../../types/project";
import { GeographyDetailsStep, isGeographyDetailsValid } from "./GeographyDetailsStep";

vi.mock("../../hooks/use-boundary-tree", () => ({ useBoundaryTree: vi.fn() }));

vi.mock("@/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/ui")>();
  return { ...actual, toast: { info: vi.fn(), success: vi.fn(), error: vi.fn(), warning: vi.fn() } };
});

const hierarchy = {
  states: [{ code: "KA", name: "Karnataka" }, { code: "AS", name: "Assam" }],
  districts: [{ code: "D1", name: "D1", stateCode: "KA" }, { code: "D2", name: "D2", stateCode: "AS" }],
  blocks: [{ code: "B1", name: "B1", districtCode: "D1", stateCode: "KA" }],
};

beforeEach(() => {
  Element.prototype.hasPointerCapture = Element.prototype.hasPointerCapture ?? (() => false);
  Element.prototype.setPointerCapture = Element.prototype.setPointerCapture ?? (() => {});
  Element.prototype.releasePointerCapture = Element.prototype.releasePointerCapture ?? (() => {});
  Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? (() => {});
  vi.mocked(useBoundaryTree).mockReturnValue({ data: hierarchy, isLoading: false } as never);
  vi.mocked(toast.info).mockClear();
});

describe("isGeographyDetailsValid", () => {
  it("requires at least one state and one block", () => {
    expect(isGeographyDetailsValid({ states: [{ code: "KA" }], blocks: [{ code: "B1", districtCode: "D1", stateCode: "KA" }] })).toBe(true);
    expect(isGeographyDetailsValid({ states: [], blocks: [] })).toBe(false);
    expect(isGeographyDetailsValid({ states: [{ code: "KA" }] })).toBe(false);
  });
});

describe("GeographyDetailsStep", () => {
  it("selecting a state adds it, with districts disabled until a state is chosen", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const emptyValue: GeographyDetails = {};
    render(<GeographyDetailsStep value={emptyValue} onChange={onChange} />);

    expect(screen.getByRole("button", { name: /District\(s\)/i })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: /^State/i }));
    await user.click(screen.getByText("Karnataka"));

    expect(onChange).toHaveBeenCalledWith({ states: [{ code: "KA" }], districts: [], blocks: [] });
  });

  it("narrows district options to the selected state's children", async () => {
    const user = userEvent.setup();
    render(
      <GeographyDetailsStep value={{ states: [{ code: "KA" }] }} onChange={vi.fn()} />,
    );

    await user.click(screen.getByRole("button", { name: /District\(s\)/i }));

    expect(screen.getByText("D1")).toBeInTheDocument();
    expect(screen.queryByText("D2")).not.toBeInTheDocument();
  });

  it("warns via toast.info when deselecting a state removes districts/blocks under it", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <GeographyDetailsStep
        value={{
          states: [{ code: "KA" }],
          districts: [{ code: "D1", stateCode: "KA" }],
          blocks: [{ code: "B1", districtCode: "D1", stateCode: "KA" }],
        }}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: /^State/i }));
    const statePopover = screen.getByRole("dialog");
    await user.click(within(statePopover).getByText("Karnataka"));

    expect(toast.info).toHaveBeenCalled();
    expect(onChange).toHaveBeenCalledWith({ states: [], districts: [], blocks: [] });
  });

  it("does not warn when deselecting a state that has no districts/blocks under it", async () => {
    const user = userEvent.setup();
    render(
      <GeographyDetailsStep value={{ states: [{ code: "KA" }] }} onChange={vi.fn()} />,
    );

    await user.click(screen.getByRole("button", { name: /^State/i }));
    const statePopover = screen.getByRole("dialog");
    await user.click(within(statePopover).getByText("Karnataka"));

    expect(toast.info).not.toHaveBeenCalled();
  });

  it("shows the selected chips in the summary panel and removes one via its remove button", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<GeographyDetailsStep value={{ states: [{ code: "KA" }] }} onChange={onChange} />);

    const summary = screen.getByText("Selected").closest("div")!.parentElement!;
    expect(within(summary).getByText("Karnataka")).toBeInTheDocument();

    await user.click(within(summary).getByRole("button", { name: /Remove Karnataka/i }));

    expect(onChange).toHaveBeenCalledWith({ states: [], districts: [], blocks: [] });
  });
});
