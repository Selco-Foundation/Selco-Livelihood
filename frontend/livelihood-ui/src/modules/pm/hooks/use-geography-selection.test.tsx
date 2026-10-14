import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GeographyDetails } from "../types/project";
import { useBoundaryTree } from "./use-boundary-tree";
import { useGeographySelection } from "./use-geography-selection";

vi.mock("./use-boundary-tree", () => ({ useBoundaryTree: vi.fn() }));

const hierarchy = {
  states: [{ code: "KA", name: "KA" }, { code: "AS", name: "AS" }],
  districts: [
    { code: "D1", name: "D1", stateCode: "KA" },
    { code: "D2", name: "D2", stateCode: "AS" },
  ],
  blocks: [
    { code: "B1", name: "B1", districtCode: "D1", stateCode: "KA" },
    { code: "B2", name: "B2", districtCode: "D1", stateCode: "KA" },
    { code: "B3", name: "B3", districtCode: "D2", stateCode: "AS" },
  ],
};

// How field-planner reads a plan back: bare codes, parent codes blank.
const storedPlanGeography: GeographyDetails = {
  states: [{ code: "KA" }, { code: "AS" }],
  districts: [{ code: "D1", stateCode: "" }, { code: "D2", stateCode: "" }],
  blocks: [
    { code: "B1", districtCode: "", stateCode: "" },
    { code: "B2", districtCode: "", stateCode: "" },
    { code: "B3", districtCode: "", stateCode: "" },
  ],
};

function setup(options: Partial<Parameters<typeof useGeographySelection>[0]> = {}) {
  const onChange = vi.fn();
  const { result } = renderHook(() =>
    useGeographySelection({ value: storedPlanGeography, onChange, ...options }),
  );
  return { result, onChange };
}

beforeEach(() => {
  vi.mocked(useBoundaryTree).mockReturnValue({ data: hierarchy, isLoading: false } as never);
});

describe("useGeographySelection", () => {
  it("cascades a state removal using the boundary tree, not the stored parent codes", () => {
    const { result, onChange } = setup();

    result.current.states.onChange(["KA"]);

    expect(onChange).toHaveBeenCalledWith({
      states: [{ code: "KA" }],
      districts: [{ code: "D1", stateCode: "KA" }],
      blocks: [
        { code: "B1", districtCode: "D1", stateCode: "KA" },
        { code: "B2", districtCode: "D1", stateCode: "KA" },
      ],
    });
  });

  it("keeps a locked code a caller tried to drop", () => {
    const { result, onChange } = setup({ locked: new Map([["B1", "in scope"]]) });

    result.current.blocks.onChange(["B3"]);

    const blocks = onChange.mock.calls[0][0].blocks.map((block: { code: string }) => block.code);
    expect(blocks).toEqual(["B1", "B3"]);
  });

  it("reports a cascading removal but not a plain block removal", () => {
    const onCascadeRemoval = vi.fn();
    const { result } = setup({ onCascadeRemoval });

    result.current.blocks.onChange(["B1", "B3"]);
    expect(onCascadeRemoval).not.toHaveBeenCalled();

    result.current.districts.onChange(["D2"]);
    expect(onCascadeRemoval).toHaveBeenCalledTimes(1);
  });

  it("only offers allowed codes", () => {
    const { result } = setup({
      allowed: { states: [{ code: "KA" }], districts: [{ code: "D1", stateCode: "KA" }], blocks: [{ code: "B1", districtCode: "D1", stateCode: "KA" }] },
    });

    expect(result.current.states.options.map((state) => state.code)).toEqual(["KA"]);
    expect(result.current.blocks.options.map((block) => block.code)).toEqual(["B1"]);
  });
});
