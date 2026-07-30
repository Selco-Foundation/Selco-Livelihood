import { afterEach, describe, expect, it, vi } from "vitest";
import { mockAxiosSuccess } from "@/test/mocks/api-responses";
import { apiClient } from "./client";
import { resolveQrLogin } from "./qr-login";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("resolveQrLogin", () => {
  it("posts the tenantId/facilityId and returns the resolved user data", async () => {
    const postSpy = vi
      .spyOn(apiClient, "post")
      .mockReturnValue(mockAxiosSuccess({ userName: "poc.user", mobileNumber: "9999999999" }));

    const result = await resolveQrLogin({ tenantId: "livelihood", facilityId: "fac-1" });

    expect(result).toEqual({ userName: "poc.user", mobileNumber: "9999999999" });
    expect(postSpy).toHaveBeenCalledWith(
      "/asset-registry/v1/asset/qr/_resolve",
      expect.objectContaining({
        tenantId: "livelihood",
        facilityId: "fac-1",
        RequestInfo: expect.objectContaining({ action: "RESOLVE" }),
      }),
    );
  });
});
