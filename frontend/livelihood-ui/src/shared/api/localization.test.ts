import { afterEach, describe, expect, it, vi } from "vitest";
import { mockAxiosSuccess } from "@/test/mocks/api-responses";
import { apiClient } from "./client";
import { fetchLocalization, messagesToResourceMap } from "./localization";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("messagesToResourceMap", () => {
  it("reduces messages into a code -> message record", () => {
    expect(
      messagesToResourceMap([
        { code: "A", message: "Alpha" },
        { code: "B", message: "Beta" },
      ]),
    ).toEqual({ A: "Alpha", B: "Beta" });
  });

  it("returns an empty object for an empty list", () => {
    expect(messagesToResourceMap([])).toEqual({});
  });

  it("last message wins when codes collide", () => {
    expect(
      messagesToResourceMap([
        { code: "A", message: "First" },
        { code: "A", message: "Second" },
      ]),
    ).toEqual({ A: "Second" });
  });
});

describe("fetchLocalization", () => {
  it("returns an empty object without calling the API when modules is empty", async () => {
    const postSpy = vi.spyOn(apiClient, "post");

    const result = await fetchLocalization({ locale: "en_IN", tenantId: "livelihood", modules: [] });

    expect(result).toEqual({});
    expect(postSpy).not.toHaveBeenCalled();
  });

  it("calls the localization endpoint and maps the returned messages", async () => {
    const postSpy = vi
      .spyOn(apiClient, "post")
      .mockReturnValue(mockAxiosSuccess({ messages: [{ code: "A", message: "Alpha" }] }));

    const result = await fetchLocalization({
      locale: "en_IN",
      tenantId: "livelihood",
      modules: ["rainmaker-common"],
    });

    expect(result).toEqual({ A: "Alpha" });
    expect(postSpy).toHaveBeenCalledWith(
      "/localization/messages/v1/_search",
      expect.objectContaining({ RequestInfo: expect.objectContaining({ apiId: "Rainmaker" }) }),
      expect.objectContaining({
        params: expect.objectContaining({
          module: "rainmaker-common",
          locale: "en_IN",
          tenantId: "livelihood",
        }),
      }),
    );
  });

  it("joins multiple module names with a comma", async () => {
    const postSpy = vi.spyOn(apiClient, "post").mockReturnValue(mockAxiosSuccess({ messages: [] }));

    await fetchLocalization({
      locale: "en_IN",
      tenantId: "livelihood",
      modules: ["rainmaker-common", "rainmaker-im"],
    });

    expect(postSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        params: expect.objectContaining({ module: "rainmaker-common,rainmaker-im" }),
      }),
    );
  });

  it("falls back to an empty object when the response has no messages", async () => {
    vi.spyOn(apiClient, "post").mockReturnValue(mockAxiosSuccess({}));

    const result = await fetchLocalization({
      locale: "en_IN",
      tenantId: "livelihood",
      modules: ["rainmaker-common"],
    });

    expect(result).toEqual({});
  });
});
