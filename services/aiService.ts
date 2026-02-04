import { GoogleGenAI } from "@google/generative-ai";

// Инициализация через официальный метод SDK
const getClient = () => {
    const apiKey = (import.meta as any).env.VITE_API_KEY;
    if (!apiKey || apiKey === "undefined") {
        throw new Error("API Key не найден! Проверьте VITE_API_KEY в настройках Vercel.");
    }
    return new GoogleGenAI(apiKey);
};

const resizeImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const MAX_SIZE = 1024;
                if (width > height) {
                    if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
                } else {
                    if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                resolve(dataUrl.split(',')[1]); 
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
};

export const aiService = {
    // 1. TEXT GENERATION
    generateProductDescription: async (name: string, categories: string[]) => {
        const genAI = getClient();
        
        // ВАЖНО: Используем getGenerativeModel вместо прямого обращения к ai.models
        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            generationConfig: {
                responseMimeType: "application/json",
            },
        });

        const prompt = `
            Ты креативный директор киберпанк-бренда одежды "PRINT PROJECT". 
            Стиль: сухой, технический, "system logs". 
            Данные: Название "${name}", Категории: ${categories.join(', ')}.
            Верни JSON: {"name": "string", "description": "string"}
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return JSON.parse(response.text());
    },

    // 2. IMAGE ANALYSIS (VISION)
    generateLookbook: async (imageFile: File, promptText: string) => {
        const genAI = getClient();
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        const base64Data = await resizeImage(imageFile);

        // Правильный формат передачи данных для мультимодальных запросов
        const result = await model.generateContent([
            promptText,
            {
                inlineData: {
                    mimeType: "image/jpeg",
                    data: base64Data
                }
            }
        ]);

        const response = await result.response;
        return response.text(); 
    }
};
