import { API_BASE_URL } from "../../constants/api";

export const API_BASE = `${API_BASE_URL}/api/talkument`;

export interface ThreadFile {
  id: string;
  name: string;
  status: string;
}
