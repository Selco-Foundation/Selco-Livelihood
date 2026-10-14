import { describe, expect, it, vi, beforeEach } from "vitest";
import { apiClient } from "./client";
import { changePasswordInSession, searchCurrentUser, updateUserProfile } from "./user-profile";

vi.mock("./client", () => ({
  apiClient: { post: vi.fn(), get: vi.fn() },
}));

describe("searchCurrentUser", () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
  });

  it("posts a uuid-array search with pageSize 100", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { user: [] } });
    const user = { uuid: "u1", name: "Reviewer" };

    await searchCurrentUser("u1", "tenant-1", "token-1", user);

    expect(apiClient.post).toHaveBeenCalledWith("/user/_search", {
      RequestInfo: expect.objectContaining({
        apiId: "Rainmaker",
        authToken: "token-1",
        userInfo: user,
      }),
      tenantId: "tenant-1",
      uuid: ["u1"],
      pageSize: "100",
    });
  });

  it("returns the first user when present", async () => {
    const profile = { uuid: "u1", userName: "user1" };
    vi.mocked(apiClient.post).mockResolvedValue({ data: { user: [profile] } });

    const result = await searchCurrentUser("u1", "tenant-1", "token-1");

    expect(result).toBe(profile);
  });

  it("returns null when the response has no users", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { user: [] } });

    const result = await searchCurrentUser("u1", "tenant-1", "token-1");

    expect(result).toBeNull();
  });

  it("returns null when the user field is absent", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} });

    const result = await searchCurrentUser("u1", "tenant-1", "token-1");

    expect(result).toBeNull();
  });
});

describe("updateUserProfile", () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
  });

  it("posts the profile under user, with tenantId as a param", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { user: [] } });
    const profile = { uuid: "u1", name: "Updated Name" };

    await updateUserProfile(profile, "tenant-1", "token-1");

    expect(apiClient.post).toHaveBeenCalledWith(
      "/user/profile/_update",
      {
        RequestInfo: expect.objectContaining({ apiId: "Rainmaker", authToken: "token-1" }),
        user: profile,
      },
      { params: { tenantId: "tenant-1" } },
    );
  });

  it("returns the first updated user, or null when absent", async () => {
    const updated = { uuid: "u1", name: "Updated Name" };
    vi.mocked(apiClient.post).mockResolvedValue({ data: { user: [updated] } });

    const result = await updateUserProfile(updated, "tenant-1", "token-1");

    expect(result).toBe(updated);

    vi.mocked(apiClient.post).mockResolvedValue({ data: {} });
    const nullResult = await updateUserProfile(updated, "tenant-1", "token-1");

    expect(nullResult).toBeNull();
  });
});

describe("changePasswordInSession", () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
  });

  it("posts the payload spread with type EMPLOYEE, tenantId as a param", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} });
    const payload = {
      existingPassword: "old",
      newPassword: "new",
      confirmPassword: "new",
      username: "user1",
      tenantId: "tenant-1",
    };

    await changePasswordInSession(payload, "token-1");

    expect(apiClient.post).toHaveBeenCalledWith(
      "/user/password/_update",
      {
        RequestInfo: expect.objectContaining({ apiId: "Rainmaker", authToken: "token-1" }),
        ...payload,
        type: "EMPLOYEE",
      },
      { params: { tenantId: "tenant-1" } },
    );
  });
});
