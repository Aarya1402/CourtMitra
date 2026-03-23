const isHttps = window.location.protocol === "https:";
const host = window.location.host;
const protocol = isHttps ? "wss" : "ws";

// API_BASE_URL: If not provided in .env, use empty string to allow relative pathing (Vite proxy)
export const API_BASE_URL = import.meta.env.API_BASE_URL || "";

// WS_BASE_URL: If not provided in .env, construct absolute WS URL based on current browser location
export const WS_BASE_URL =
  import.meta.env.VITE_WS_BASE_URL || `${protocol}://${host}/ws`;
