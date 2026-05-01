# CourtMitra Server Test Documentation

This document describes the purpose and scope of each test file and test case in the CourtMitra server.

## Test Suites

### 1. Health Checks (`health.test.ts`)

Verifies that the server is operational and responding to system-level requests.

- **`should respond to /health endpoint`**: Ensures the basic heartbeat endpoint returns a 200 OK status with the expected JSON structure.

### 2. Audio Processing Service (`processAudio.test.ts`)

Tests the core logic for interacting with Sarvam AI's speech-to-text services.

- **`should throw error if file does not exist`**: Validates early check for missing audio files.
- **`should process audio and return transcript if file exists`**: Tests successful single-segment transcript generation.
- **`should handle transcription failure`**: Verifies handling of job-level failures.
- **`should handle error when transcript file is missing from downloaded outputs`**: Tests case where job completes but file download fails or produces no file.
- **`should handle error when no successful results are received`**: Tests case where Sarvam returns empty results for all files.
- **`should correctly join multi-segment transcription outputs`**: Verifies that the service properly aggregates transcripts from multiple segments into a single string.
- **`should handle invalid JSON in downloaded transcript file`**: Ensures robust error handling for corrupted data files.

### 3. Order Controller (`order.test.ts`)

Tests legal document synthesis and translation endpoints powered by Sarvam AI LLM.

- **`POST /api/order/extract`**:
  - **`should return extracted JSON on success`**: Verifies basic structured data extraction.
  - **`should successfully extract JSON when AI returns extra preamble text`**: Validates the `extractJSON` utility's ability to find JSON within conversational text.
  - **`should handle mixed markdown and JSON`**: Verifies handling of markdown code blocks.
  - **`should handle truncated AI response`**: Tests the truncation detection logic.
  - **`should handle complete JSON parsing failure`**: Tests behavior for completely invalid responses.
  - **`should handle Sarvam AI API failure`**: Tests API error propagation.
- **`POST /api/order/translate`**:
  - **`should return translated JSON on success`**: Verifies judicial data translation.
  - **`should handle parse failure in translation`**: Ensures error handling for malformed translation outputs.
  - **`should handle Sarvam AI Translation failure`**: Validates error propagation for the translation flow.

### 4. Transcription API (`transcribe.test.ts`)

Tests the HTTP endpoint for file-based transcription.

- **Basic success/failure flows** for file uploads and processing error propagation.

### 5. Talkument Proxy & Auth (`talkument.test.ts`)

Tests integration with the Talkument platform using mocked external dependencies.

- **`should logout successfully and clear cookie`**: Verifies token clearing logic.
- **`should return 500 when talkument proxy fails`**: Validates error handling for external API downtime.
- **`should pass through auth token if provided in cookies`**: MISSION CRITICAL: Verifies that the authentication token is correctly extracted from cookies and forwarded to Talkument as a Bearer token.

---

## Running Tests

Run all tests:

```bash
npm test
```

Coverage report:

```bash
npm run test:coverage
```
