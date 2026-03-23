import axios from "axios";
import { API_BASE_URL } from "../../constants/api";

const API_BASE = `${API_BASE_URL}/api/talkument`;

export const uploadDocument = async (file: File, botId: string) => {
  try {
    // 1. Create a Thread
    const threadRes = await axios.post(
      `${API_BASE}/bots/${botId}/thread`,
      { history: true, data_limit: 10 }
    );

    const newThreadId = threadRes.data.thread_id;

    // 2. Upload File to that Thread
    const formData = new FormData();
    formData.append("file", file);

    await axios.post(`${API_BASE}/bots/${newThreadId}/file`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return newThreadId;
  } catch (error) {
    console.error("Upload failed in helper:", error);
    throw error;
  }
};

export const fetchThreads = async (botId: string) => {
  if (!botId) return [];
  try {
    const res = await axios.get(
      `${API_BASE}/bots/${botId}/threads?page=1&per_page=30`
    );
    return res.data.threads;
  } catch (error) {
    console.error("Failed to fetch threads:", error);
    throw error;
  }
};

export const fetchUser = async () => {
  try {
    const res = await axios.get(`${API_BASE}/user`);
    console.log("Fetched user data:", res.data);
    return res.data;
  } catch (error) {
    console.error("Failed to fetch user:", error);
    throw error;
  }
};

export const deleteThread = async (threadId: string) => {
  try {
    await axios.delete(`${API_BASE}/bots/thread/${threadId}`);
  } catch (error) {
    console.error("Failed to delete thread:", error);
    throw error;
  }
};
