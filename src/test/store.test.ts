import { describe, it, expect } from "vitest";
import chatReducer, {
  addUserMessage,
  addBotMessage,
  setLoading,
  setMessagesForThread,
  prependMessagesForThread,
  deleteMessage,
  updateBotMessage,
} from "../store/chatSlice";
import botReducer, {
  setBotId,
  clearBotId,
  setBotStatus,
  setLanguageForThread,
} from "../store/botSlice";
import documentReducer, { setDocumentIds } from "../store/documentSlicer";

describe("Redux Slices", () => {
  describe("chatSlice", () => {
    const initialState = {
      messages: [],
      loading: false,
    };

    it("should handle initial state", () => {
      expect(chatReducer(undefined, { type: "unknown" })).toEqual(initialState);
    });

    it("should handle addUserMessage", () => {
      const state = chatReducer(initialState, addUserMessage({ text: "Hello", threadId: "t1" }));
      expect(state.messages).toHaveLength(1);
      expect(state.messages[0]).toMatchObject({
        text: "Hello",
        sender: "user",
        threadId: "t1",
      });
      expect(state.messages[0].id).toBeDefined();
    });

    it("should handle addBotMessage with explicit ID", () => {
      const state = chatReducer(initialState, addBotMessage({ id: "b1", text: "Hi", threadId: "t1" }));
      expect(state.messages).toHaveLength(1);
      expect(state.messages[0]).toMatchObject({
        id: "b1",
        text: "Hi",
        sender: "bot",
        threadId: "t1",
      });
    });

    it("should handle addBotMessage without ID", () => {
        const state = chatReducer(initialState, addBotMessage({ text: "Hi", threadId: "t1" }));
        expect(state.messages[0].id).toBeDefined();
    });

    it("should handle setLoading", () => {
      const state = chatReducer(initialState, setLoading(true));
      expect(state.loading).toBe(true);
    });

    it("should handle setMessagesForThread", () => {
      const existingState = {
        messages: [
          { id: "1", text: "Old", sender: "user" as const, threadId: "t1" },
          { id: "2", text: "Other", sender: "user" as const, threadId: "t2" },
        ],
        loading: false,
      };
      const newMessages = [
        { text: "New 1", sender: "user" as const, threadId: "t1" }, // No ID
        { id: "m2", text: "New 2", sender: "bot" as const, threadId: "t1" },
      ];
      const state = chatReducer(existingState, setMessagesForThread({ threadId: "t1", messages: newMessages }));
      
      const t1Messages = state.messages.filter(m => m.threadId === "t1");
      expect(t1Messages).toHaveLength(2);
      expect(t1Messages[0].id).toBeDefined();
      expect(t1Messages[1].id).toBe("m2");
      expect(state.messages.find(m => m.id === "2")).toBeDefined();
    });

    it("should handle prependMessagesForThread", () => {
      const existingState = {
        messages: [{ id: "2", text: "Existing", sender: "user" as const, threadId: "t1" }],
        loading: false,
      };
      const newMessages = [{ text: "Prepended", sender: "bot" as const, threadId: "t1" }];
      const state = chatReducer(existingState, prependMessagesForThread({ threadId: "t1", messages: newMessages }));
      
      expect(state.messages).toHaveLength(2);
      expect(state.messages[0].id).toBeDefined();
      expect(state.messages[1].text).toBe("Existing");
    });

    it("should handle deleteMessage", () => {
      const existingState = {
        messages: [{ id: "1", text: "To Delete", sender: "user" as const }],
        loading: false,
      };
      const state = chatReducer(existingState, deleteMessage("1"));
      expect(state.messages).toHaveLength(0);
    });

    it("should handle updateBotMessage", () => {
      const existingState = {
        messages: [{ id: "1", text: "Initial", sender: "bot" as const, threadId: "t1" }],
        loading: false,
      };
      const state = chatReducer(existingState, updateBotMessage({ id: "1", text: "Updated", threadId: "t1" }));
      expect(state.messages[0].text).toBe("Updated");
    });

    it("should not update if message mismatch in updateBotMessage", () => {
        const existingState = {
          messages: [{ id: "1", text: "Initial", sender: "bot" as const, threadId: "t1" }],
          loading: false,
        };
        // Wrong ID
        let state = chatReducer(existingState, updateBotMessage({ id: "2", text: "Updated", threadId: "t1" }));
        expect(state.messages[0].text).toBe("Initial");
        
        // Wrong threadId
        state = chatReducer(existingState, updateBotMessage({ id: "1", text: "Updated", threadId: "t2" }));
        expect(state.messages[0].text).toBe("Initial");
        
        // Wrong sender
        const userState = {
            messages: [{ id: "1", text: "Initial", sender: "user" as const, threadId: "t1" }],
            loading: false,
        };
        state = chatReducer(userState, updateBotMessage({ id: "1", text: "Updated", threadId: "t1" }));
        expect(state.messages[0].text).toBe("Initial");
      });
  });

  describe("botSlice", () => {
    const initialState = {
      botId: null,
      botStatus: "idle" as const,
      languageByThread: {},
    };

    it("should handle initial state", () => {
      expect(botReducer(undefined, { type: "unknown" })).toEqual(initialState);
    });

    it("should handle setBotId", () => {
      const state = botReducer(initialState, setBotId("bot-123"));
      expect(state.botId).toBe("bot-123");
    });

    it("should handle clearBotId", () => {
      const state = botReducer({ ...initialState, botId: "123" }, clearBotId());
      expect(state.botId).toBeNull();
    });

    it("should handle setBotStatus", () => {
      const state = botReducer(initialState, setBotStatus("succeeded"));
      expect(state.botStatus).toBe("succeeded");
    });

    it("should handle setLanguageForThread", () => {
      const state = botReducer(initialState, setLanguageForThread({ threadId: "t1", language: "hi-IN" }));
      expect(state.languageByThread["t1"]).toBe("hi-IN");
      expect(localStorage.getItem("t1")).toBe("hi-IN");
    });
  });

  describe("documentSlice", () => {
    const initialState = {
      documentsByThread: {},
    };

    it("should handle initial state", () => {
      expect(documentReducer(undefined, { type: "unknown" })).toEqual(initialState);
    });

    it("should handle setDocumentIds", () => {
      const state = documentReducer(initialState, setDocumentIds({ threadId: "t1", documentIds: [1, 2] }));
      expect(state.documentsByThread["t1"]).toEqual([1, 2]);
    });
  });
});
