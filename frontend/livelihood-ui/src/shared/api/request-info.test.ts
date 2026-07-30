import { describe, expect, it } from "vitest";
import { createRequestInfo } from "./request-info";

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
