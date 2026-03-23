const BACKEND_URL = "/api/transcribe";

/**
 * Transcribes an audio blob by sending it to our local backend.
 */
export async function transcribeAudio(blob: Blob): Promise<string> {
  try {
    const formData = new FormData();
    formData.append("audio", blob, "recording.webm");
    console.log(formData)
    const response = await fetch(BACKEND_URL, {
      method: 'POST',
      body: formData,
    });
    console.log(response)
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Server responded with ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.transcript) {
      throw new Error("NO_CONTENT_DETECTED");
    }

    return data.transcript;
    
  } catch (error) {
    console.error('Transcription Error:', error);
    throw error;
  }
}
