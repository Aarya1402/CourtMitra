import { configureStore } from "@reduxjs/toolkit";
import botReducer from "./botSlice";
import chatReducer from "./chatSlice";
import documentReducer from "./documentSlicer";

export const store = configureStore({
  reducer: {
    bot: botReducer,
    chat: chatReducer,
    document: documentReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
