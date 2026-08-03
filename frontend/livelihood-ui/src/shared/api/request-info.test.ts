/**
 * Unit tests for `createRequestInfo` (src/shared/api/request-info.ts).
 *
 * `createRequestInfo` is a pure utility that builds a RequestInfo object for
 * API calls. It always includes apiId: "Rainmaker". It conditionally includes
 * authToken (only when accessToken is provided) and userInfo (only when a user
 * object is provided and not null). Missing keys are omitted entirely rather
 * than set to undefined, allowing callers to spread the result cleanly into
 * request payloads without polluting the body with null/undefined fields.
 *
 * Testing approach: Pure function, no side effects or external dependencies.
 * Tests verify the conditional presence/absence of authToken and userInfo keys,
 * the correct apiId value, and that spreading the result never introduces
 * unwanted undefined fields.
 */
import { describe, expect, it } from "vitest";
import { createRequestInfo } from "./request-info";

// createRequestInfo(accessToken?, user?) returns { apiId: "Rainmaker", ... }
// with authToken included only when accessToken is provided, and userInfo
// included only when user is provided and not null.
describe("createRequestInfo", () => {
  it("always includes apiId", () => {
    expect(createRequestInfo()).toEqual({ apiId: "Rainmaker" });
  });

  it("omits the authToken key entirely when no access token is given", () => {
    const result = createRequestInfo();
    expect(Object.hasOwn(result, "authToken")).toBe(false);
  });

  it("includes authToken when an access token is given", () => {
    expect(createRequestInfo("token-123")).toEqual({
      apiId: "Rainmaker",
      authToken: "token-123",
    });
  });

  it("omits the userInfo key entirely when no user is given", () => {
    const result = createRequestInfo("token-123");
    expect(Object.hasOwn(result, "userInfo")).toBe(false);
  });

  it("omits userInfo when user is explicitly null", () => {
    const result = createRequestInfo("token-123", null);
    expect(Object.hasOwn(result, "userInfo")).toBe(false);
  });

  it("includes userInfo when a user is given", () => {
    const user = { uuid: "u1", name: "Test" };
    expect(createRequestInfo("token-123", user)).toEqual({
      apiId: "Rainmaker",
      authToken: "token-123",
      userInfo: user,
    });
  });
});
