import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

interface BotState {
  botId: string | null;
  botStatus: "idle" | "loading" | "succeeded" | "failed";
}

const initialState: BotState = {
  botId: null,
  botStatus: "idle",
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
  },
});

export const { setBotId, clearBotId, setBotStatus } = botSlice.actions;
export default botSlice.reducer;
