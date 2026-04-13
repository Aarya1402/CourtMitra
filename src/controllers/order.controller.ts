import { Request, Response } from "express";
import { SarvamAIClient } from "sarvamai";
import { LegalOrderData, SarvamChatResponse } from "../types/index.js";

// Initialize Sarvam AI Client
const getSarvamClient = () => {
  if (!process.env.SARVAM_API_KEY) {
    throw new Error("SARVAM_API_KEY is not set in environment variables");
  }
  return new SarvamAIClient({
    apiSubscriptionKey: process.env.SARVAM_API_KEY,
  });
};

const LANGUAGE_MAP: Record<string, string> = {
  "en-IN": "English",
  "hi-IN": "Hindi",
  "gu-IN": "Gujarati",
  "kn-IN": "Kannada",
  "ml-IN": "Malayalam",
  "mr-IN": "Marathi",
  "bn-IN": "Bengali",
  "pa-IN": "Punjabi",
  "ta-IN": "Tamil",
  "te-IN": "Telugu",
  "or-IN": "Odia",
};

const resolveLanguage = (lang: string) => {
  if (!lang) return "English";
  const normalized = lang.trim().toLowerCase();
  for (const [code, name] of Object.entries(LANGUAGE_MAP)) {
    if (code.toLowerCase() === normalized || name.toLowerCase() === normalized) {
      return name;
    }
  }
  return lang;
};

export const extractOrderData = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { chunk, language: langParam = "en-IN" } = req.body;
    const language = resolveLanguage(langParam);

    console.log(
      `[OrderController] Starting synthesis for transcript (length: ${chunk?.length || 0} chars) in language: ${language} using Sarvam AI`,
    );

    if (!chunk) {
      return res.status(400).json({ error: "chunk is required" });
    }

    const systemPrompt = `You are a legal document synthesis expert specializing in Indian court proceedings.
Your task: Analyze the transcript and generate a COMPLETE, VALID JSON object in "${language}" strictly following the schema.

RULES:
1. Return ONLY the JSON object. No preamble, no conversational text, no markdown.
2. If info is missing, use null. No hallucinations.
3. LANGUAGE CONSISTENCY: The entire response MUST be in "${language}". Do NOT translate to English unless "${language}" is "English". Preserve original legal terminology from the transcript.
4. Extract Reasoning (concise array) and Operative Directions (separate items).
5. Ensure legal formatting for final_order.

SCHEMA:
{
  "header": { "court_name": "string|null", "case_number": "string|null", "case_type": "string|null", "location": "string|null", "dates": { "filing_date": "string|null", "registration_date": "string|null", "decision_date": "string|null", "other_dates": ["string"] } },
  "case_title": { "petitioner": "string|null", "respondent": "string|null", "full_title_text": "string|null" },
  "parties": { "petitioners": ["string"], "respondents": ["string"], "accused": ["string"], "complainant": ["string"], "other_parties": ["string"] },
  "advocates": { "petitioner_side": ["string"], "respondent_side": ["string"], "government_side": ["string"], "other": ["string"] },
  "appearance_mode": "string|null",
  "case_details": { "acts_sections": "string|null", "case_category": "string|null", "police_station": "string|null", "property_details": "string|null", "other_details": "string|null" },
  "procedural_history": "string|null",
  "issues_framed": "string|null",
  "evidence": { "oral_evidence": "string|null", "documentary_evidence": "string|null" },
  "arguments": "string|null",
  "reasoning_points": ["string"],
  "operative_order": { "full_text": "string|null", "directions": ["string"], "final_outcome": "string|null" },
  "final_order": "string|null",
  "signature": { "judge_name": "string|null", "designation": "string|null", "court": "string|null", "date": "string|null", "place": "string|null" }
}`;

    const userPrompt = `FULL TRANSCRIPT:
${chunk}

---
Generate the JSON order in "${language}" now. Return ONLY JSON.`;

    const client = getSarvamClient();
    let response = (await client.chat.completions({
      model: "sarvam-30b",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      max_tokens: 4096,
    })) as SarvamChatResponse;

    // Retry once if content is null
    if (
      (!response?.choices || response.choices.length === 0 || !response.choices[0].message.content) &&
      response.choices?.[0]?.finish_reason !== "content_filter"
    ) {
      console.log("[OrderController] Received null content, retrying synthesis...");
      response = (await client.chat.completions({
        model: "sarvam-30b",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],
        max_tokens: 4096,
      })) as SarvamChatResponse;
    }

    if (!response?.choices || response.choices.length === 0) {
      throw new Error("Sarvam AI returned an empty response (no choices)");
    }

    const responseText = response.choices[0].message.content;

    if (responseText === null || responseText === undefined) {
      const finishReason = response.choices[0].finish_reason;
      console.error(
        "[OrderController] Sarvam AI response content is null. Full response:",
        JSON.stringify(response, null, 2),
      );
      throw new Error(
        `Sarvam AI returned a response with null content (Finish Reason: ${finishReason})`,
      );
    }

    console.log(`[OrderController] AI response received (length: ${responseText.length} chars)`);

    const cleanedJSON = extractJSON(responseText);

    if (!cleanedJSON) {
      console.error(
        "[OrderController] Failed to clean AI response into JSON:",
        responseText.substring(0, 500),
      );

      // Special handling for truncated responses
      const isTruncated =
        (responseText.length > 0 && !responseText.trim().endsWith("}")) ||
        response.choices[0].finish_reason === "length";

      return res.status(500).json({
        error: isTruncated
          ? "AI response was truncated. Please try again with a shorter chunk."
          : "Failed to parse JSON from AI response",
        raw: responseText,
      });
    }

    console.log("[OrderController] Synthesis successful, sending refined JSON");
    return res.json({
      result: cleanedJSON as unknown as LegalOrderData,
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Error processing with Sarvam AI";
    console.error("Sarvam AI API Error:", error);
    return res.status(500).json({ error: errorMsg });
  }
};

