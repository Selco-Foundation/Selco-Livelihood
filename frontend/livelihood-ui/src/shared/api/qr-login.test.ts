import { describe, expect, it, vi, beforeEach } from "vitest";
import { apiClient } from "./client";
import { resolveQrLogin } from "./qr-login";

vi.mock("./client", () => ({
  apiClient: { post: vi.fn(), get: vi.fn() },
}));

describe("resolveQrLogin", () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
  });

  it("posts tenantId/facilityId with a livelihood-qr-otp RequestInfo", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { userName: "user1" } });

    await resolveQrLogin({ tenantId: "tenant-1", facilityId: "facility-1" });

    const [url, body] = vi.mocked(apiClient.post).mock.calls[0];
    expect(url).toBe("/asset-registry/v1/asset/qr/_resolve");
    expect(body).toEqual({
      RequestInfo: {
        apiId: "livelihood-qr-otp",
        ver: "1.0",
        ts: 0,
        action: "RESOLVE",
        msgId: expect.stringMatching(/^qr-resolve-\d+$/),
      },
      tenantId: "tenant-1",
      facilityId: "facility-1",
    });
  });

  it("returns the raw response data unmodified", async () => {
    const responseData = { userName: "user1", mobileNumber: "9999999999", facilityId: "facility-1" };
    vi.mocked(apiClient.post).mockResolvedValue({ data: responseData });

    const result = await resolveQrLogin({ tenantId: "tenant-1", facilityId: "facility-1" });

    expect(result).toBe(responseData);
  });
});
