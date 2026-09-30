import { describe, expect, it } from "vitest";
import { cn } from "./utils";

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
