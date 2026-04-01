import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

interface BotState {
  botId: string | null;
  botStatus: "idle" | "loading" | "succeeded" | "failed";
  languageByThread: Record<string, string>;
}

const initialState: BotState = {
  botId: null,
  botStatus: "idle",
  languageByThread: {},
};

const botSlice = createSlice({
  name: "bot",
  initialState,
  reducers: {
    setBotId: (state, action: PayloadAction<string>) => {
      state.botId = action.payload;
    },
    clearBotId: (state) => {
      state.botId = null;
    },
    setBotStatus: (state, action: PayloadAction<BotState["botStatus"]>) => {
      state.botStatus = action.payload;
    },
    setLanguageForThread: (
      state,
      action: PayloadAction<{ threadId: string; language: string }>
    ) => {
      state.languageByThread[action.payload.threadId] = action.payload.language;
    },
  },
});

export const { setBotId, clearBotId, setBotStatus, setLanguageForThread } =
  botSlice.actions;
export default botSlice.reducer;
