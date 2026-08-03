/**
 * Unit tests for `extractApiErrorMessage` (src/shared/api/errors.ts).
 *
 * `extractApiErrorMessage` is a pure function with no side effects or external
 * dependencies: it safely reaches into an unknown-shaped error/exception object
 * (typically an Axios-style error) and pulls out the most relevant human-readable
 * message. It never throws even when the input isn't an object or is missing the
 * expected `response.data` shape, since it optional-chains its way through the
 * structure and falls back to `undefined`.
 *
 * Because the function is pure and synchronous, these tests need no mocking,
 * fixtures, or wrappers/providers -- each case just builds a plain object
 * (or non-object) shaped like a possible error, calls the function directly,
 * and asserts on the returned string/undefined.
 *
 * Precedence under test (matches the `??` fallback chain in the source):
 *   1. `response.data.Errors[0].message` -- only used when `Errors` is an array.
 *   2. `response.data.error.fields[0].message` -- only used when `fields` is an array.
 *   3. `response.data.error.message` -- final fallback.
 *   4. `undefined` -- when none of the above resolve to a message.
 */
import { describe, expect, it } from "vitest";
import { extractApiErrorMessage } from "./errors";

// Covers extractApiErrorMessage's full fallback chain: Errors[] -> error.fields[] ->
// error.message -> undefined, including the "present but not an array" edge cases
// that must be skipped over via Array.isArray guards rather than throwing.
describe("extractApiErrorMessage", () => {
  it("returns undefined when the error has no response shape", () => {
    expect(extractApiErrorMessage(new Error("network error"))).toBeUndefined();
  });

  // The function casts `error` to an object shape without checking its type first,
  // so a non-object input must not throw -- optional chaining should just bottom
  // out at undefined.
  it("returns undefined for a plain non-object error", () => {
    expect(extractApiErrorMessage("some string")).toBeUndefined();
  });

  // Errors[] takes priority over error.message even when both are present.
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

  // With no Errors[] on data at all, the chain moves to the second fallback:
  // error.fields[0].message.
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
