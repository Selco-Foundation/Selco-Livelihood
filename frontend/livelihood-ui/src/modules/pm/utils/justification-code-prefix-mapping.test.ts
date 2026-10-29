import { describe, expect, it } from "vitest";
import { FALLBACK_JUSTIFICATION_CODE_PREFIX, mapJustificationCodePrefix } from "./justification-code-prefix-mapping";

describe("mapJustificationCodePrefix", () => {
  it("returns the active row's prefix", () => {
    const masters = { JustificationCodePrefix: [{ code: "JUS", prefix: "JUS", active: true }] };
    expect(mapJustificationCodePrefix(masters)).toBe("JUS");
  });

  it("treats a row with no explicit active flag as active", () => {
    const masters = { JustificationCodePrefix: [{ code: "JUS", prefix: "JUS" }] };
    expect(mapJustificationCodePrefix(masters)).toBe("JUS");
  });

  it("skips an inactive row and falls back to the default", () => {
    const masters = { JustificationCodePrefix: [{ code: "JUS", prefix: "JUS", active: false }] };
    expect(mapJustificationCodePrefix(masters)).toBe(FALLBACK_JUSTIFICATION_CODE_PREFIX);
  });

  it("falls back to the default when the master is empty", () => {
    expect(mapJustificationCodePrefix({ JustificationCodePrefix: [] })).toBe(FALLBACK_JUSTIFICATION_CODE_PREFIX);
  });

  it("falls back to the default when the master is missing entirely", () => {
    expect(mapJustificationCodePrefix({})).toBe(FALLBACK_JUSTIFICATION_CODE_PREFIX);
  });

  it("falls back to the default when the master isn't an array", () => {
    expect(mapJustificationCodePrefix({ JustificationCodePrefix: "JUS" as never })).toBe(
      FALLBACK_JUSTIFICATION_CODE_PREFIX,
    );
  });

  it("skips null, non-object and non-string-prefix rows, taking the first renderable one", () => {
    expect(
      mapJustificationCodePrefix({
        JustificationCodePrefix: [null, "JUS", { prefix: 42 }, { prefix: "" }, { prefix: "ABC", active: true }],
      }),
    ).toBe("ABC");
  });
});