export const translateOrderData = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { orderData, language: langParam = "en-IN" } = req.body;
    const language = resolveLanguage(langParam);

    if (!orderData) {
      return res.status(400).json({ error: "orderData is required" });
    }

    console.log(
      `[OrderController] Starting translation of orderData to language: ${language} using Sarvam AI`,
    );

    const systemPrompt = `You are a legal translation expert. 
Your task: Translate the following JSON representing a court order into "${language}".

RULES:
1. CRITICAL: ALL values must be translated into "${language}". Do NOT keep text from the original source language.
2. STRICT SCHEMA COMPLIANCE: Do NOT add, remove, or rename any keys. 
3. LEGAL ACCURACY: Use proper legal terminology in "${language}".
4. CLEAN OUTPUT: Return ONLY a valid JSON object. No preamble, no markdown.`;

    const userPrompt = `JSON TO TRANSLATE (TARGET LANGUAGE: ${language.toUpperCase()}):
${JSON.stringify(orderData, null, 2)}

---
Translate all values to "${language}" now. Return ONLY JSON.`;

    const client = getSarvamClient();
    let response = (await client.chat.completions({
      model: "sarvam-30b",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      max_tokens: 4096,
    })) as SarvamChatResponse;

    // Retry once if content is null
    if (
      (!response?.choices || response.choices.length === 0 || !response.choices[0].message.content) &&
      response.choices?.[0]?.finish_reason !== "content_filter"
    ) {
      console.log("[OrderController] Received null content, retrying translation...");
      response = (await client.chat.completions({
        model: "sarvam-30b",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],
        max_tokens: 4096,
      })) as SarvamChatResponse;
    }

    if (!response?.choices || response.choices.length === 0) {
      throw new Error("Sarvam AI returned an empty translation response");
    }

    const responseText = response.choices[0].message.content;

    if (responseText === null || responseText === undefined) {
      const finishReason = response.choices[0].finish_reason;
      console.error(
        "[OrderController] Sarvam AI translation response content is null. Full response:",
        JSON.stringify(response, null, 2),
      );
      throw new Error(
        `Sarvam AI returned a translation response with null content (Finish Reason: ${finishReason})`,
      );
    }

    const cleanedJSON = extractJSON(responseText);

    if (!cleanedJSON) {
      return res.status(500).json({
        error: "Failed to parse translated JSON from AI response",
        raw: responseText,
      });
    }

    return res.json({
      result: cleanedJSON as unknown as LegalOrderData,
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Error translating with Sarvam AI";
    console.error("Sarvam AI Translation Error:", error);
    return res.status(500).json({ error: errorMsg });
  }
};

