
import { GoogleGenAI } from "@google/genai";

// Helper to check key at runtime
const getClient = () => {
    const apiKey = (import.meta as any).env.VITE_API_KEY;
    if (!apiKey) {
        throw new Error("API Key не найден! Проверьте VITE_API_KEY в настройках Vercel.");
    }
    return new GoogleGenAI({ apiKey });
};

// Helper: Resize image to max 1024px to save bandwidth and API limits
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
                    if (width > MAX_SIZE) {
                        height *= MAX_SIZE / width;
                        width = MAX_SIZE;
                    }
                } else {
                    if (height > MAX_SIZE) {
                        width *= MAX_SIZE / height;
                        height = MAX_SIZE;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                // Return base64 without prefix for the API
                const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                resolve(dataUrl.split(',')[1]); 
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
};

export const aiService = {
    // 1. Text Generation
    generateProductDescription: async (name: string, categories: string[]) => {
        const ai = getClient();
        const prompt = `
            Ты креативный директор киберпанк-бренда одежды "PRINT PROJECT". 
            Твой стиль: сухой, технический, футуристичный, "system logs". 
            Используй термины: 'PROTOCOL', 'UNIT', 'DATA', 'SYSTEM', 'FABRIC_SHELL'.
            
            Входные данные товара:
            Название (черновик): "${name}"
            Категории: ${categories.join(', ')}
            
            Задача:
            1. Придумай крутое название товара. Стиль: "T-SHIRT [CODE_NAME]" или "HOODIE [SYSTEM_ID]".
            2. Напиши описание товара (до 300 символов). Опиши крой, ткань (хлопок), ощущения. Без эмодзи. Используй CAPS LOCK для акцентов.
            
            Верни ответ ТОЛЬКО в формате JSON:
            {
                "name": "string",
                "description": "string"
            }
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });

        const text = response.text;
        if (!text) throw new Error("Empty response from AI");
        return JSON.parse(text);
    },

    // 2. Image Generation (Lookbook)
    generateLookbook: async (imageFile: File, promptText: string) => {
        const ai = getClient();
        
        // Compress image before sending
        const base64Data = await resizeImage(imageFile);

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
                    { text: promptText }
                ]
            }
        });

        // Extract Image
        if (response.candidates && response.candidates[0].content.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                }
            }
        }
        throw new Error("Нейросеть не вернула изображение. Попробуйте изменить промт.");
    }
};
