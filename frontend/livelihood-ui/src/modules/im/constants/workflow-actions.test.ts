import { describe, expect, it } from "vitest";
import {
  getWorkflowActionConfig,
  isQuotationRequiredAction,
  isSupportedWorkflowAction,
} from "./workflow-actions";

describe("isSupportedWorkflowAction", () => {
  it("returns true for a known action", () => {
    expect(isSupportedWorkflowAction("RESOLVE")).toBe(true);
  });

  it("returns false for an unknown action", () => {
    expect(isSupportedWorkflowAction("MADE_UP_ACTION")).toBe(false);
  });
});

describe("getWorkflowActionConfig", () => {
  it("returns the config for a supported action", () => {
    expect(getWorkflowActionConfig("OUT_OF_WARRANTY")).toEqual({
      comment: "optional",
      documents: "required",
    });
  });

  it("returns the reasonMaster for DECLINE_POC", () => {
    expect(getWorkflowActionConfig("DECLINE_POC")).toEqual({
      comment: "optional",
      documents: "none",
      reasonMaster: "RejectReasons",
    });
  });

  it("returns null for an unsupported action", () => {
    expect(getWorkflowActionConfig("MADE_UP_ACTION")).toBeNull();
  });
});

describe("isQuotationRequiredAction", () => {
  it("returns true for OUT_OF_WARRANTY and REVISE_QUOTATION", () => {
    expect(isQuotationRequiredAction("OUT_OF_WARRANTY")).toBe(true);
    expect(isQuotationRequiredAction("REVISE_QUOTATION")).toBe(true);
  });

  it("returns false for other actions", () => {
    expect(isQuotationRequiredAction("RESOLVE")).toBe(false);
  });
});
