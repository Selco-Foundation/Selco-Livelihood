import { describe, expect, it, vi, beforeEach } from "vitest";
import { apiClient } from "@/shared";
import { searchIncidentById } from "./incident-details";

vi.mock("@/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared")>();
  return {
    ...actual,
    apiClient: { post: vi.fn(), get: vi.fn() },
  };
});

describe("searchIncidentById", () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
  });

  it("posts with tenantId and incidentId as params", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { IncidentWrappers: [] } });

    await searchIncidentById("tenant-1", "incident-1", "token-1");

    expect(apiClient.post).toHaveBeenCalledWith(
      "/im-services/v2/request/_search",
      {
        RequestInfo: expect.objectContaining({ apiId: "Rainmaker", authToken: "token-1" }),
      },
      { params: { tenantId: "tenant-1", incidentId: "incident-1" } },
    );
  });

  it("includes userInfo in RequestInfo when a user is provided, omits it otherwise", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { IncidentWrappers: [] } });
    const user = { uuid: "u1", name: "Reviewer" };

    await searchIncidentById("tenant-1", "incident-1", "token-1", user);
    const withUserBody = vi.mocked(apiClient.post).mock.calls[0][1] as {
      RequestInfo: Record<string, unknown>;
    };
    expect(withUserBody.RequestInfo).toEqual(expect.objectContaining({ userInfo: user }));

    vi.mocked(apiClient.post).mockClear();
    await searchIncidentById("tenant-1", "incident-1", "token-1");
    const withoutUserBody = vi.mocked(apiClient.post).mock.calls[0][1] as {
      RequestInfo: Record<string, unknown>;
    };
    expect(withoutUserBody.RequestInfo).not.toHaveProperty("userInfo");
  });

  it("returns the raw response data unmodified", async () => {
    const responseData = { IncidentWrappers: [{ incident: { incidentId: "incident-1" } }] };
    vi.mocked(apiClient.post).mockResolvedValue({ data: responseData });

    const result = await searchIncidentById("tenant-1", "incident-1", "token-1");

    expect(result).toEqual(responseData);
    expect(result).toBe(responseData);
  });
});
