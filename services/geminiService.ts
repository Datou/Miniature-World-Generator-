import { GoogleGenAI } from "@google/genai";
import { EngineeredPrompt, AspectRatio, ImageSize } from "../types";

// Helper to get the AI client
const getAiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
};

// ============================================================================
// 1. SYSTEM INSTRUCTION (Narrative Engine Upgrade)
// ============================================================================
const PROMPT_ENGINEERING_SYSTEM_INSTRUCTION = `
You are a world-class Prompt Engineer and Art Director specializing in 3D Miniature Isometric Poster Art.
Your goal is to transform user inputs into rigorous image generation prompts.

**CORE PHILOSOPHY: STORYTELLING > DESCRIPTION**
When generating a scene, especially from text, do not just describe objects. You must construct a **NARRATIVE SCENE**.
*   **Formula:** Storytelling = Key Moment (Action/Aftermath) + Micro-Clues (Details) + Mood (Lighting).
*   **Example:** Instead of "A writer's desk", describe "A chaotic desk at 3 AM, brimming with crumpled paper balls, a cold cup of coffee, and a single glowing laptop screen showing 'Chapter 1'."

**CRITICAL PRIORITY - INPUT HANDLING:**

**CASE A: REFERENCE IMAGE PROVIDED (Style Transfer)**
1.  **Subject:** Use the reference image strictly for the *Subject Design* (character/object shape).
2.  **Layout:** IGNORE the reference camera angle. Force the subject into a centralized 3D Isometric Diorama.
3.  **Action:** "Transfigure the subject into a cute, high-fidelity matte clay/resin miniature."

**CASE B: POETRY / LITERATURE (Emotional Narrative)**
1.  **Text Extraction:** Use the **FULL Title** and the **Original Verses** (not translations) for the Subtitle.
2.  **Visual Translation:** Convert the poem's imagery into a specific **"Frozen Moment"**.
    *   *If the poem mentions "Moonlight on the river", do not just draw a river. Draw a tiny boat with a lantern, drifting alone, with a wine jug left on the deck.*

**CASE C: TEXT ONLY / ABSTRACT / WEATHER (Visual Metaphor)**
1.  **Concept:** If the user types "Stock Market", draw a "Bull and Bear fighting on a cliff made of gold coins".
2.  **Atmosphere:** Use lighting to tell the story (e.g., "Warm golden hour sunlight casting long shadows" for nostalgia, "Cyberpunk neon reflection" for modern vibes).
3.  **Detail Density:** Populate the isometric base with "Micro-Clues"—tiny scattered objects that imply life and history.

**VISUAL STYLE REQUIREMENTS (Enforced in 'visualPrompt'):**
1.  **Format:** Vertical (9:16) poster.
2.  **Composition:** A floating **Isometric Island/Cube** in the center. 
    *   *Crucial:* Surrounded by clean negative space (top and bottom) to allow room for text.
3.  **Materials:** Stop-motion clay animation style, soft bevels, tilt-shift photography effect (shallow depth of field).

**OUTPUT FORMAT (JSON):**
Structure:
{
  "posterTitle": "The exact title (or short punchy text)",
  "posterSubtitle": "The verses, context, or a storytelling sentence",
  "visualPrompt": "The detailed prompt. START with: 'A vertical poster featuring a 3D isometric miniature diorama...'. DESCRIBE the 'Frozen Moment' and 'Micro-Clues'. SPECIFY 'Title [X] at the top, Subtitle [Y] at the bottom'."
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
    
    const userMessage = inputText 
      ? `User Request: ${inputText}` 
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

    // Grounding (Optional)
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

    // --- LOGIC: Handle Image vs Text Scenarios ---

    if (referenceImageBase64) {
      // SCENARIO 1: IMAGE PROVIDED (Style Transfer + Re-composition)
      const matches = referenceImageBase64.match(/^data:(.+);base64,(.+)$/);
      const mimeType = matches ? matches[1] : "image/jpeg";
      const data = matches ? matches[2] : referenceImageBase64.split(',')[1];

      parts.push({
        inlineData: { mimeType, data },
      });

      finalPromptText = `
      [SYSTEM: COMPOSITION OVERRIDE]
      1. IGNORE the reference image's background and camera angle.
      2. USE the reference image ONLY for the main character/object design.
      3. LAYOUT: Create a centralized 3D Isometric Diorama on a solid color background.
      
      [VISUAL DESCRIPTION]
      ${visualPrompt}

      [TEXT PLACEMENT ENFORCEMENT]
      - TOP: Render the TITLE floating in the upper negative space.
      - BOTTOM: Render the SUBTITLE/VERSES elegantly at the very bottom.
      `;

    } else {
      // SCENARIO 2: TEXT ONLY (Storytelling & Detail Enforcement)
      // Since there is no image to constrain the model, we need to add "Quality Boosters"
      // to ensure the "Story" comes through with high detail.
      
      finalPromptText = `
      [SYSTEM: NARRATIVE DIORAMA GENERATION]
      ACTION: Generate a highly detailed, 3D isometric miniature diorama.
      STYLE: Clay texture, soft volumetric lighting, tilt-shift photography, 8k resolution.
      
      [STORYTELLING DETAILS]
      Focus on "environmental storytelling". The scene should look lived-in.
      - Add scattered small props (books, cups, leaves, tools) relevant to the theme.
      - Use dramatic lighting to highlight the center of the diorama.
      
      [VISUAL PROMPT]
      ${visualPrompt}
      
      [TEXT LAYOUT]
      - Ensure the layout is VERTICAL (9:16).
      - Leave empty space at the TOP for the Title.
      - Leave empty space at the BOTTOM for the Subtitle.
      - Render the text cleanly as instructed in the prompt.
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