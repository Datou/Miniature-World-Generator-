import { GoogleGenAI } from "@google/genai";
import { EngineeredPrompt, AspectRatio, ImageSize } from "../types";

const getAiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
};

// ============================================================================
// 1. SYSTEM INSTRUCTION
// Optimized for Strict Language Priority & Layout Enforcement
// ============================================================================
const PROMPT_ENGINEERING_SYSTEM_INSTRUCTION = `
You are a world-class Prompt Engineer and Art Director.
You have access to Google Search.

**CRITICAL PROTOCOL - LANGUAGE PRIORITY (STRICT ORDER):**
You must determine the **Target Output Language** based on the following hierarchy. STOP at the first matching rule:

1.  **PRIORITY 1: USER INPUT TEXT (The Boss)**
    *   **Rule:** If the user has typed ANY text input (even a single word like "Cool"), detect the language of that input.
    *   **Action:** The Title and Subtitle MUST match the **User Input's language**.
    *   *Example:* User types "Hello" (English) + Image contains Japanese text. -> **OUTPUT: ENGLISH.**
    *   *Example:* User types "只狼" (Chinese) + Image contains English text. -> **OUTPUT: CHINESE.**

2.  **PRIORITY 2: REFERENCE IMAGE TEXT (The Context)**
    *   **Condition:** ONLY if User Input is EMPTY.
    *   **Rule:** Analyze the Reference Image. Does it contain visible, legible text (e.g., Movie Poster Title, Book Cover)?
    *   **Action:** If yes, use the dominant language found in the image.
    *   *Example:* User input is empty + Image is the "Lang Lang Mountain" poster (Chinese). -> **OUTPUT: CHINESE.**

3.  **PRIORITY 3: SYSTEM LOCALE (The Fallback)**
    *   **Condition:** ONLY if User Input is EMPTY AND Image has NO TEXT.
    *   **Rule:** Look at the provided 'User System Locale'.
    *   **Action:** Generate the Title/Subtitle in that locale's language.
    *   *Example:* Empty input + Landscape photo + Locale 'zh-CN'. -> **OUTPUT: CHINESE.**

4.  **PRIORITY 4: DEFAULT**
    *   **Action:** English.

**CRITICAL LAYOUT RULE: THE "MINIATURE DIORAMA COMPOSITION"**
1.  **Integrated Composition (Full Bleed):**
    *   **Top 25%:** Negative space for TITLE. **CRITICAL: The background color must continue here.**
    *   **Middle 50%:** **The Subject is a "Tiny Isometric Diorama" (A floating platform).**
    *   **Bottom 25%:** Negative space for SUBTITLE. **CRITICAL: The background color must continue here.**
    *   **NO WHITE BARS.** The entire canvas must have a unified background color. The text sits directly on the background.

2.  **Scale & Camera:** 
    *   **Create a "Tilt-shift" effect.** The camera must be a **High-Angle Long Shot**.
    *   **CRITICAL:** Characters must be **TINY figurines** (taking up no more than 1/3 of the island's height). 
    *   **Do NOT produce close-ups or portraits.** The focus is the *entire* floating island environment.

**INPUT HANDLING STRATEGY:**

**CASE A: REFERENCE IMAGE (Style Transfer)**
- **Action:** Extract the subject but shrink it down to a "toy figurine" scale placed on a detailed isometric base.
- **Visuals:** Describe a **"cute 3D clay render, blind box toy style, miniature world"**.

**CASE B: REAL-TIME DATA (Stocks/Weather)**
- **Tool:** Search for live data.
- **Language:** Use the **Target Output Language** for the Subject Name. Keep numbers universal.

**OUTPUT FORMAT (JSON):**
Structure:
{
  "posterTitle": "Title in Target Language",
  "posterSubtitle": "Subtitle in Target Language",
  "visualPrompt": "The detailed prompt in ENGLISH. BUT, inside the text instructions, use the Target Language strings. Example: 'Render the text [小妖怪] in the top space...'"
}
`;

