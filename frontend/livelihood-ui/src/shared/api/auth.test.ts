import { afterEach, describe, expect, it, vi } from "vitest";
import { mockAxiosSuccess } from "@/test/mocks/api-responses";
import { apiClient } from "./client";
import { loginUser, logoutUser, resetPasswordWithOtp, sendPasswordResetOtp } from "./auth";

afterEach(() => {
  vi.restoreAllMocks();
  window.globalConfigs = { getConfig: () => undefined };
});

describe("loginUser", () => {
  it("builds a form-encoded body with the fixed employee grant fields", async () => {
    const postSpy = vi
      .spyOn(apiClient, "post")
      .mockReturnValue(mockAxiosSuccess({ access_token: "token-1" }));

    await loginUser({ username: "u", password: "p", tenantId: "livelihood" });

    const [, body] = postSpy.mock.calls[0];
    expect(body).toBeInstanceOf(URLSearchParams);
    const params = body as URLSearchParams;
    expect(params.get("username")).toBe("u");
    expect(params.get("password")).toBe("p");
    expect(params.get("tenantId")).toBe("livelihood");
    expect(params.get("userType")).toBe("EMPLOYEE");
    expect(params.get("scope")).toBe("read");
    expect(params.get("grant_type")).toBe("password");
  });

  it("sends a Basic auth header built from the configured JWT token, falling back to the default", async () => {
    const postSpy = vi
      .spyOn(apiClient, "post")
      .mockReturnValue(mockAxiosSuccess({ access_token: "token-1" }));

    await loginUser({ username: "u", password: "p", tenantId: "livelihood" });

    const [, , config] = postSpy.mock.calls[0];
    expect(config?.headers?.Authorization).toBe("Basic ZWdvdi11c2VyLWNsaWVudDo=");
  });

  it("uses a configured JWT_TOKEN when global config provides one", async () => {
    window.globalConfigs = {
      getConfig: (key) => (key === "JWT_TOKEN" ? "Q3VzdG9tVG9rZW4=" : undefined),
    };
    const postSpy = vi
      .spyOn(apiClient, "post")
      .mockReturnValue(mockAxiosSuccess({ access_token: "token-1" }));

    await loginUser({ username: "u", password: "p", tenantId: "livelihood" });

    const [, , config] = postSpy.mock.calls[0];
    expect(config?.headers?.Authorization).toBe("Basic Q3VzdG9tVG9rZW4=");
  });

  it("returns the response data", async () => {
    vi.spyOn(apiClient, "post").mockReturnValue(mockAxiosSuccess({ access_token: "token-1" }));
    const result = await loginUser({ username: "u", password: "p", tenantId: "livelihood" });
    expect(result).toEqual({ access_token: "token-1" });
  });
});

describe("sendPasswordResetOtp", () => {
  it("posts the OTP request with the mobile number and tenantId", async () => {
    const postSpy = vi.spyOn(apiClient, "post").mockReturnValue(mockAxiosSuccess(undefined));

    await sendPasswordResetOtp({ mobileNumber: "9999999999", tenantId: "livelihood" });

    expect(postSpy).toHaveBeenCalledWith(
      "/user-otp/v1/_send",
      expect.objectContaining({
        otp: expect.objectContaining({ mobileNumber: "9999999999", tenantId: "livelihood" }),
      }),
      expect.objectContaining({ params: { tenantId: "livelihood" } }),
    );
  });
});

describe("logoutUser", () => {
  it("posts the access token to the logout endpoint", async () => {
    const postSpy = vi.spyOn(apiClient, "post").mockReturnValue(mockAxiosSuccess(undefined));

    await logoutUser("token-1", "livelihood");

    expect(postSpy).toHaveBeenCalledWith(
      "/user/_logout",
      expect.objectContaining({ access_token: "token-1" }),
      expect.objectContaining({ params: { tenantId: "livelihood" } }),
    );
  });
});

describe("resetPasswordWithOtp", () => {
  it("posts the reset payload with a fixed EMPLOYEE type", async () => {
    const postSpy = vi.spyOn(apiClient, "post").mockReturnValue(mockAxiosSuccess(undefined));

    await resetPasswordWithOtp({
      userName: "u",
      newPassword: "n",
      confirmPassword: "n",
      otpReference: "otp-ref",
      tenantId: "livelihood",
    });

    expect(postSpy).toHaveBeenCalledWith(
      "/user/password/nologin/_update",
      expect.objectContaining({ userName: "u", type: "EMPLOYEE" }),
      expect.objectContaining({ params: { tenantId: "livelihood" } }),
    );
  });
});
