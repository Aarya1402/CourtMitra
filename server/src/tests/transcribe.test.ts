import { jest } from "@jest/globals";
import fs from "node:fs";

// Mock processAudio
jest.unstable_mockModule("../processAudio.js", () => ({
  getTranscript: jest.fn().mockImplementation(async () => "Mocked Transcript"),
}));

const { app } = await import("../app.js");
const request = (await import("supertest")).default;

describe("Transcribe API", () => {
  it("should return 400 if no file is uploaded", async () => {
    const res = await request(app).post("/api/transcribe").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("No audio file uploaded");
  });

  it("should return transcript on success", async () => {
    const testFile = "test_transcribe.wav";
    fs.writeFileSync(testFile, "mock audio");

    try {
      const res = await request(app)
        .post("/api/transcribe")
        .attach("audio", testFile)
        .field("language", "English");

      expect(res.status).toBe(200);
      expect(res.body.transcript).toBe("Mocked Transcript");
    } finally {
      if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
    }
  });

  it("should handle processing errors", async () => {
    const { getTranscript } = await import("../processAudio.js");
    (getTranscript as jest.MockedFunction<typeof getTranscript>).mockRejectedValueOnce(
      new Error("Transcription failure"),
    );

    const testFile = "test_transcribe_fail.wav";
    fs.writeFileSync(testFile, "mock audio");

    try {
      const res = await request(app).post("/api/transcribe").attach("audio", testFile);

      expect(res.status).toBe(500);
      expect(res.body.error).toBe("Transcription failure");
    } finally {
      if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
    }
  });
});
