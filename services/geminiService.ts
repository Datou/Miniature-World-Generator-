import { GoogleGenAI } from "@google/genai";
import { EngineeredPrompt, AspectRatio, ImageSize } from "../types";

const getAiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
};

// ============================================================================
// 1. SYSTEM INSTRUCTION
// Optimized for "Poster Layout" (Text Space + Floating Island)
// ============================================================================
const PROMPT_ENGINEERING_SYSTEM_INSTRUCTION = `
You are a world-class Prompt Engineer and Art Director.
You have access to Google Search.

**CRITICAL LAYOUT RULE: THE "VERTICAL POSTER COMPOSITION"**
You are NOT just generating a 3D object. You are generating a **POSTER**.
1.  **Split Composition:**
    *   **Top 20%:** Empty negative space for the TITLE.
    *   **Middle 60%:** The 3D Floating Isometric Island (The Subject).
    *   **Bottom 20%:** Empty negative space for the SUBTITLE/DATA.
2.  **Camera Distance:** The camera MUST be zoomed out ("Wide Shot") to ensure the 3D object does not touch the text areas.

**INPUT HANDLING STRATEGY:**

**CASE A: REAL-TIME DATA (Stocks / Weather)**
1.  **Tool:** Search for live data.
2.  **Visual:** Create a **Floating Concept Art** representing the data.
    *   *Example:* "A glass tree with golden apples" (Good Stock) or "A storm over a stone fortress" (Bad Stock).
3.  **Subtitle:** STRICTLY the data found (e.g., "$242.50 ▲ +1.25%").

**CASE B: POETRY / STORY**
1.  **Visual:** A "Frozen Moment" on a diorama base.
2.  **Text:** Full Title + Key Verse.

**CASE C: REFERENCE IMAGE**
1.  **Action:** "Extract the subject and place it on a new clean isometric base."
2.  **Constraint:** Keep the subject in the MIDDLE 60% zone.

**OUTPUT FORMAT (JSON):**
Structure:
{
  "posterTitle": "The Title String",
  "posterSubtitle": "The Subtitle String",
  "visualPrompt": "The detailed prompt. IMPORTANT: You MUST explicitly include the text instructions inside this string. Example: '...Render the text [Title] in the top space. Render the text [Subtitle] in the bottom space.'"
}
`;

// ============================================================================
// 2. ENGINEER PROMPT FUNCTION
// ============================================================================
export const engineerPrompt = async (
  inputText: string, 
  imageBase64: string | null
): Promise<EngineeredPrompt> => {
  try {
    const modelId = "gemini-3-pro-preview"; 
    const ai = getAiClient();
    
    const parts: any[] = [];
    if (imageBase64) {
      const matches = imageBase64.match(/^data:(.+);base64,(.+)$/);
      const mimeType = matches ? matches[1] : "image/jpeg";
      const data = matches ? matches[2] : imageBase64.split(',')[1];

      parts.push({
        inlineData: { mimeType, data },
      });
    }
    
    // Explicitly prompt for search if keywords are present
    let finalInputText = inputText;
    const dataKeywords = ["stock", "price", "weather", "news", "score", "bitcoin", "btc", "eth"];
    if (dataKeywords.some(kw => inputText.toLowerCase().includes(kw))) {
        finalInputText = `User Query: "${inputText}". \nINSTRUCTION: USE GOOGLE SEARCH to find the current live data value. Put the EXACT number in the 'posterSubtitle'.`;
    }

    const userMessage = finalInputText 
      ? `User Request: ${finalInputText}` 
      : "User provided an image. Create a 3D Miniature Isometric Poster concept.";

    parts.push({ text: userMessage });

    let response;
    let attempts = 0;
    
    while (attempts < 3) {
        try {
            response = await ai.models.generateContent({
                model: modelId,
                contents: { parts },
                config: {
                    systemInstruction: PROMPT_ENGINEERING_SYSTEM_INSTRUCTION,
                    tools: [{ googleSearch: {} }],
                },
            });
            break; 
        } catch (error: any) {
            console.warn(`Engineer Prompt Attempt ${attempts + 1} failed:`, error);
            attempts++;
            if (attempts >= 3) throw error;
            await new Promise(r => setTimeout(r, 1000 * attempts));
        }
    }

    if (!response || !response.text) throw new Error("No response text");

    let jsonString = response.text.trim();
    if (jsonString.includes('{')) {
        jsonString = jsonString.substring(jsonString.indexOf('{'), jsonString.lastIndexOf('}') + 1);
    }

    let data: EngineeredPrompt;
    try {
        data = JSON.parse(jsonString) as EngineeredPrompt;
    } catch (e) {
        console.error("JSON Parse Error", jsonString);
        throw new Error("Failed to parse generated prompt.");
    }

    // Grounding
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      data.groundingSources = chunks
        .map((c: any) => c.web).filter((w: any) => w).map((w: any) => ({ title: w.title, uri: w.uri }));
    }

    return data;

  } catch (error) {
    console.error("Engineer Prompt Error:", error);
    throw error;
  }
};

