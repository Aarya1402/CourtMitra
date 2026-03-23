import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

interface DocumentState {
  documentsByThread: {
    [threadId: string]: number[];
  };
}

const initialState: DocumentState = {
  documentsByThread: {},
};

const documentSlice = createSlice({
  name: "document",
  initialState,
  reducers: {
    setDocumentIds: (
      state,
      action: PayloadAction<{ threadId: string; documentIds: number[] }>,
    ) => {
      state.documentsByThread[action.payload.threadId] =
        action.payload.documentIds; 
    },
  },
});

export const { setDocumentIds } = documentSlice.actions;
export default documentSlice.reducer;
