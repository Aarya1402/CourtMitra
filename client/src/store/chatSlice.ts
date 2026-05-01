import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
interface Message {
  id: string;
  text: string;
  sender: "user" | "bot";
  threadId?: string;
}

export interface ChatState {
  messages: Message[];
  loading: boolean;
}

const initialState: ChatState = {
  messages: [],
  loading: false,
};

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    addUserMessage: (
      state,
      action: PayloadAction<{ id?: string; text: string; threadId?: string }>
    ) => {
      state.messages.push({
        id: action.payload.id || Date.now().toString(),
        text: action.payload.text,
        sender: "user",
        threadId: action.payload.threadId,
      });
    },

    addBotMessage: (
      state,
      action: PayloadAction<{ id?: string; text: string; threadId?: string }>
    ) => {
      state.messages.push({
        id: action.payload.id || Date.now().toString(),
        text: action.payload.text,
        sender: "bot",
        threadId: action.payload.threadId,
      });
    },

    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setMessagesForThread: (
      state,
      action: PayloadAction<{
        threadId?: string;
        messages: {
          id?: string;
          text: string;
          sender: "user" | "bot";
          threadId?: string;
        }[];
      }>
    ) => {
      const { threadId, messages } = action.payload;

      state.messages = state.messages.filter((m) => m.threadId !== threadId);
      const crypto = globalThis.crypto;
      const array = new Uint32Array(1);
      const randomValue = crypto.getRandomValues(array);

      const formatted = messages.map((msg) => ({
        id: msg.id || `${Date.now()}-${randomValue}`,
        text: msg.text,
        sender: msg.sender,
        threadId: msg.threadId,
      }));

      state.messages.push(...formatted);
    },
    prependMessagesForThread: (
      state,
      action: PayloadAction<{
        threadId?: string;
        messages: {
          id?: string;
          text: string;
          sender: "user" | "bot";
          threadId?: string;
        }[];
      }>
    ) => {
      const { messages } = action.payload;

      const crypto = globalThis.crypto;
      const array = new Uint32Array(1);
      const randomValue = crypto.getRandomValues(array);

      const formatted = messages.map((msg) => ({
        id: msg.id || `${Date.now()}-${randomValue}`,
        text: msg.text,
        sender: msg.sender,
        threadId: msg.threadId,
      }));

      state.messages.unshift(...formatted);
    },
    deleteMessage: (state, action: PayloadAction<string>) => {
      state.messages = state.messages.filter((m) => m.id !== action.payload);
    },
    updateBotMessage: (state, action) => {
      const { id, text, threadId } = action.payload;

      const msg = state.messages.find(
        (m) => m.id === id && m.threadId === threadId && m.sender === "bot"
      );

      if (msg) {
        msg.text = text;
      }
    },
  },
});

export const {
  addUserMessage,
  addBotMessage,
  setLoading,
  setMessagesForThread,
  prependMessagesForThread,
  deleteMessage,
  updateBotMessage,
} = chatSlice.actions;

export default chatSlice.reducer;
