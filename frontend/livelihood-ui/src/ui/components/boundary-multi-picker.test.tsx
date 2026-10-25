import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useBoundaryHierarchy } from "@/shared";
import { BoundaryMultiPicker } from "./boundary-multi-picker";
import { TooltipProvider } from "./ui/tooltip";

vi.mock("@/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared")>();
  return { ...actual, useBoundaryHierarchy: vi.fn() };
});

const hierarchy = {
  states: [{ code: "HP", parentCode: "INDIA" }, { code: "CG", parentCode: "INDIA" }],
  districts: [
    { code: "HP_BILASPUR", parentCode: "HP" },
    { code: "CG_RAIPUR", parentCode: "CG" },
  ],
  blocks: [
    { code: "HP_BILASPUR_GHUMARWIN", parentCode: "HP_BILASPUR" },
    { code: "CG_RAIPUR_ABHANPUR", parentCode: "CG_RAIPUR" },
  ],
};

beforeEach(() => {
  Element.prototype.hasPointerCapture = Element.prototype.hasPointerCapture ?? (() => false);
  Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? (() => {});
  vi.mocked(useBoundaryHierarchy).mockReturnValue({ data: hierarchy, isLoading: false } as never);
});

function renderPicker(value = { states: [] as string[], districts: [] as string[], blocks: [] as string[] }) {
  const onChange = vi.fn();
  render(<BoundaryMultiPicker value={value} onChange={onChange} />, { wrapper: TooltipProvider });
  return onChange;
}

describe("BoundaryMultiPicker", () => {
  it("lists the selection in the Selected panel, and removing a state there drops its children", async () => {
    const user = userEvent.setup();
    const onChange = renderPicker({
      states: ["HP", "CG"],
      districts: ["HP_BILASPUR", "CG_RAIPUR"],
      blocks: ["HP_BILASPUR_GHUMARWIN", "CG_RAIPUR_ABHANPUR"],
    });

    expect(screen.getByText("State (2)")).toBeInTheDocument();
    expect(screen.getByText("Block(s) (2)")).toBeInTheDocument();
    expect(screen.getByText("HP_BILASPUR_GHUMARWIN")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Remove HP" }));
    expect(onChange).toHaveBeenLastCalledWith({
      states: ["CG"],
      districts: ["CG_RAIPUR"],
      blocks: ["CG_RAIPUR_ABHANPUR"],
    });
  });

  it("shows the empty labels before anything is selected", () => {
    renderPicker();
    expect(screen.getByText("No state selected")).toBeInTheDocument();
    expect(screen.getByText("No block selected")).toBeInTheDocument();
  });

  it("disables District and Block until a parent is selected", () => {
    renderPicker();
    expect(screen.getByRole("button", { name: /District/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Block/ })).toBeDisabled();
  });

  it("offers only the districts of the selected state", async () => {
    const user = userEvent.setup();
    renderPicker({ states: ["CG"], districts: [], blocks: [] });
    await user.click(screen.getByRole("button", { name: /District/ }));
    const list = within(screen.getByRole("dialog"));
    expect(list.getByText("CG_RAIPUR")).toBeInTheDocument();
    expect(list.queryByText("HP_BILASPUR")).not.toBeInTheDocument();
  });

  it("drops a deselected state's districts and blocks", async () => {
    const user = userEvent.setup();
    const onChange = renderPicker({
      states: ["HP", "CG"],
      districts: ["HP_BILASPUR", "CG_RAIPUR"],
      blocks: ["HP_BILASPUR_GHUMARWIN", "CG_RAIPUR_ABHANPUR"],
    });
    await user.click(screen.getByRole("button", { name: /State/ }));
    await user.click(within(screen.getByRole("dialog")).getByText("HP"));
    expect(onChange).toHaveBeenLastCalledWith({
      states: ["CG"],
      districts: ["CG_RAIPUR"],
      blocks: ["CG_RAIPUR_ABHANPUR"],
    });
  });
});
