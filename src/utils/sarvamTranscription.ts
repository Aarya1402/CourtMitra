import axios from "axios";
const BACKEND_URL = "/api/transcribe";

/**
 * Transcribes an audio blob by sending it to our local backend.
 */
export async function transcribeAudio(blob: Blob): Promise<string> {
  try {
    const formData = new FormData();
    formData.append("audio", blob, "recording.webm");

    const response = await axios.post(BACKEND_URL, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    const data = response.data;

    if (!data.transcript) {
      throw new Error("NO_CONTENT_DETECTED");
    }

    return data.transcript;
  } catch (error) {
    console.error("Transcription Error:", error);
    throw error;
  }
}
