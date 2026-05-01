import reducer, {
  setBotId,
  clearBotId,
  setBotStatus,
  setLanguageForThread,
} from "../store/botSlice";
import { describe, it, expect, beforeEach, vi } from "vitest";
import type { BotState } from "../store/botSlice";

/* ================= MOCK localStorage ================= */

const mockSetItem = vi.fn();

vi.stubGlobal("localStorage", {
  setItem: mockSetItem,
});

/* ================= TESTS ================= */

describe("botSlice (100% coverage)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ✅ initial state
  it("returns initial state", () => {
    const state = reducer(undefined, { type: "unknown" });

    expect(state).toEqual({
      botId: null,
      botStatus: "idle",
      languageByThread: {},
    });
  });

  // ✅ setBotId
  it("sets botId", () => {
    const state = reducer(undefined, setBotId("123"));

    expect(state.botId).toBe("123");
  });

  // ✅ clearBotId
  it("clears botId", () => {
    const state = reducer(
      {
        botId: "123",
        botStatus: "idle",
        languageByThread: {},
      },
      clearBotId()
    );

    expect(state.botId).toBeNull();
  });

  // ✅ setBotStatus
  it("sets botStatus", () => {
    const state = reducer(undefined, setBotStatus("loading"));

    expect(state.botStatus).toBe("loading");
  });

  // ✅ setLanguageForThread
  it("sets language and stores in localStorage", () => {
    const state = reducer(
      undefined,
      setLanguageForThread({
        threadId: "thread-1",
        language: "en-US",
      })
    );

    expect(state.languageByThread["thread-1"]).toBe("en-US");

    // 🔥 critical assertion (covers side effect)
    expect(mockSetItem).toHaveBeenCalledWith("thread-1", "en-US");
  });

  // ✅ overwrite existing language
  it("overwrites existing thread language", () => {
    const initialState: BotState = {
      botId: null,
      botStatus: "idle",
      languageByThread: {
        "thread-1": "gu-IN",
      },
    };

    const state = reducer(
      initialState,
      setLanguageForThread({
        threadId: "thread-1",
        language: "en-US",
      })
    );

    expect(state.languageByThread["thread-1"]).toBe("en-US");

    expect(mockSetItem).toHaveBeenCalledWith("thread-1", "en-US");
  });
});
