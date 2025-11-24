import { GoogleGenAI } from "@google/genai";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Generates a polite and helpful message for the finder to send to the owner.
 */
export const generateFoundMessage = async (itemName: string, locationHint?: string): Promise<string> => {
  try {
    const prompt = `
      You are a helpful assistant assisting a good samaritan who found a lost item.
      The item is: "${itemName}".
      ${locationHint ? `The finder is currently near: "${locationHint}".` : ''}
      
      Draft a short, polite, and safe WhatsApp message (under 30 words) that the finder can send to the owner.
      Do not include placeholders. The message should be ready to send.
      Example: "Hi, I found your Blue Wallet near the train station. Please let me know how I can return it to you!"
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text?.trim() || `Hi, I found your ${itemName}. Please let me know how to return it.`;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return `Hi, I found your ${itemName}. Please let me know how to return it.`;
  }
};

/**
 * Generates a catchy item description suggestion for the owner during activation.
 */
export const suggestItemNames = async (category: string): Promise<string[]> => {
  try {
    const prompt = `
      List 3 short, descriptive names for a lost-and-found tag attached to a "${category}".
      Return ONLY a JSON array of strings.
      Example: ["My Blue Keys", "Spare Car Key", "Office Key Ring"]
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text);
  } catch (error) {
    return [];
  }
};
