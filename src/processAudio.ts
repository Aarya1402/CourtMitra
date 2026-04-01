import { SarvamAIClient } from "sarvamai";
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config();

export async function getTranscript(filePath: string, languageCode: string = "unknown"): Promise<string> {
  const client = new SarvamAIClient({
    apiSubscriptionKey: process.env.SARVAM_API_KEY as string,
  });

  if (!fs.existsSync(filePath)) {
    throw new Error(`Audio file not found at: ${filePath}`);
  }

  console.log(`Processing file: ${filePath} with language: ${languageCode}`);

  // Create batch job
  const job = await client.speechToTextJob.createJob({
    model: "saaras:v3",
    languageCode: languageCode as any,
    withDiarization: true,
    numSpeakers: 2,
  });

  // Upload and process file
  await job.uploadFiles([filePath]);
  await job.start();

  // Wait for completion
  await job.waitUntilComplete();

  // Check file-level results
  const fileResults = await job.getFileResults();

  if (fileResults.failed.length > 0) {
    throw new Error(`Transcription failed: ${fileResults.failed[0].error_message}`);
  }

  if (fileResults.successful.length === 0) {
    throw new Error("No successful transcription results received.");
  }

  // Download outputs for successful files to a temp directory
  const tempOutputDir = path.join('temp_output', `job_${Date.now()}`);
  if (!fs.existsSync(tempOutputDir)) {
    fs.mkdirSync(tempOutputDir, { recursive: true });
  }

  try {
    await job.downloadOutputs(tempOutputDir);
    
    // Read the transcript from the downloaded JSON file
    const outputFiles = fs.readdirSync(tempOutputDir);
    const transcriptFile = outputFiles.find(f => f.endsWith('.json'));

    if (!transcriptFile) {
      throw new Error("Transcript file not found in downloaded outputs.");
    }

    const content = JSON.parse(fs.readFileSync(path.join(tempOutputDir, transcriptFile), 'utf-8'));
    
    // Extract transcript text - Sarvam's JSON format can vary slightly
    const transcriptText = Array.isArray(content) 
      ? content.map((s: any) => s.transcript || s.text).join('\n')
      : (content.transcript || content.text || "");

    return transcriptText;
  } finally {
    // Cleanup temporary output directory
    if (fs.existsSync(tempOutputDir)) {
      fs.rmSync(tempOutputDir, { recursive: true, force: true });
    }
  }
}
