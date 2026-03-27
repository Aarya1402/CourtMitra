import { Request, Response } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini API
const getGeminiModel = () => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set in environment variables");
  }
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
};

export const extractOrderData = async (
  req: Request,
  res: Response,
): Promise<any> => {
  try {
    const { currentJsonString, chunk } = req.body;
    
    console.log(`[GeminiController] Starting synthesis for transcript (length: ${chunk?.length || 0} chars)`);

    if (!chunk) {
      return res.status(400).json({ error: "chunk is required" });
    }

    let parsedCurrentJson = {};

    try {
      parsedCurrentJson =
        typeof currentJsonString === "string"
          ? JSON.parse(currentJsonString)
          : currentJsonString || {};
    } catch (parseError) {
      console.error("Error parsing currentJsonString:", parseError);
      parsedCurrentJson = {};
    }

    const promptText = `You are a legal document synthesis expert specializing in Indian court proceedings.

Your task is to analyze the following FULL TRANSCRIPT of a court session and structure the information into a formal JSON order object according to the STRICT SCHEMA provided below.

⚠️ JSON SCHEMA TO FOLLOW:
{
  "header": {
    "court_name": "string",
    "case_number": "string",
    "case_type": "string",
    "location": "string",
    "dates": {
      "filing_date": "string",
      "registration_date": "string",
      "decision_date": "string",
      "other_dates": ["string"]
    }
  },
  "case_title": {
    "petitioner": "string",
    "respondent": "string",
    "full_title_text": "string"
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
  "appearance_mode": "string",
  "case_details": {
    "acts_sections": "string",
    "case_category": "string",
    "police_station": "string",
    "property_details": "string",
    "other_details": "string"
  },
  "procedural_history": "string",
  "issues_framed": "string",
  "evidence": {
    "oral_evidence": "string",
    "documentary_evidence": "string"
  },
  "arguments": "string",
  "reasoning_points": ["string"],
  "operative_order": {
    "full_text": "string",
    "directions": ["string"],
    "final_outcome": "string"
  },
  "final_order": "string",
  "signature": {
    "judge_name": "string",
    "designation": "string",
    "court": "string",
    "date": "string",
    "place": "string"
  }
}

⚠️ EXTRACTION PROTOCOL:
1. POINT-BY-POINT SYNTHESIS: Extract the judge's reasoning as an array of strings in 'reasoning_points'.
2. FINAL DIRECTIONS: Extract all numbered or bulleted conditions/directions in the final order as an array of strings in 'operative_order.directions'.
3. DIALECT INTEGRITY: The transcript may contain a mix of Gujarati and English. DO NOT TRANSLATE. Preserve the exact legal phrasing as spoken.
4. DRAFT REFINEMENT: The CURRENT EXTRACTED JSON provided below is a draft. Correct any errors and fill in all missing fields based on the COMPLETE TRANSCRIPT.
5. FAITHFULNESS: If a specific detail (like a date, case number, or name) is not present in the transcript, set those fields to null. Never hallucinate data.
6. CLEAN OUTPUT: Return ONLY the structured JSON object. DO NOT include markdown code blocks (\`\`\`json) or any other text.

---
CURRENT EXTRACTED JSON (DRAFT):
${JSON.stringify(parsedCurrentJson, null, 2)}

---
FULL TRANSCRIPT:
${chunk}

---
FINAL INSTRUCTION:
Ensure the output matches the provided JSON SCHEMA exactly and capture all subpoints in the appropriate array fields. Use the structure inspired by typical Indian court orders as shown in standard forms.`;

    const model = getGeminiModel();
    const result = await model.generateContent(promptText);
    const responseText = result.response.text();
    console.log(`[GeminiController] AI response received (length: ${responseText.length} chars)`);

    const rawResult = responseText; // whatever you get

    const cleanedJSON = extractJSON(rawResult);

    if (!cleanedJSON) {
      console.error("[GeminiController] Failed to clean AI response into JSON:", responseText.substring(0, 500));
      return res.status(500).json({
        error: "Failed to parse JSON from AI response",
        raw: responseText, // for debugging
      });
    }

    console.log("[GeminiController] Synthesis successful, sending refined JSON");
    return res.json({
      result: cleanedJSON,
    });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return res
      .status(500)
      .json({ error: error.message || "Error processing with Gemini" });
  }
};

function extractJSON(text: string) {
  if (!text) return null;

  // Remove markdown ```json blocks
  text = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch {}

  // Extract first valid JSON object using regex
  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch {}
  }

  return null;
}
