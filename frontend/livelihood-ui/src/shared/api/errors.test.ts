import { describe, expect, it } from "vitest";
import { extractApiErrorMessage } from "./errors";

describe("extractApiErrorMessage", () => {
  it("returns the first message from response.data.Errors when present", () => {
    const error = {
      response: { data: { Errors: [{ message: "first error" }, { message: "second error" }] } },
    };

    expect(extractApiErrorMessage(error)).toBe("first error");
  });

  it("falls back to the first response.data.error.fields message when Errors is absent", () => {
    const error = {
      response: {
        data: { error: { message: "generic message", fields: [{ message: "field error" }] } },
      },
    };

    expect(extractApiErrorMessage(error)).toBe("field error");
  });

  it("falls back to response.data.error.message when Errors and fields are both absent", () => {
    const error = { response: { data: { error: { message: "generic message" } } } };

    expect(extractApiErrorMessage(error)).toBe("generic message");
  });

  it("prefers Errors over error.fields and error.message when multiple shapes are present", () => {
    const error = {
      response: {
        data: {
          Errors: [{ message: "errors-array message" }],
          error: { message: "generic message", fields: [{ message: "field error" }] },
        },
      },
    };

    expect(extractApiErrorMessage(error)).toBe("errors-array message");
  });

  it("falls through to error.message when Errors is present but empty", () => {
    const error = {
      response: { data: { Errors: [], error: { message: "generic message" } } },
    };

    expect(extractApiErrorMessage(error)).toBe("generic message");
  });

  it("ignores error.fields when it isn't an array", () => {
    const error = {
      response: {
        data: { error: { message: "generic message", fields: "not-an-array" } },
      },
    };

    expect(extractApiErrorMessage(error)).toBe("generic message");
  });

  it("returns undefined when there is no response at all (e.g. a network error)", () => {
    expect(extractApiErrorMessage(new Error("Network Error"))).toBeUndefined();
  });

  it("returns undefined when response.data has none of the recognized shapes", () => {
    const error = { response: { data: {} } };

    expect(extractApiErrorMessage(error)).toBeUndefined();
  });

  it("returns undefined for a nullish error", () => {
    expect(extractApiErrorMessage(undefined)).toBeUndefined();
    expect(extractApiErrorMessage(null)).toBeUndefined();
  });
});
