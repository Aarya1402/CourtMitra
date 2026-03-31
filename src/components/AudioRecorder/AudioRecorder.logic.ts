const isHttps =
  typeof globalThis !== "undefined" &&
  globalThis.location.protocol === "https:";
const host = globalThis?.location.host ?? "";
const protocol = isHttps ? "wss" : "ws";

// Use VITE_WS_URL only if it exists and is NOT pointlessly pointing to localhost when we are on a remote host
const defaultWS = `${protocol}://${host}/ws`;
const envWS = import.meta.env.VITE_WS_URL || import.meta.env.WS_URL;

export const WS_URL = (envWS && !envWS.includes("localhost") && host !== "localhost") 
  ? envWS 
  : (host === "localhost" ? (envWS || defaultWS) : defaultWS);

export const API_BASE = import.meta.env.VITE_API_BASE_URL || import.meta.env.API_BASE_URL || `${window.location.protocol}//${host}/api`;

