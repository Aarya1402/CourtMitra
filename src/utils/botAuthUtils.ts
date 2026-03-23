import axios from "axios";
import { store } from "../store";
import { setBotId, setBotStatus } from "../store/botSlice";
import { API_BASE_URL } from "../constants/api";

const API_BASE = `${API_BASE_URL}/api/talkument`;

export async function checkAndCreateBot() {
  // Avoid redundant calls if bot is already known
  const currentBotId = store.getState().bot.botId;
  if (currentBotId) return currentBotId;

  store.dispatch(setBotStatus("loading"));

  try {
    // 1. List bots to see if any exist
    const listConfig = {
      method: "get",
      url: `${API_BASE}/bots/?page=1&per_page=1`,
    };

    const listResponse = await axios(listConfig);

    const bots = listResponse.data.bots || [];
    console.log("listResponse", listResponse);
    if (bots.length > 0) {
      // Bot exists, store the first one
      const botId = bots[0].id.toString();
      store.dispatch(setBotId(botId));
      store.dispatch(setBotStatus("succeeded"));
      console.log("Bot found:", botId);
      return botId;
    } else {
      // 2. No bot found, create one
      console.log("No bot found, creating one...");
      const createData = {
        name: "Default AI Assistant",
        description: "Auto-created assistant for document interaction.",
        allow_free_chat: true,
        default_bot_model: "gpt-4o-mini",
        allow_free_voice_chat: false,
        place_holder: "Ask a question based on your documents...",
        enable_guardrails: true,
        memory: false,
      };

      const createConfig = {
        method: "post",
        url: `${API_BASE}/bots/`,
        headers: {
          "Content-Type": "application/json",
        },
        data: createData,
      };

      const createResponse = await axios(createConfig);
      const newBotId = createResponse.data.bot_id.toString();
      store.dispatch(setBotId(newBotId));
      store.dispatch(setBotStatus("succeeded"));
      console.log("New bot created:", newBotId);
      return newBotId;
    }
  } catch (error) {
    console.error("Error in checkAndCreateBot:", error);
    store.dispatch(setBotStatus("failed"));
    throw error;
  }
}
