const isHttps = typeof window !== "undefined" && window.location.protocol === "https:";
const host = typeof window !== "undefined" ? window.location.host : "";
const protocol = isHttps ? "wss" : "ws";

export const WS_URL = import.meta.env.VITE_WS_URL || `${protocol}://${host}/ws`;
export const API_BASE = import.meta.env.VITE_API_BASE_URL || import.meta.env.API_BASE_URL || `${window.location.protocol}//${host}/api`;
