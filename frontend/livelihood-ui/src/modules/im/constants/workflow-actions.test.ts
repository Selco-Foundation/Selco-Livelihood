import { describe, expect, it } from "vitest";

import {
  SUPPORTED_WORKFLOW_ACTIONS,
  WORKFLOW_ACTION_CONFIG,
  getWorkflowActionConfig,
  isQuotationRequiredAction,
  isSupportedWorkflowAction,
} from "./workflow-actions";

describe("isSupportedWorkflowAction", () => {
  it.each(SUPPORTED_WORKFLOW_ACTIONS)("returns true for %s", (action) => {
    expect(isSupportedWorkflowAction(action)).toBe(true);
  });

  it("returns false for an unknown action", () => {
    expect(isSupportedWorkflowAction("NOT_A_REAL_ACTION")).toBe(false);
  });

  it("returns false for a lowercase variant of a real action", () => {
    expect(isSupportedWorkflowAction("resolve")).toBe(false);
  });

  it("returns false for an empty string", () => {
    expect(isSupportedWorkflowAction("")).toBe(false);
  });
});

describe("getWorkflowActionConfig", () => {
  it.each(SUPPORTED_WORKFLOW_ACTIONS)("returns the exact config entry for %s", (action) => {
    expect(getWorkflowActionConfig(action)).toBe(WORKFLOW_ACTION_CONFIG[action]);
  });

  it("returns null for an unsupported action", () => {
    expect(getWorkflowActionConfig("NOT_A_REAL_ACTION")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(getWorkflowActionConfig("")).toBeNull();
  });
});

describe("WORKFLOW_ACTION_CONFIG", () => {
  it("has an entry for every supported action, with a valid comment/documents combination", () => {
    for (const action of SUPPORTED_WORKFLOW_ACTIONS) {
      const config = WORKFLOW_ACTION_CONFIG[action];
      expect(["required", "optional"]).toContain(config.comment);
      expect(["required", "optional", "none"]).toContain(config.documents);
    }
  });

  it("only sets requiresVendorAssignee for ASSIGN_VENDOR", () => {
    for (const action of SUPPORTED_WORKFLOW_ACTIONS) {
      const config = WORKFLOW_ACTION_CONFIG[action];
      if (action === "ASSIGN_VENDOR") {
        expect(config.requiresVendorAssignee).toBe(true);
      } else {
        expect(config.requiresVendorAssignee).toBeFalsy();
      }
    }
  });

  it("only sets reasonMaster to a recognized master, and only where actually configured", () => {
    expect(WORKFLOW_ACTION_CONFIG.DECLINE_POC.reasonMaster).toBe("RejectReasons");
    for (const action of SUPPORTED_WORKFLOW_ACTIONS) {
      if (action === "DECLINE_POC") continue;
      expect(WORKFLOW_ACTION_CONFIG[action].reasonMaster).toBeUndefined();
    }
  });
});

describe("isQuotationRequiredAction", () => {
  it.each(["OUT_OF_WARRANTY", "REVISE_QUOTATION"])("returns true for %s", (action) => {
    expect(isQuotationRequiredAction(action)).toBe(true);
  });

  it.each(
    SUPPORTED_WORKFLOW_ACTIONS.filter(
      (action) => action !== "OUT_OF_WARRANTY" && action !== "REVISE_QUOTATION",
    ),
  )("returns false for %s", (action) => {
    expect(isQuotationRequiredAction(action)).toBe(false);
  });

  it("returns false for an unsupported action", () => {
    expect(isQuotationRequiredAction("NOT_A_REAL_ACTION")).toBe(false);
  });
});
