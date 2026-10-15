import { describe, expect, it } from "vitest";
import { componentTypeLabel } from "./component-type";

describe("componentTypeLabel", () => {
  it("builds the ES_IR_COMPONENT_TYPE_<CODE> key from the component type", () => {
    const t = (key: string) => (key === "ES_IR_COMPONENT_TYPE_MACHINE" ? "Machine" : key);
    expect(componentTypeLabel("MACHINE", t)).toBe("Machine");
  });

  it("falls back to the raw component type when no translation is staged", () => {
    const t = (key: string) => key;
    expect(componentTypeLabel("SOLAR", t)).toBe("SOLAR");
  });

  it("works for a code beyond the known MACHINE/SOLAR pair, since the key is MDMS-driven", () => {
    const t = (key: string) => (key === "ES_IR_COMPONENT_TYPE_HYBRID" ? "Hybrid" : key);
    expect(componentTypeLabel("HYBRID", t)).toBe("Hybrid");
  });

  it("returns a dash when componentType is undefined", () => {
    const t = (key: string) => key;
    expect(componentTypeLabel(undefined, t)).toBe("-");
  });
});