function extractJSON(text: string): Record<string, unknown> | null {
  if (!text) return null;

  // Remove markdown ```json blocks
  const content = text
    .replaceAll(/```json/gi, "")
    .replaceAll("```", "")
    .trim();

  // 1. Try direct parse first
  try {
    return JSON.parse(content);
  } catch {
    // Falls through
  }

  // 2. Try identifying first brace
  const firstBrace = content.indexOf("{");
  if (firstBrace === -1) return null;

  // 3. Try identified range from last brace
  const lastBrace = content.lastIndexOf("}");
  if (lastBrace > firstBrace) {
    try {
      return JSON.parse(content.substring(firstBrace, lastBrace + 1));
    } catch {
      // Falls through
    }
  }

  // 4. Try truncated repair (best effort for incomplete streams)
  try {
    return repairTruncatedJSON(content.substring(firstBrace));
  } catch {
    // Falls through
  }

  // 5. Final attempt: find the last valid close brace backwards
  return findLastValidJSON(content, firstBrace, lastBrace);
}

function findLastValidJSON(
  text: string,
  start: number,
  lastBrace: number,
): Record<string, unknown> | null {
  let currentLastBrace = lastBrace;
  while (currentLastBrace > start) {
    try {
      return JSON.parse(text.substring(start, currentLastBrace + 1));
    } catch {
      currentLastBrace = text.lastIndexOf("}", currentLastBrace - 1);
    }
  }
  return null;
}

type JSONState = {
  stack: string[];
  inString: boolean;
  lastCompletePos: number;
  lastMeaningfulChar: string;
  lastMeaningfulCharPos: number;
};

function setComplete(state: JSONState, char: string, pos: number) {
  state.lastCompletePos = pos + 1;
  state.lastMeaningfulChar = char;
  state.lastMeaningfulCharPos = pos;
}

function handlePrimitiveOrDelimiter(char: string, pos: number, state: JSONState) {
  if (char === ":" || char === ",") {
    state.lastMeaningfulChar = char;
    state.lastMeaningfulCharPos = pos;
  } else if (/[0-9.truefalsn]/.test(char)) {
    setComplete(state, char, pos);
  }
}

function analyzeJSONStructure(text: string): JSONState {
  const state: JSONState = {
    stack: [],
    inString: false,
    lastCompletePos: 0,
    lastMeaningfulChar: "",
    lastMeaningfulCharPos: 0,
  };

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    // Handle quotes
    if (char === '"' && (i === 0 || text[i - 1] !== "\\")) {
      state.inString = !state.inString;
      if (!state.inString) setComplete(state, '"', i);
      continue;
    }

    if (state.inString || /[ \n\r\t]/.test(char)) continue;

    if (char === "{" || char === "[") {
      state.stack.push(char === "{" ? "}" : "]");
      setComplete(state, char, i);
    } else if (char === "}" || char === "]") {
      if (state.stack.pop()) setComplete(state, char, i);
    } else {
      handlePrimitiveOrDelimiter(char, i, state);
    }
  }
  return state;
}

function completeJSONWithStack(text: string, inString: boolean, stack: string[]): string {
  let balanced = text;
  if (inString) balanced += '"';
  const tempStack = [...stack];
  while (tempStack.length > 0) balanced += tempStack.pop();
  return balanced;
}

/**
 * Basic JSON repair for truncated strings
 */
function repairTruncatedJSON(jsonString: string): Record<string, unknown> | null {
  let repaired = jsonString.trim();
  const state = analyzeJSONStructure(repaired);

  if (!state.inString && (state.lastMeaningfulChar === ":" || state.lastMeaningfulChar === ",")) {
    repaired = repaired.substring(0, state.lastMeaningfulCharPos);
  }

  // Attempt 1: Balance wherever we stopped
  try {
    const bal1 = completeJSONWithStack(repaired, state.inString, state.stack);
    return JSON.parse(bal1);
  } catch {
    // Attempt 2: Strip back to the last index where a structure was actually closed or opened
    try {
      const substructure = repaired.substring(0, state.lastCompletePos);
      const state2 = analyzeJSONStructure(substructure);
      const bal2 = completeJSONWithStack(substructure, state2.inString, state2.stack);
      return JSON.parse(bal2);
    } catch {
      return null;
    }
  }
}
