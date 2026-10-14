import { describe, expect, it } from "vitest";

import { MACHINE_MEDIA_GROUPS, REVIEW_SECTION_LABELS, SOLAR_SECTION_IDS } from "./review";

describe("REVIEW_SECTION_LABELS", () => {
  it("has a non-empty labelKey and label for every solar and machine section id", () => {
    for (const id of [...SOLAR_SECTION_IDS, "MACHINE" as const]) {
      const entry = REVIEW_SECTION_LABELS[id];
      expect(entry.labelKey).toBeTruthy();
      expect(entry.label).toBeTruthy();
    }
  });
});

describe("MACHINE_MEDIA_GROUPS", () => {
  it("has a unique id for every group", () => {
    const ids = MACHINE_MEDIA_GROUPS.map((group) => group.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("uses an already-uppercase id, since asset-mapping matches it against an upper-cased documentType", () => {
    for (const group of MACHINE_MEDIA_GROUPS) {
      expect(group.id).toBe(group.id.toUpperCase());
    }
  });

  it("only uses kinds that asset-mapping's IMAGE/VIDEO branch understands", () => {
    for (const group of MACHINE_MEDIA_GROUPS) {
      expect(["IMAGE", "VIDEO"]).toContain(group.kind);
    }
  });
});