// ============================================================================
// 3. GENERATE POSTER IMAGE FUNCTION (Layout & Typography Enforcement)
// ============================================================================
export const generatePosterImage = async (
  visualPrompt: string, 
  aspectRatio: AspectRatio, 
  imageSize: ImageSize,
  referenceImageBase64: string | null
): Promise<string> => {
  try {
    const modelId = "gemini-3-pro-image-preview";
    const ai = getAiClient();

    const parts: any[] = [];
    let finalPromptText = visualPrompt;

    // --- KEY MODIFICATION: LAYOUT & TYPOGRAPHY CONSTRAINT ---
    // We force a "Wide Shot" and explicitly reserve space for text.
    const layoutConstraint = `
    [LAYOUT RULES: VERTICAL POSTER]
    1. CAMERA: Wide Shot / Zoom Out (0.5x). The 3D object must be SMALLER than the canvas.
    2. PADDING: Ensure 20% empty space at the TOP and 20% empty space at the BOTTOM.
    3. CENTER: The 3D Floating Island must be strictly in the MIDDLE.
    
    [TYPOGRAPHY INSTRUCTION]
    - Render the TITLE explicitly in the top empty space. Use large, legible, 3D or bold font.
    - Render the SUBTITLE/DATA explicitly in the bottom empty space. Use clear, contrasting font.
    - DO NOT overlay text on the 3D model. Keep text on the clean background.
    `;

    if (referenceImageBase64) {
      const matches = referenceImageBase64.match(/^data:(.+);base64,(.+)$/);
      const mimeType = matches ? matches[1] : "image/jpeg";
      const data = matches ? matches[2] : referenceImageBase64.split(',')[1];

      parts.push({
        inlineData: { mimeType, data },
      });

      finalPromptText = `
      ${layoutConstraint}

      [SYSTEM: IMAGE REFERENCE MODE]
      1. ISOLATION: Extract the subject from the reference image.
      2. RE-COMPOSITION: Place the subject on a floating isometric base in the CENTER.
      3. BACKGROUND: Clean, solid, infinite background to support text visibility.
      
      [VISUAL DESCRIPTION]
      ${visualPrompt}
      `;
    } else {
      // TEXT ONLY MODE
      finalPromptText = `
      ${layoutConstraint}

      [SYSTEM: GENERATION MODE]
      Action: Create a self-contained miniature world.
      
      [VISUAL DESCRIPTION]
      ${visualPrompt}
      `;
    }

    parts.push({ text: finalPromptText });

    let response;
    let attempts = 0;
    while (attempts < 3) {
        try {
            response = await ai.models.generateContent({
              model: modelId,
              contents: { parts },
              config: {
                imageConfig: { aspectRatio, imageSize }
              },
            });
            break;
        } catch (error: any) {
            console.warn(`Image Gen Attempt ${attempts + 1} failed:`, error);
            attempts++;
            if (attempts >= 3) throw error;
            await new Promise(r => setTimeout(r, 2000 * attempts));
        }
    }
    
    if (!response || !response.candidates || !response.candidates[0].content.parts) {
        throw new Error("No image generated");
    }

    const imagePart = response.candidates[0].content.parts.find(p => p.inlineData);
    if (imagePart && imagePart.inlineData) {
        return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
    }

    throw new Error("No image data found");

  } catch (error) {
    console.error("Image Generation Error:", error);
    throw error;
  }
};