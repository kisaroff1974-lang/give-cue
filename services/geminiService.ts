
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const parseScript = async (text: string): Promise<{ character: string; text: string }[]> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Раздели следующий текст сцены на персонажей и их реплики. 
    Имена персонажей обычно написаны ЗАГЛАВНЫМИ БУКВАМИ.
    Верни результат в формате JSON массива объектов с полями 'character' и 'text'.
    Текст для парсинга:
    ${text}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            character: { type: Type.STRING, description: 'Имя персонажа' },
            text: { type: Type.STRING, description: 'Текст реплики' },
          },
          required: ['character', 'text'],
        },
      },
    },
  });

  try {
    const jsonStr = response.text.trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Failed to parse Gemini response", error);
    return [];
  }
};
