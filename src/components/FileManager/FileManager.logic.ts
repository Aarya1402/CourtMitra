export const API_BASE = `http://${window.location.hostname}:5000/api/talkument`;

export interface ThreadFile {
  id: string;
  name: string;
  status: string;
}
