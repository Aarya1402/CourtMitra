import axios, { AxiosRequestConfig } from "axios";

const TALKUMENT_API_BASE =
  process.env.TALKUMENT_API_BASE || "https://nighthack.api.talkument.co/api";

export const talkumentApiCall = async (
  method: string,
  endpoint: string,
  data?: unknown,
  token?: string,
  params?: Record<string, unknown>,
  isMultipart = false,
) => {
  const url = `${TALKUMENT_API_BASE}${endpoint}`;
  const headers: Record<string, string> = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (
    isMultipart &&
    data &&
    typeof (data as { getHeaders?: () => Record<string, string> }).getHeaders === "function"
  ) {
    Object.assign(headers, (data as { getHeaders: () => Record<string, string> }).getHeaders());
  } else if (data) {
    headers["Content-Type"] = "application/json";
  }

  const config: AxiosRequestConfig = {
    method,
    url,
    data,
    headers,
    params,
    maxBodyLength: Infinity,
  };

  const response = await axios(config);
  return response.data;
};
