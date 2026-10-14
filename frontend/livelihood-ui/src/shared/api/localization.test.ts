import { describe, expect, it, vi, beforeEach } from "vitest";
import { apiClient } from "./client";
import { fetchLocalization, messagesToResourceMap } from "./localization";

vi.mock("./client", () => ({
  apiClient: { post: vi.fn(), get: vi.fn() },
}));

describe("fetchLocalization", () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
  });

  it("returns an empty object without calling the API when modules is empty", async () => {
    const result = await fetchLocalization({ locale: "en_IN", tenantId: "tenant-1", modules: [] });

    expect(apiClient.post).not.toHaveBeenCalled();
    expect(result).toEqual({});
  });

  it("posts a search with a Rainmaker RequestInfo and comma-joined modules/locale/tenantId params", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { messages: [] } });

    await fetchLocalization({
      locale: "en_IN",
      tenantId: "tenant-1",
      modules: ["rainmaker-common", "rainmaker-ir"],
    });

    const [url, body, config] = vi.mocked(apiClient.post).mock.calls[0];
    expect(url).toBe("/localization/messages/v1/_search");
    expect(body).toEqual({
      RequestInfo: {
        apiId: "Rainmaker",
        msgId: expect.stringMatching(/^\d+\|en_IN$/),
      },
    });
    expect(config).toEqual({
      params: {
        module: "rainmaker-common,rainmaker-ir",
        locale: "en_IN",
        tenantId: "tenant-1",
        _: expect.any(Number),
      },
    });
  });

  it("maps response messages into a code->message record", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: {
        messages: [
          { code: "KEY_ONE", message: "One" },
          { code: "KEY_TWO", message: "Two" },
        ],
      },
    });

    const result = await fetchLocalization({
      locale: "en_IN",
      tenantId: "tenant-1",
      modules: ["rainmaker-common"],
    });

    expect(result).toEqual({ KEY_ONE: "One", KEY_TWO: "Two" });
  });

  it("returns an empty object when the response has no messages", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} });

    const result = await fetchLocalization({
      locale: "en_IN",
      tenantId: "tenant-1",
      modules: ["rainmaker-common"],
    });

    expect(result).toEqual({});
  });
});

describe("messagesToResourceMap", () => {
  it("keeps the last message for a duplicated code", () => {
    const result = messagesToResourceMap([
      { code: "KEY_ONE", message: "First" },
      { code: "KEY_ONE", message: "Second" },
    ]);

    expect(result).toEqual({ KEY_ONE: "Second" });
  });

  it("returns an empty object for an empty list", () => {
    expect(messagesToResourceMap([])).toEqual({});
  });
});
