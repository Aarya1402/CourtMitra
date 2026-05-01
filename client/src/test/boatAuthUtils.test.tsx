import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";
import { checkAndCreateBot } from "../utils/botAuthUtils";
import { store } from "../store";
import { setBotId, setBotStatus } from "../store/botSlice";

vi.mock("axios");

// 🔥 Mock store
vi.mock("../store", () => ({
  store: {
    getState: vi.fn(),
    dispatch: vi.fn(),
  },
}));

describe("checkAndCreateBot", () => {
  const mockedAxios = axios as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ✅ 1. Early return if bot already exists
  it("returns existing botId without API call", async () => {
    (store.getState as any).mockReturnValue({
      bot: { botId: "existing-bot" },
    });

    const result = await checkAndCreateBot();

    expect(result).toBe("existing-bot");
    expect(mockedAxios).not.toHaveBeenCalled();
  });

  // ✅ 2. Bot exists from API
  it("uses existing bot from API", async () => {
    (store.getState as any).mockReturnValue({
      bot: { botId: null },
    });

    mockedAxios.mockResolvedValueOnce({
      data: { bots: [{ id: 123 }] },
    });

    const result = await checkAndCreateBot();

    expect(result).toBe("123");
    expect(store.dispatch).toHaveBeenCalledWith(setBotId("123"));
    expect(store.dispatch).toHaveBeenCalledWith(setBotStatus("succeeded"));
  });

  // ✅ 3. No bots → create new bot
  it("creates new bot when none exist", async () => {
    (store.getState as any).mockReturnValue({
      bot: { botId: null },
    });

    mockedAxios
      .mockResolvedValueOnce({
        data: { bots: [] }, // list call
      })
      .mockResolvedValueOnce({
        data: { bot_id: "999" }, // create call
      });

    const result = await checkAndCreateBot();

    expect(result).toBe("999");
    expect(store.dispatch).toHaveBeenCalledWith(setBotId("999"));
    expect(store.dispatch).toHaveBeenCalledWith(setBotStatus("succeeded"));
  });

  // ❌ 4. API failure
  it("handles API error and sets status failed", async () => {
    (store.getState as any).mockReturnValue({
      bot: { botId: null },
    });

    mockedAxios.mockRejectedValueOnce(new Error("API failed"));

    await expect(checkAndCreateBot()).rejects.toThrow("API failed");

    expect(store.dispatch).toHaveBeenCalledWith(setBotStatus("failed"));
  });

  // ⚠️ 5. Edge: missing bot_id
  it("throws error if bot_id is missing", async () => {
    (store.getState as any).mockReturnValue({
      bot: { botId: null },
    });

    mockedAxios
      .mockResolvedValueOnce({
        data: { bots: [] },
      })
      .mockResolvedValueOnce({
        data: {}, // ❌ missing bot_id
      });

    await expect(checkAndCreateBot()).rejects.toThrow();

    expect(store.dispatch).toHaveBeenCalledWith(setBotStatus("failed"));
  });
});
