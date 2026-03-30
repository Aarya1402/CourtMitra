import { Request, Response } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini API
const getGeminiModel = () => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set in environment variables");
  }
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
};

export const extractOrderData = async (
  req: Request,
  res: Response,
): Promise<any> => {
  try {
    const { currentJsonString, chunk, language = "English" } = req.body;

    console.log(
      `[GeminiController] Starting synthesis for transcript (length: ${chunk?.length || 0} chars) in language: ${language}`,
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
   - A draft JSON is provided below.  
   - Use it as a base, but VERIFY and CORRECT it using the FULL TRANSCRIPT.  
   - Fill missing fields and fix inconsistencies.  

6. LEGAL FORMATTING  
   - Ensure "final_order" and "operative_order.full_text" read like formal Indian court orders.  
   - Maintain formal tone and structure consistent with judicial writing.  

7. CLEAN OUTPUT  
   - Return ONLY the JSON object.  
   - Do NOT include explanations, markdown, or extra text.  

---
FULL TRANSCRIPT:
${chunk}

---
FINAL INSTRUCTION:
Generate a complete, accurate, and legally structured court order JSON in "${language}", strictly adhering to the schema and rules above.`;

    const model = getGeminiModel();
    const result = await model.generateContent(promptText);
    const responseText = result.response.text();
    console.log(
      `[GeminiController] AI response received (length: ${responseText.length} chars)`,
    );

    const rawResult = responseText; // whatever you get

    const cleanedJSON = extractJSON(rawResult);

    if (!cleanedJSON) {
      console.error(
        "[GeminiController] Failed to clean AI response into JSON:",
        responseText.substring(0, 500),
      );
      return res.status(500).json({
        error: "Failed to parse JSON from AI response",
        raw: responseText, // for debugging
      });
    }

    console.log(
      "[GeminiController] Synthesis successful, sending refined JSON",
    );
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

export const translateOrderData = async (
  req: Request,
  res: Response,
): Promise<any> => {
  try {
    const { orderData, language = "English" } = req.body;

    if (!orderData) {
      return res.status(400).json({ error: "orderData is required" });
    }

    console.log(
      `[GeminiController] Starting translation of orderData to language: ${language}`,
    );

    const promptText = `You are a legal translation expert. 
Translate the following JSON object representing a court order into the language: "${language}".

🔒 RULES:
1. STRICT SCHEMA COMPLIANCE: Do NOT add, remove, or rename any keys. The structure must remain EXACTLY as provided.
2. LEGAL ACCURACY: Use proper legal terminology and formal tone appropriate for an Indian court document in "${language}".
3. TRANSLATE ALL VALUES: Translate every string value within the JSON object to "${language}".
4. DO NOT CHANGE STRUCTURE: Return ONLY a valid JSON object. Do NOT add any preamble, markdown formatting, or explanations.

---
JSON TO TRANSLATE:
${JSON.stringify(orderData, null, 2)}

---
FINAL INSTRUCTION:
Return the translated JSON object in "${language}" now.`;

    const model = getGeminiModel();
    const result = await model.generateContent(promptText);
    const responseText = result.response.text();

    const cleanedJSON = extractJSON(responseText);

    if (!cleanedJSON) {
      return res.status(500).json({
        error: "Failed to parse translated JSON from AI response",
        raw: responseText,
      });
    }

    return res.json({
      result: cleanedJSON,
    });
  } catch (error: any) {
    console.error("Gemini Translation Error:", error);
    return res
      .status(500)
      .json({ error: error.message || "Error translating with Gemini" });
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
  } catch { }

  // Extract first valid JSON object using regex
  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch { }
  }

  return null;
}
