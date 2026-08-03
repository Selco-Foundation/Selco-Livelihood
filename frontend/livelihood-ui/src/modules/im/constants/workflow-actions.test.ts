/**
 * Unit tests for the workflow-actions constants module.
 *
 * These tests cover the small set of pure, side-effect-free helper functions
 * that gate and describe IM (Issue Management) workflow actions:
 * `isSupportedWorkflowAction`, `getWorkflowActionConfig`, and
 * `isQuotationRequiredAction`. Since the module under test has no external
 * dependencies (no network, no React, no i18n), no mocking, providers, or
 * wrappers are needed here -- the functions are exercised directly against
 * known-good, known-bad, and edge-case action strings and asserted against
 * plain data (booleans, config objects, null).
 */
import { describe, expect, it } from "vitest";
import {
  getWorkflowActionConfig,
  isQuotationRequiredAction,
  isSupportedWorkflowAction,
} from "./workflow-actions";

// isSupportedWorkflowAction is a type guard backed by SUPPORTED_WORKFLOW_ACTION_SET:
// it takes any string and returns whether it is one of the nine recognized
// workflow action codes (e.g. RESOLVE, DECLINE, REASSIGN...). Downstream code
// relies on this to safely narrow an arbitrary string into SupportedWorkflowAction.
describe("isSupportedWorkflowAction", () => {
  it("returns true for a known action", () => {
    expect(isSupportedWorkflowAction("RESOLVE")).toBe(true);
  });

  it("returns false for an unknown action", () => {
    expect(isSupportedWorkflowAction("MADE_UP_ACTION")).toBe(false);
  });
});

// getWorkflowActionConfig looks up the WorkflowActionConfig (comment/documents
// requirements, and optional reasonMaster) for a given action string, first
// validating it via isSupportedWorkflowAction. Unsupported input yields null
// rather than throwing or returning a partial/undefined config.
describe("getWorkflowActionConfig", () => {
  it("returns the config for a supported action", () => {
    expect(getWorkflowActionConfig("OUT_OF_WARRANTY")).toEqual({
      comment: "optional",
      documents: "required",
    });
  });

  // DECLINE_POC is the only action configured with a reasonMaster
  // ("RejectReasons"), which the UI uses to source its reject-reason dropdown --
  // this pins that the field is present and correctly populated, not just the
  // comment/documents flags shared by every other action.
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

// isQuotationRequiredAction flags the two actions (OUT_OF_WARRANTY,
// REVISE_QUOTATION) that require a quotation document to be attached before
// the workflow action can proceed; every other action returns false.
describe("isQuotationRequiredAction", () => {
  it("returns true for OUT_OF_WARRANTY and REVISE_QUOTATION", () => {
    expect(isQuotationRequiredAction("OUT_OF_WARRANTY")).toBe(true);
    expect(isQuotationRequiredAction("REVISE_QUOTATION")).toBe(true);
  });

  it("returns false for other actions", () => {
    expect(isQuotationRequiredAction("RESOLVE")).toBe(false);
  });
});
