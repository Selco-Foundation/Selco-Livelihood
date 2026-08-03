/**
 * Unit tests for `resolveQrLogin` (src/shared/api/qr-login.ts).
 *
 * `resolveQrLogin` calls the asset-registry service's QR code resolution endpoint,
 * posting a tenantId and facilityId with a fixed RequestInfo shape, and returns
 * the resolved user data (userName, mobileNumber, and optional fields like
 * userUuid, facilityBoundaryCode, etc.).
 *
 * Mocking strategy: `apiClient.post` is spied on with `vi.spyOn` and stubbed
 * via `mockAxiosSuccess` so no real HTTP call is made. The test verifies the
 * correct endpoint URL, request payload shape (including the fixed RequestInfo
 * action: "RESOLVE"), and return value. No providers/wrappers needed since this
 * is a plain async data-fetching function.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { mockAxiosSuccess } from "@/test/mocks/api-responses";
import { apiClient } from "./client";
import { resolveQrLogin } from "./qr-login";

afterEach(() => {
  vi.restoreAllMocks();
});

// resolveQrLogin(params) posts a QR resolution request with tenantId and
// facilityId, along with a fixed RequestInfo with action: "RESOLVE", and
// returns the resolved user data from the response.
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
