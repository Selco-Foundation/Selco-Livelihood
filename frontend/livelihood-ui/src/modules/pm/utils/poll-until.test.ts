import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { pollUntil, waitUntilSaved } from "./poll-until";

beforeEach(() => void vi.useFakeTimers());
afterEach(() => void vi.useRealTimers());

describe("pollUntil", () => {
  it("returns at once when the first read is done", async () => {
    const read = vi.fn().mockResolvedValue(1);
    expect(await pollUntil(read, () => true)).toBe(1);
    expect(read).toHaveBeenCalledTimes(1);
  });

  it("reads again until done", async () => {
    const read = vi.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(2).mockResolvedValue(3);
    const result = pollUntil(read, (value) => value === 3);
    await vi.runAllTimersAsync();
    expect(await result).toBe(3);
    expect(read).toHaveBeenCalledTimes(3);
  });

  it("gives up after the attempts with the last value", async () => {
    const read = vi.fn().mockResolvedValue(1);
    const result = pollUntil(read, () => false, { attempts: 4 });
    await vi.runAllTimersAsync();
    expect(await result).toBe(1);
    expect(read).toHaveBeenCalledTimes(4);
  });
});

describe("waitUntilSaved", () => {
  it("does not fail an accepted save when the read fails", async () => {
    await expect(waitUntilSaved(() => Promise.reject(new Error("down")), () => true)).resolves.toBeUndefined();
  });
});
