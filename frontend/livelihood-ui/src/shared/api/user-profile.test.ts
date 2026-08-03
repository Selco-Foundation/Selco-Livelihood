/**
 * Unit tests for `searchCurrentUser`, `updateUserProfile`, and `changePasswordInSession`
 * (src/shared/api/user-profile.ts).
 *
 * `searchCurrentUser` queries the user service to find a user by UUID and returns
 * the first match or null. `updateUserProfile` POSTs updated profile fields and
 * returns the first user from the response or null. `changePasswordInSession`
 * POSTs a password-change payload (existing + new password) with a fixed type:
 * "EMPLOYEE". All three functions include RequestInfo in their payloads and
 * pass tenantId/accessToken as needed.
 *
 * Mocking strategy: `apiClient.post` is spied on with `vi.spyOn` and stubbed
 * via `mockAxiosSuccess` so no real HTTP call is made. Tests verify correct
 * endpoint URLs, request payloads, and null fallback behavior when the response
 * has no user or is incomplete. No providers/wrappers needed since these are
 * plain async data-fetching functions.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { mockAxiosSuccess } from "@/test/mocks/api-responses";
import { apiClient } from "./client";
import { changePasswordInSession, searchCurrentUser, updateUserProfile } from "./user-profile";

afterEach(() => {
  vi.restoreAllMocks();
});

// searchCurrentUser(uuid, tenantId, accessToken, user?) queries the user
// service and returns the first user from the response, or null if the
// user array is empty or absent.
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

// updateUserProfile(profile, tenantId, accessToken, user?) POSTs the profile
// object and returns the first user from the response, or null if the user
// array is absent or empty.
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

// changePasswordInSession(payload, accessToken, user?) POSTs a password-change
// request with the payload fields plus a fixed type: "EMPLOYEE", and returns void.
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
