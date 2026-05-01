const isHttps =
  typeof globalThis !== "undefined" &&
  globalThis.location.protocol === "https:";
const host = typeof globalThis !== "undefined" && globalThis.location.host;
const protocol = isHttps ? "wss" : "ws";

export const WS_URL = import.meta.env.VITE_WS_URL || `${protocol}://${host}/ws`;
export const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.API_BASE_URL ||
  `${globalThis.location.protocol}//${host}/api`;