// ============================================================================
// 2. ENGINEER PROMPT FUNCTION
// ============================================================================
export const engineerPrompt = async (
  inputText: string, 
  imageBase64: string | null,
  userLocale: string = "en-US" 
): Promise<EngineeredPrompt> => {
  try {
    // Use gemini-3-pro-preview for maximum reasoning capability
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
    
    // Check for data keywords to trigger search tool
    let finalInputText = inputText;
    const dataKeywords = ["stock", "price", "weather", "news", "score"];
    // Simple check: if input exists and matches keywords
    const needsSearch = inputText && dataKeywords.some(kw => inputText.toLowerCase().includes(kw));
    
    if (needsSearch) {
        finalInputText = `User Query: "${inputText}". \nINSTRUCTION: USE GOOGLE SEARCH to find the current live data value.`;
    }

    // Explicitly pass the metadata to the System Prompt logic
    const contextMessage = `
    [METADATA FOR LANGUAGE LOGIC]
    1. User Input Text: "${finalInputText || ""}" (If not empty, this is PRIORITY 1)
    2. Reference Image Provided: ${imageBase64 ? "YES" : "NO"} (If Input is empty, check this for text -> PRIORITY 2)
    3. User System Locale: "${userLocale}" (Fallback -> PRIORITY 3)
    
    [TASK]
    Determine the Target Language based on the Priority Rules.
    Create a 3D Miniature Isometric Poster concept.
    `;

    parts.push({ text: contextMessage });

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

    // Enhanced Error Handling
    if (!response) throw new Error("No response from AI service.");
    
    // Check if the model blocked the response
    if (response.candidates && response.candidates.length > 0) {
        const candidate = response.candidates[0];
        if (candidate.finishReason !== "STOP" && candidate.finishReason !== "MAX_TOKENS") {
             // If we have no text but a finish reason, it might be safety or other
             if (!response.text) {
                 console.warn("Generation stopped. Finish Reason:", candidate.finishReason);
                 throw new Error(`AI generation stopped: ${candidate.finishReason}`);
             }
        }
    }

    if (!response.text) {
        throw new Error("The AI returned an empty response. Please try again with a different prompt or image.");
    }

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
// 3. GENERATE POSTER IMAGE FUNCTION
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

    // Layout Constraint Logic
    const layoutConstraint = `
    [LAYOUT RULES: VERTICAL POSTER - MINIATURE WORLD]
    1. COMPOSITION: Render a "Floating Isometric Island" in the CENTER.
    2. SCALE DEFINITION: The image involves a **HUGE Environment** and **TINY Characters**.
       - The character should look like a small Nendoroid or Lego figure standing on a base.
       - Character Head-to-Body ratio: 1:2 or 1:3 (Cute/Chibi style), but keep the character SMALL relative to the canvas.
    3. CAMERA: **Isometric High-Angle View (God's Eye View)**. Zoom out significantly to show the entire floating island with plenty of margin around it.
    4. BACKGROUND: Clean, solid, infinite background. MUST fill 100% of the canvas height/width.
    5. NEGATIVE SPACE: Ensure the Top 20% and Bottom 20% are empty of 3D objects (for text placement).
    **CRITICAL**: The background color must be UNIFORM and FULL BLEED across the entire image (top to bottom). Do NOT render white bars or strips at the top/bottom. The text should be placed directly on the main background color.
    
    [STYLE MODIFIERS]
    - **"Tilt-shift photography"** (blur the background slightly, keep center sharp).
    - **"Claymorphism"** or **"3D Blind Box Toy"** style.
    - **"Polly Pocket"** or **"Micro-landscape"**.
    
    [TYPOGRAPHY INSTRUCTION]
    - Render the TITLE explicitly in the top negative space (on the colored background). 
    - Render the SUBTITLE explicitly in the bottom negative space (on the colored background).
    - FONT: Use a font that matches the language of the text provided in the prompt (e.g. Calligraphy for Chinese, Sans-serif for English).
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