import { jest } from "@jest/globals";
import fs from "node:fs";
import path from "node:path";

// Define shared mock functions to control behavior across instances
const mockCreateJob = jest.fn() as unknown as jest.Mock<(...args: unknown[]) => Promise<unknown>>;

jest.unstable_mockModule("sarvamai", () => ({
  SarvamAIClient: jest.fn().mockImplementation(() => ({
    speechToTextJob: {
      createJob: mockCreateJob,
    },
  })),
}));

describe("processAudio", () => {
  let getTranscript: (filePath: string, language?: string) => Promise<string>;

  beforeAll(async () => {
    // Import dynamically after mock is established
    const processAudio = await import("../processAudio.js");
    getTranscript = processAudio.getTranscript;
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Default success mock behavior
    mockCreateJob.mockImplementation(async () => ({
      uploadFiles: jest.fn(),
      start: jest.fn(),
      waitUntilComplete: jest.fn(),
      getFileResults: jest.fn().mockImplementation(async () => ({
        failed: [],
        successful: [{ file_id: "test", output_file_id: "output" }],
      })),
      downloadOutputs: jest.fn().mockImplementation(async (dir: unknown) => {
        const transcriptPath = path.join(dir as string, "transcript.json");
        fs.writeFileSync(
          transcriptPath,
          JSON.stringify({
            transcript: "Sample transcript text",
          }),
        );
        return Promise.resolve();
      }),
    }));
  });

  it("should throw error if file does not exist", async () => {
    await expect(getTranscript("/non/existent/path")).rejects.toThrow("Audio file not found");
  });

  it("should process audio and return transcript if file exists", async () => {
    const mockFilePath = "test_audio_sample.wav";
    fs.writeFileSync(mockFilePath, "dummy data");

    try {
      const result = await getTranscript(mockFilePath, "en-IN");
      expect(result).toBe("Sample transcript text");
    } finally {
      if (fs.existsSync(mockFilePath)) fs.unlinkSync(mockFilePath);
    }
  });

  it("should handle transcription failure", async () => {
    await import("sarvamai");
    // Mock failure case on the shared mock function
    mockCreateJob.mockImplementationOnce(async () => ({
      uploadFiles: jest.fn(),
      start: jest.fn(),
      waitUntilComplete: jest.fn(),
      getFileResults: jest.fn().mockImplementation(async () => ({
        failed: [{ error_message: "Network Error" }],
        successful: [],
      })),
    }));

    const mockFilePath = "fail_audio_sample.wav";
    fs.writeFileSync(mockFilePath, "dummy data");

    try {
      await expect(getTranscript(mockFilePath)).rejects.toThrow("Transcription failed");
    } finally {
      if (fs.existsSync(mockFilePath)) fs.unlinkSync(mockFilePath);
    }
  });

  it("should handle error when transcript file is missing from downloaded outputs", async () => {
    // Mock case where download succeeds but no file is created
    mockCreateJob.mockImplementationOnce(async () => ({
      uploadFiles: jest.fn(),
      start: jest.fn(),
      waitUntilComplete: jest.fn(),
      getFileResults: jest.fn().mockImplementation(async () => ({
        failed: [],
        successful: [{ file_id: "test", output_file_id: "output" }],
      })),
      downloadOutputs: jest.fn().mockImplementation(async () => {}), // Doesn't write anything
    }));

    const mockFilePath = "no_output_audio.wav";
    fs.writeFileSync(mockFilePath, "dummy data");

    try {
      await expect(getTranscript(mockFilePath)).rejects.toThrow("Transcript file not found");
    } finally {
      if (fs.existsSync(mockFilePath)) fs.unlinkSync(mockFilePath);
    }
  });

  it("should handle error when no successful results are received", async () => {
    mockCreateJob.mockImplementationOnce(async () => ({
      uploadFiles: jest.fn(),
      start: jest.fn(),
      waitUntilComplete: jest.fn(),
      getFileResults: jest.fn().mockImplementation(async () => ({
        failed: [],
        successful: [], // Both empty
      })),
    }));

    const mockFilePath = "empty_success_audio.wav";
    fs.writeFileSync(mockFilePath, "dummy data");

    try {
      await expect(getTranscript(mockFilePath)).rejects.toThrow(
        "No successful transcription results received",
      );
    } finally {
      if (fs.existsSync(mockFilePath)) fs.unlinkSync(mockFilePath);
    }
  });

  it("should correctly join multi-segment transcription outputs", async () => {
    mockCreateJob.mockImplementationOnce(async () => ({
      uploadFiles: jest.fn(),
      start: jest.fn(),
      waitUntilComplete: jest.fn(),
      getFileResults: jest.fn().mockImplementation(async () => ({
        failed: [],
        successful: [{ file_id: "test", output_file_id: "output" }],
      })),
      downloadOutputs: jest.fn().mockImplementation(async (dir: unknown) => {
        const transcriptPath = path.join(dir as string, "transcript.json");
        const multiSegmentData = [{ transcript: "First segment." }, { text: "Second segment." }];
        fs.writeFileSync(transcriptPath, JSON.stringify(multiSegmentData));
        return Promise.resolve();
      }),
    }));

    const mockFilePath = "multi_segment_audio.wav";
    fs.writeFileSync(mockFilePath, "dummy data");

    try {
      const result = await getTranscript(mockFilePath);
      expect(result).toBe("First segment.\nSecond segment.");
    } finally {
      if (fs.existsSync(mockFilePath)) fs.unlinkSync(mockFilePath);
    }
  });

  it("should handle invalid JSON in downloaded transcript file", async () => {
    mockCreateJob.mockImplementationOnce(async () => ({
      uploadFiles: jest.fn(),
      start: jest.fn(),
      waitUntilComplete: jest.fn(),
      getFileResults: jest.fn().mockImplementation(async () => ({
        failed: [],
        successful: [{ file_id: "test", output_file_id: "output" }],
      })),
      downloadOutputs: jest.fn().mockImplementation(async (dir: unknown) => {
        const transcriptPath = path.join(dir as string, "transcript.json");
        fs.writeFileSync(transcriptPath, "NOT VALID JSON");
        return Promise.resolve();
      }),
    }));

    const mockFilePath = "invalid_json_audio.wav";
    fs.writeFileSync(mockFilePath, "dummy data");

    try {
      await expect(getTranscript(mockFilePath)).rejects.toThrow();
    } finally {
      if (fs.existsSync(mockFilePath)) fs.unlinkSync(mockFilePath);
    }
  });
});
