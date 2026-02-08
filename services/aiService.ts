import { GoogleGenAI } from "@google/genai";

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const getClient = () => {
    // Проверь, чтобы в Amvera переменная называлась именно VITE_API_KEY
    const apiKey = (import.meta as any).env?.VITE_API_KEY;

    if (!apiKey || apiKey === "undefined") {
        throw new Error("API Key не найден! Проверьте настройки в Amvera.");
    }
    // Передаем как объект для совместимости
    return new GoogleGenAI(apiKey); 
};

export const aiService = {
    // Не забудь вернуть этот метод из своего старого файла!
    generateProductDescription: async (name: string, categories: string[]) => {
        const ai = getClient();
        const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `Ты креативный директор бренда одежды. Название "${name}", Категории: ${categories.join(', ')}. Придумай название и описание. Верни ТОЛЬКО JSON {name, description}.`;
        
        const result = await model.generateContent(prompt);
        return JSON.parse(result.response.text());
    },

    generateLookbook: async (imageFile: File, promptText: string) => {
        const base64Data = await fileToBase64(imageFile);
        return await executeWithRetry(imageFile.type, base64Data, promptText);
    }
};

async function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = error => reject(error);
    });
}

async function executeWithRetry(mimeType: string, base64Data: string, promptText: string): Promise<string> {
    const MAX_RETRIES = 3;
    let lastError: any;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const ai = getClient();
            const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });

            const result = await model.generateContent([
                { inlineData: { mimeType, data: base64Data } },
                { text: promptText }
            ]);

            const response = await result.response;
            const generatedPart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
            
            if (!generatedPart?.inlineData) throw new Error("Модель не вернула изображение");

            return `data:image/png;base64,${generatedPart.inlineData.data}`;

        } catch (e: any) {
            lastError = e;
            if (e.message.includes("429") && attempt < MAX_RETRIES) {
                await wait(30000); // Ждем 30 сек при лимите
            } else if (attempt < MAX_RETRIES) {
                await wait(2000);
            }
        }
    }
    throw lastError;
}