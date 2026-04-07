import reducer, {
  addUserMessage,
  addBotMessage,
  setLoading,
  setMessagesForThread,
  prependMessagesForThread,
  deleteMessage,
  updateBotMessage,
} from "../store/chatSlice";
import type { ChatState } from "../store/chatSlice";
import { describe, it, expect, beforeEach, vi } from "vitest";

describe("chatSlice (100% coverage)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ✅ initial state
  it("returns initial state", () => {
    const state = reducer(undefined, { type: "unknown" });

    expect(state).toEqual({
      messages: [],
      loading: false,
    });
  });

  // ✅ addUserMessage
  it("adds user message with provided id", () => {
    const state = reducer(
      undefined,
      addUserMessage({ id: "1", text: "hello", threadId: "t1" })
    );

    expect(state.messages[0]).toEqual({
      id: "1",
      text: "hello",
      sender: "user",
      threadId: "t1",
    });
  });

  // ✅ addUserMessage fallback id
  it("adds user message with generated id", () => {
    vi.spyOn(Date, "now").mockReturnValue(1000);

    const state = reducer(undefined, addUserMessage({ text: "hello" }));

    expect(state.messages[0].id).toBe("1000");
  });

  // ✅ addBotMessage
  it("adds bot message", () => {
    const state = reducer(
      undefined,
      addBotMessage({ id: "2", text: "hi", threadId: "t1" })
    );

    expect(state.messages[0]).toEqual({
      id: "2",
      text: "hi",
      sender: "bot",
      threadId: "t1",
    });
  });

  // ✅ setLoading
  it("sets loading", () => {
    const state = reducer(undefined, setLoading(true));
    expect(state.loading).toBe(true);
  });

  // ✅ setMessagesForThread replaces old thread messages
  it("replaces messages for a thread", () => {
    const initialState: ChatState = {
      messages: [
        { id: "1", text: "old", sender: "user", threadId: "t1" },
        { id: "2", text: "keep", sender: "user", threadId: "t2" },
      ],
      loading: false,
    };

    const state = reducer(
      initialState,
      setMessagesForThread({
        threadId: "t1",
        messages: [{ id: "3", text: "new", sender: "bot", threadId: "t1" }],
      })
    );

    expect(state.messages).toEqual([
      { id: "2", text: "keep", sender: "user", threadId: "t2" },
      { id: "3", text: "new", sender: "bot", threadId: "t1" },
    ]);
  });

  // ✅ setMessagesForThread fallback id
  it("generates id if missing", () => {
    vi.spyOn(Date, "now").mockReturnValue(1000);
    vi.spyOn(Math, "random").mockReturnValue(0.5);

    const state = reducer(
      undefined,
      setMessagesForThread({
        threadId: "t1",
        messages: [{ text: "hello", sender: "user" }],
      })
    );

    expect(state.messages[0].id).toContain("1000");
  });

  // ✅ prependMessagesForThread
  it("prepends messages", () => {
    const initialState: ChatState = {
      messages: [{ id: "2", text: "existing", sender: "user", threadId: "t1" }],
      loading: false,
    };

    const state = reducer(
      initialState,
      prependMessagesForThread({
        messages: [{ id: "1", text: "older", sender: "bot", threadId: "t1" }],
      })
    );

    expect(state.messages[0].id).toBe("1");
  });

  // ✅ deleteMessage
  it("deletes message", () => {
    const initialState: ChatState = {
      messages: [
        { id: "1", text: "a", sender: "user" },
        { id: "2", text: "b", sender: "bot" },
      ],
      loading: false,
    };

    const state = reducer(initialState, deleteMessage("1"));

    expect(state.messages).toHaveLength(1);
    expect(state.messages[0].id).toBe("2");
  });

  // ✅ updateBotMessage success
  it("updates bot message", () => {
    const initialState: ChatState = {
      messages: [{ id: "1", text: "old", sender: "bot", threadId: "t1" }],
      loading: false,
    };

    const state = reducer(
      initialState,
      updateBotMessage({
        id: "1",
        text: "updated",
        threadId: "t1",
      })
    );

    expect(state.messages[0].text).toBe("updated");
  });

  // ❗ updateBotMessage no match (important branch)
  it("does nothing if bot message not found", () => {
    const initialState: ChatState = {
      messages: [{ id: "1", text: "old", sender: "user", threadId: "t1" }],
      loading: false,
    };

    const state = reducer(
      initialState,
      updateBotMessage({
        id: "1",
        text: "updated",
        threadId: "t1",
      })
    );

    expect(state.messages[0].text).toBe("old"); // unchanged
  });
});
