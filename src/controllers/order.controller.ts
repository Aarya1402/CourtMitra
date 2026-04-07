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

export const extractOrderData = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { chunk, language = "English" } = req.body;

    console.log(
      `[OrderController] Starting synthesis for transcript (length: ${chunk?.length || 0} chars) in language: ${language} using Sarvam AI`,
    );

    if (!chunk) {
      return res.status(400).json({ error: "chunk is required" });
    }

    const promptText = `You are a legal document synthesis expert specializing in Indian court proceedings.

Your task is to analyze the FULL TRANSCRIPT of a court session and generate a COMPLETE and VALID JSON object strictly following the schema provided below.

🔒 LANGUAGE REQUIREMENT:
- The output MUST be entirely in the following language: "${language}".
- Do NOT translate content unnecessarily.
- Preserve original legal phrasing, tone, and terminology from the transcript wherever possible.
- If the transcript contains mixed languages, normalize the FINAL ORDER and narrative fields into "${language}" while preserving legal accuracy.

⚠️ STRICT JSON SCHEMA:
{
  "header": {
    "court_name": "string | null",
    "case_number": "string | null",
    "case_type": "string | null",
    "location": "string | null",
    "dates": {
      "filing_date": "string | null",
      "registration_date": "string | null",
      "decision_date": "string | null",
      "other_dates": ["string"]
    }
  },
  "case_title": {
    "petitioner": "string | null",
    "respondent": "string | null",
    "full_title_text": "string | null"
  },
  "parties": {
    "petitioners": ["string"],
    "respondents": ["string"],
    "accused": ["string"],
    "complainant": ["string"],
    "other_parties": ["string"]
  },
  "advocates": {
    "petitioner_side": ["string"],
    "respondent_side": ["string"],
    "government_side": ["string"],
    "other": ["string"]
  },
  "appearance_mode": "string | null",
  "case_details": {
    "acts_sections": "string | null",
    "case_category": "string | null",
    "police_station": "string | null",
    "property_details": "string | null",
    "other_details": "string | null"
  },
  "procedural_history": "string | null",
  "issues_framed": "string | null",
  "evidence": {
    "oral_evidence": "string | null",
    "documentary_evidence": "string | null"
  },
  "arguments": "string | null",
  "reasoning_points": ["string"],
  "operative_order": {
    "full_text": "string | null",
    "directions": ["string"],
    "final_outcome": "string | null"
  },
  "final_order": "string | null",
  "signature": {
    "judge_name": "string | null",
    "designation": "string | null",
    "court": "string | null",
    "date": "string | null",
    "place": "string | null"
  }
}

⚠️ EXTRACTION & SYNTHESIS RULES:

1. STRICT SCHEMA COMPLIANCE  
   - Output MUST match the schema EXACTLY.  
   - Do NOT add, remove, or rename fields.  

2. NO HALLUCINATION  
   - If any information is missing from the transcript, set it to null.  
   - Never infer or fabricate case details.  

3. REASONING EXTRACTION  
   - Extract judicial reasoning into "reasoning_points" as a clear array of concise points.  
   - Each point should represent one logical step in the judge’s reasoning.  

4. FINAL DIRECTIONS EXTRACTION  
   - Extract all explicit directions/orders (numbered or implied) into "operative_order.directions" as separate items.  

5. DRAFT CORRECTION PRIORITY  
   - A draft JSON is provided below (if any).  
   - Use it as a base, but VERIFY and CORRECT it using the FULL TRANSCRIPT.  
   - Fill missing fields and fix inconsistencies.  

6. LEGAL FORMATTING  
   - Ensure "final_order" and "operative_order.full_text" read like formal Indian court orders.  
   - Maintain formal tone and structure consistent with judicial writing.  

7. CLEAN OUTPUT (CRITICAL)
   - Return ONLY the JSON object.  
   - Do NOT include explanations, markdown, or extra text.  
   - PROHIBITED: Do NOT use <think> tags, chain-of-thought blocks, or any reasoning text in the output.
   - Start your response directly with '{' and end with '}'.

---
FULL TRANSCRIPT:
${chunk}

---
FINAL INSTRUCTION:
Generate a complete, accurate, and legally structured court order JSON in "${language}", strictly adhering to the schema and rules above.
Only return JSON. Absolutely no <think> commentary.`;

    const client = getSarvamClient();
    const response = (await client.chat.completions({
      model: "sarvam-m",
      messages: [
        {
          role: "user",
          content: promptText,
        },
      ],
      max_tokens: 3000,
    })) as SarvamChatResponse;

    const responseText = response.choices[0].message.content;
    console.log(`[OrderController] AI response received (length: ${responseText.length} chars)`);

    const cleanedJSON = extractJSON(responseText);

    if (!cleanedJSON) {
      console.error(
        "[OrderController] Failed to clean AI response into JSON:",
        responseText.substring(0, 500),
      );

      // Special handling for truncated responses - maybe tell user to try again
      const isTruncated = responseText.length > 0 && !responseText.trim().endsWith("}");

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
    const { orderData, language = "English" } = req.body;

    if (!orderData) {
      return res.status(400).json({ error: "orderData is required" });
    }

    console.log(
      `[OrderController] Starting translation of orderData to language: ${language} using Sarvam AI`,
    );

    const promptText = `You are a legal translation expert. 
Translate the following JSON object representing a court order into the language: "${language}".

🔒 RULES:
1. STRICT SCHEMA COMPLIANCE: Do NOT add, remove, or rename any keys. The structure must remain EXACTLY as provided.
2. LEGAL ACCURACY: Use proper legal terminology and formal tone appropriate for an Indian court document in "${language}".
3. TRANSLATE ALL VALUES: Translate every string value within the JSON object to "${language}".
4. CLEAN OUTPUT (CRITICAL): Return ONLY a valid JSON object. 
   - Do NOT add any preamble, markdown formatting, or explanations.
   - Do NOT use <think> tags or internal reasoning blocks.
   - Start your response directly with '{' and end with '}'.

---
JSON TO TRANSLATE:
${JSON.stringify(orderData, null, 2)}

---
FINAL INSTRUCTION:
Return ONLY the translated JSON object in "${language}" now. No other text.`;

    const client = getSarvamClient();
    const response = (await client.chat.completions({
      model: "sarvam-m",
      messages: [
        {
          role: "user",
          content: promptText,
        },
      ],
      max_tokens: 3000,
    })) as SarvamChatResponse;

    const responseText = response.choices[0].message.content;

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
  text = text
    .replaceAll(/```json/gi, "")
    .replaceAll("```", "")
    .trim();

  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch {
    // Falls through to extraction logic if direct JSON parsing fails
  }

  // If it starts with <think> or other text, find the first '{'
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const potentialJSON = text.substring(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(potentialJSON);
    } catch {
      // Ignore parse failure; results in null being returned
    }
  }

  return null;
}
