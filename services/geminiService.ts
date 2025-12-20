
import { GoogleGenAI, Type } from "@google/genai";

// Updated to use process.env.API_KEY directly and removed apiKey parameter as per guidelines.
export const generateFlashcardsFromList = async (
  words: string[]
): Promise<Array<{ front: string; back: string; phonetic: string; example: string; exampleTranslation: string }>> => {
  // Use named parameter for GoogleGenAI initialization and obtain key from process.env.API_KEY.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    你是一个乐于助人的语言学习助手。
    我会提供一个单词或短语列表。
    对于每个单词，请提供以下内容的 JSON 对象：
    1. 原始单词 (front)。
    2. 翻译 (back)：如果是外语则翻译成中文，如果是中文则翻译成英文。
    3. 音标 (phonetic)：该单词的 IPA 音标。
    4. 一个简短、可爱、生活化的例句 (example)。**重要：请在例句中将该单词用 HTML <b> 标签包裹** (例如: This is a <b>cat</b>)。
    5. 例句的中文翻译 (exampleTranslation)。
    
    单词列表: ${words.join(", ")}
  `;

  try {
    const response = await ai.models.generateContent({
      // Using 'gemini-3-flash-preview' for basic text tasks.
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              front: { type: Type.STRING },
              back: { type: Type.STRING },
              phonetic: { type: Type.STRING },
              example: { type: Type.STRING },
              exampleTranslation: { type: Type.STRING }
            },
            required: ["front", "back", "phonetic", "example", "exampleTranslation"]
          }
        }
      }
    });

    // Access the text property directly on the response object (not as a function).
    if (response.text) {
      return JSON.parse(response.text.trim());
    }
    return [];
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
