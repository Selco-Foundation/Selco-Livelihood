import { describe, expect, it, vi, beforeEach } from "vitest";
import { apiClient } from "./client";
import { getConfigString } from "../config/global-config";
import { loginUser, logoutUser, resetPasswordWithOtp, sendPasswordResetOtp } from "./auth";

vi.mock("./client", () => ({
  apiClient: { post: vi.fn(), get: vi.fn() },
}));
vi.mock("../config/global-config", () => ({
  getConfigString: vi.fn(),
}));

describe("loginUser", () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
    vi.mocked(getConfigString).mockReset();
  });

  it("posts url-encoded credentials with a Basic auth header from getConfigString", async () => {
    vi.mocked(getConfigString).mockReturnValue("custom-basic-token");
    vi.mocked(apiClient.post).mockResolvedValue({ data: { access_token: "tok-1" } });

    const result = await loginUser({ username: "u1", password: "p1", tenantId: "tenant-1" });

    expect(getConfigString).toHaveBeenCalledWith("JWT_TOKEN", "ZWdvdi11c2VyLWNsaWVudDo=");
    const [url, body, config] = vi.mocked(apiClient.post).mock.calls[0];
    expect(url).toBe("/user/oauth/token");
    expect(body).toBeInstanceOf(URLSearchParams);
    expect((body as URLSearchParams).toString()).toBe(
      new URLSearchParams({
        username: "u1",
        password: "p1",
        tenantId: "tenant-1",
        userType: "EMPLOYEE",
        scope: "read",
        grant_type: "password",
      }).toString(),
    );
    expect(config).toEqual({
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: "Basic custom-basic-token",
      },
    });
    expect(result).toEqual({ access_token: "tok-1" });
  });
});

describe("sendPasswordResetOtp", () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
  });

  it("posts the OTP request for password reset with tenantId as a param", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} });

    await sendPasswordResetOtp({ mobileNumber: "9999999999", tenantId: "tenant-1" });

    expect(apiClient.post).toHaveBeenCalledWith(
      "/user-otp/v1/_send",
      {
        otp: {
          mobileNumber: "9999999999",
          userType: "EMPLOYEE",
          type: "passwordreset",
          tenantId: "tenant-1",
        },
      },
      { params: { tenantId: "tenant-1" } },
    );
  });
});

describe("logoutUser", () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
  });

  it("posts RequestInfo and access_token, with tenantId as a param", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} });

    await logoutUser("token-1", "tenant-1");

    expect(apiClient.post).toHaveBeenCalledWith(
      "/user/_logout",
      {
        RequestInfo: expect.objectContaining({ apiId: "Rainmaker", authToken: "token-1" }),
        access_token: "token-1",
      },
      { params: { tenantId: "tenant-1" } },
    );
  });
});

describe("resetPasswordWithOtp", () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
  });

  it("posts the payload spread with type EMPLOYEE, tenantId as a param", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} });
    const payload = {
      userName: "user1",
      newPassword: "newpass",
      confirmPassword: "newpass",
      otpReference: "ref-1",
      tenantId: "tenant-1",
    };

    await resetPasswordWithOtp(payload);

    expect(apiClient.post).toHaveBeenCalledWith(
      "/user/password/nologin/_update",
      { ...payload, type: "EMPLOYEE" },
      { params: { tenantId: "tenant-1" } },
    );
  });
});
