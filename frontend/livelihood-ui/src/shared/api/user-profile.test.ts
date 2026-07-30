import { afterEach, describe, expect, it, vi } from "vitest";
import { mockAxiosSuccess } from "@/test/mocks/api-responses";
import { apiClient } from "./client";
import { changePasswordInSession, searchCurrentUser, updateUserProfile } from "./user-profile";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("searchCurrentUser", () => {
  it("returns the first matching user", async () => {
    vi.spyOn(apiClient, "post").mockReturnValue(
      mockAxiosSuccess({ user: [{ uuid: "u1", name: "Test User" }] }),
    );
    const result = await searchCurrentUser("u1", "livelihood", "token");
    expect(result).toEqual({ uuid: "u1", name: "Test User" });
  });

  it("returns null when no user is found", async () => {
    vi.spyOn(apiClient, "post").mockReturnValue(mockAxiosSuccess({ user: [] }));
    const result = await searchCurrentUser("u1", "livelihood", "token");
    expect(result).toBeNull();
  });
});

describe("updateUserProfile", () => {
  it("returns the updated user profile", async () => {
    vi.spyOn(apiClient, "post").mockReturnValue(
      mockAxiosSuccess({ user: [{ uuid: "u1", name: "Updated Name" }] }),
    );
    const result = await updateUserProfile({ uuid: "u1", name: "Updated Name" }, "livelihood", "token");
    expect(result).toEqual({ uuid: "u1", name: "Updated Name" });
  });

  it("returns null when the response has no user", async () => {
    vi.spyOn(apiClient, "post").mockReturnValue(mockAxiosSuccess({}));
    const result = await updateUserProfile({ uuid: "u1" }, "livelihood", "token");
    expect(result).toBeNull();
  });
});

describe("changePasswordInSession", () => {
  it("posts the payload with a fixed EMPLOYEE type", async () => {
    const postSpy = vi.spyOn(apiClient, "post").mockReturnValue(mockAxiosSuccess(undefined));

    await changePasswordInSession(
      {
        existingPassword: "old",
        newPassword: "new",
        confirmPassword: "new",
        username: "u1",
        tenantId: "livelihood",
      },
      "token",
    );

    expect(postSpy).toHaveBeenCalledWith(
      "/user/password/_update",
      expect.objectContaining({ username: "u1", type: "EMPLOYEE" }),
      expect.objectContaining({ params: { tenantId: "livelihood" } }),
    );
  });
});
