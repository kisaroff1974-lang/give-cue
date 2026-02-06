import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

// Vite-переменная окружения
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("VITE_GEMINI_API_KEY is not defined");
}

const genAI = new GoogleGenerativeAI(apiKey);

export const parseScript = async (
  text: string
): Promise<{ character: string; text: string }[]> => {

  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            character: {
              type: SchemaType.STRING,
              description: "Имя персонажа",
            },
            text: {
              type: SchemaType.STRING,
              description: "Текст реплики",
            },
          },
          required: ["character", "text"],
        },
      },
    },
  });

  const prompt = `
Раздели следующий текст сцены на персонажей и их реплики.
Имена персонажей обычно написаны ЗАГЛАВНЫМИ БУКВАМИ.
Верни результат строго в формате JSON массива объектов:
[{ "character": "...", "text": "..." }]

Текст:
${text}
`;

  const result = await model.generateContent(prompt);
  const response = result.response.text();

  return JSON.parse(response);
};
