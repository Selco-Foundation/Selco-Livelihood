import { describe, expect, it, vi } from "vitest";
import { formatStatusLabel } from "./status-label";

describe("formatStatusLabel", () => {
  it("uses the ES_PM_STATUS_<code> key for a code without an override", () => {
    const t = vi.fn((key: string) => (key === "ES_PM_STATUS_PUBLISHED" ? "Published" : key));
    expect(formatStatusLabel(t, "PUBLISHED")).toBe("Published");
  });

  it("uses the overridden key for SCHEDULED", () => {
    const t = vi.fn((key: string) => (key === "ES_PM_SCHEDULED" ? "Scheduled" : key));
    expect(formatStatusLabel(t, "SCHEDULED")).toBe("Scheduled");
  });

  it("uses the overridden key for DRAFT", () => {
    const t = vi.fn((key: string) => (key === "ES_PM_DRAFT" ? "Draft" : key));
    expect(formatStatusLabel(t, "DRAFT")).toBe("Draft");
  });

  it("falls back to a Title Case humanized string when no translation exists", () => {
    const t = vi.fn((key: string) => key);
    expect(formatStatusLabel(t, "ASSIGNED_TO_FIELD_STAFF")).toBe("Assigned To Field Staff");
  });

  it("defaults the code to DRAFT when omitted", () => {
    const t = vi.fn((key: string) => key);
    expect(formatStatusLabel(t)).toBe("Draft");
  });
});
