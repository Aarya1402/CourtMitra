import axios from "axios";
import { API_BASE_URL } from "../../constants/api";

const API_BASE = `${API_BASE_URL}/api/talkument`;

export const updateThreadTitle = async (threadId: string, title: string) => {
  try {
    const res = await axios.post(`${API_BASE}/bots/thread/${threadId}`, {
      title,
    });
    return res.data;
  } catch (error) {
    console.error("Failed to update thread title:", error);
    throw error;
  }
};
