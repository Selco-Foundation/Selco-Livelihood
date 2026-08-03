/**
 * Unit tests for the cn utility function (className merger).
 *
 * Covers: cn() — joins and deduplicates CSS class strings, merging conflicting Tailwind utilities.
 * Testing approach: Direct unit tests of the pure utility function (clsx + twMerge).
 * No mocks or providers needed.
 */
import { describe, expect, it } from "vitest";
import { cn } from "./utils";

/**
 * cn: Utility that combines class strings and conditionally applies classes.
 * Combines clsx (conditional class filtering) with twMerge (Tailwind conflict resolution).
 * Inputs: variadic ClassValue[] (strings, booleans, objects, arrays). Drops falsy values and
 * merges conflicting Tailwind utilities, keeping the last/most-specific variant.
 */
describe("cn", () => {
  it("joins multiple class strings", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("drops falsy/conditional class inputs", () => {
    expect(cn("foo", false && "bar", undefined, null, "baz")).toBe("foo baz");
  });

  it("merges conflicting Tailwind utility classes, keeping the last one", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("supports object-form conditional classes", () => {
    expect(cn({ foo: true, bar: false })).toBe("foo");
  });
});
