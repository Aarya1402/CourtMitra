import axios, { AxiosRequestConfig } from "axios";

const TALKUMENT_API_BASE = "https://nighthack.api.talkument.co/api";

export const talkumentApiCall = async (
  method: string,
  endpoint: string,
  data?: any,
  token?: string,
  params?: any,
  isMultipart = false,
) => {
  const url = `${TALKUMENT_API_BASE}${endpoint}`;
  const headers: any = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (isMultipart && data && typeof data.getHeaders === "function") {
    Object.assign(headers, data.getHeaders());
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

  try {
    const response = await axios(config);
    return response.data;
  } catch (error: any) {
    throw error;
  }
};
