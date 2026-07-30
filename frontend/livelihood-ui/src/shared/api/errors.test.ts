import { describe, expect, it } from "vitest";
import { extractApiErrorMessage } from "./errors";

describe("extractApiErrorMessage", () => {
  it("returns undefined when the error has no response shape", () => {
    expect(extractApiErrorMessage(new Error("network error"))).toBeUndefined();
  });

  it("returns undefined for a plain non-object error", () => {
    expect(extractApiErrorMessage("some string")).toBeUndefined();
  });

  it("prefers the first Errors[] message when present", () => {
    const error = {
      response: {
        data: {
          Errors: [{ message: "errors-array-message" }],
          error: { message: "fallback-message" },
        },
      },
    };
    expect(extractApiErrorMessage(error)).toBe("errors-array-message");
  });

  it("falls back to error.fields[0].message when Errors is absent", () => {
    const error = {
      response: {
        data: {
          error: { fields: [{ message: "fields-message" }] },
        },
      },
    };
    expect(extractApiErrorMessage(error)).toBe("fields-message");
  });

  it("falls back to error.message when Errors and fields are both absent", () => {
    const error = {
      response: {
        data: {
          error: { message: "top-level-message" },
        },
      },
    };
    expect(extractApiErrorMessage(error)).toBe("top-level-message");
  });

  it("falls through to error.message when Errors is present but not an array", () => {
    const error = {
      response: {
        data: {
          Errors: "not-an-array",
          error: { message: "should-not-be-reached" },
        },
      },
    };
    expect(extractApiErrorMessage(error)).toBe("should-not-be-reached");
  });

  it("returns undefined when Errors is an empty array and no other fallback exists", () => {
    const error = { response: { data: { Errors: [] } } };
    expect(extractApiErrorMessage(error)).toBeUndefined();
  });

  it("returns undefined when fields is present but not an array", () => {
    const error = {
      response: { data: { error: { fields: "not-an-array", message: "msg" } } },
    };
    expect(extractApiErrorMessage(error)).toBe("msg");
  });
});
