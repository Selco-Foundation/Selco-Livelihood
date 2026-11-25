import { describe, expect, it } from "vitest";
import { MAX_WORKFLOW_COMMENT_LENGTH, reworkCharactersLeft, toReworkComment } from "./rework";

describe("reworkCharactersLeft", () => {
  it("counts the whole comment as sent, so quotes and line breaks count as escaped", () => {
    const plain = [{ reason: "OTHERS", comment: "ab" }];
    expect(reworkCharactersLeft(plain)).toBe(MAX_WORKFLOW_COMMENT_LENGTH - '[{"reason":"OTHERS","comment":"ab"}]'.length);
    expect(reworkCharactersLeft([{ reason: "OTHERS", comment: '"\n' }])).toBe(reworkCharactersLeft(plain) - 2);
  });

  it("is zero when the comment is exactly full and negative past it", () => {
    const empty = toReworkComment([{ reason: "OTHERS", comment: "" }]).length;
    const full = "x".repeat(MAX_WORKFLOW_COMMENT_LENGTH - empty);
    expect(reworkCharactersLeft([{ reason: "OTHERS", comment: full }])).toBe(0);
    expect(reworkCharactersLeft([{ reason: "OTHERS", comment: `${full}x` }])).toBe(-1);
  });
});
