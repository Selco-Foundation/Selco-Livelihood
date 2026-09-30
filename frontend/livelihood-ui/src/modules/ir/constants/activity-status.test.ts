import { describe, expect, it } from "vitest";

import {
  ACTIVITY_STATUS_LABELS,
  ACTIVITY_STATUS_ORDER,
  activityStatusBadgeVariant,
} from "./activity-status";
import { ACTIVITY_STATUS, type ActivityStatus } from "../types/activity-review";

const ALL_STATUSES = Object.values(ACTIVITY_STATUS) as ActivityStatus[];

describe("ACTIVITY_STATUS_ORDER", () => {
  it("contains every ActivityStatus exactly once", () => {
    expect([...ACTIVITY_STATUS_ORDER].sort()).toEqual([...ALL_STATUSES].sort());
  });
});

describe("ACTIVITY_STATUS_LABELS", () => {
  it("has a non-empty key and fallback for every ActivityStatus", () => {
    for (const status of ALL_STATUSES) {
      const label = ACTIVITY_STATUS_LABELS[status];
      expect(label.key).toBeTruthy();
      expect(label.fallback).toBeTruthy();
    }
  });
});

describe("activityStatusBadgeVariant", () => {
  it('returns "pending" for SUBMITTED_BY_FIELD_STAFF', () => {
    expect(activityStatusBadgeVariant("SUBMITTED_BY_FIELD_STAFF")).toBe("pending");
  });

  it('returns "rejected" for REJECTED_BY_QC_SPOC', () => {
    expect(activityStatusBadgeVariant("REJECTED_BY_QC_SPOC")).toBe("rejected");
  });

  it('returns "approved" for APPROVED_BY_QC_SPOC', () => {
    expect(activityStatusBadgeVariant("APPROVED_BY_QC_SPOC")).toBe("approved");
  });

  it.each(["SCHEDULED", "ASSIGNED_TO_FIELD_STAFF"] as const)(
    'returns "neutral" for %s',
    (status) => {
      expect(activityStatusBadgeVariant(status)).toBe("neutral");
    },
  );
});
