import { describe, expect, it } from "vitest";
import { createRequestInfo } from "./request-info";

describe("createRequestInfo", () => {
  it("returns only apiId when no accessToken or user is provided", () => {
    expect(createRequestInfo()).toEqual({ apiId: "Rainmaker" });
  });

  it("includes authToken when accessToken is provided", () => {
    expect(createRequestInfo("token-1")).toEqual({
      apiId: "Rainmaker",
      authToken: "token-1",
    });
  });

  it("includes userInfo when a user is provided", () => {
    const user = { uuid: "u1", name: "Reviewer" };

    expect(createRequestInfo(undefined, user)).toEqual({
      apiId: "Rainmaker",
      userInfo: user,
    });
  });

  it("includes both authToken and userInfo when both are provided", () => {
    const user = { uuid: "u1", name: "Reviewer" };

    expect(createRequestInfo("token-1", user)).toEqual({
      apiId: "Rainmaker",
      authToken: "token-1",
      userInfo: user,
    });
  });

  it("omits userInfo when user is explicitly null", () => {
    expect(createRequestInfo("token-1", null)).toEqual({
      apiId: "Rainmaker",
      authToken: "token-1",
    });
  });
});
