import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

// Vite'da process.env o'rniga vite.config'da define qilganingizdan foydalanamiz
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

export const parseScript = async (text: string): Promise<{ character: string; text: string }[]> => {
  // Model nomini to'g'ri ko'rsating (masalan: gemini-1.5-flash)
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            character: { type: SchemaType.STRING, description: 'Имя персонажа' },
            text: { type: SchemaType.STRING, description: 'Текст реплики' },
          },
          required: ['character', 'text'],
        },
      },
    },
  });

  try {
    const prompt = `Раздели следующий текст сцены на персонажей и их реплики. 
    Имена персонажей обычно написаны ЗАГЛАВНЫМИ БУКВАМИ.
    Верни результат в формате JSON массива объектов с полями 'character' и 'text'.
    Текст для парсинга:
    ${text}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const jsonStr = response.text().trim();
    
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Failed to parse Gemini response:", error);
    return [];
  }
};
