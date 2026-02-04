
import { GoogleGenAI } from "@google/genai";

// Инициализация через официальный метод нового SDK
const getClient = () => {
    const apiKey = (import.meta as any).env.VITE_API_KEY;
    if (!apiKey || apiKey === "undefined") {
        throw new Error("API Key не найден! Проверьте VITE_API_KEY в настройках Vercel.");
    }
    // В новом SDK параметры передаются объектом
    return new GoogleGenAI({ apiKey });
};

// Хелпер для сжатия изображений
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
                const MAX_SIZE = 1024; // Оптимальный размер для нейросети
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
                resolve(dataUrl.split(',')[1]); // Возвращаем чистый base64
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
};

export const aiService = {
    // 1. Генерация текста (Используем Gemini 3 Flash)
    generateProductDescription: async (name: string, categories: string[]) => {
        const ai = getClient();
        
        const prompt = `
            Ты креативный директор киберпанк-бренда одежды "PRINT PROJECT". 
            Стиль: сухой, технический, "system logs". 
            Данные: Название "${name}", Категории: ${categories.join(', ')}.
            Задача: Придумай название (name) и описание (description).
            Верни ТОЛЬКО JSON объект.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json"
            }
        });

        // В новом SDK .text - это геттер, а не функция
        const text = response.text;
        if (!text) throw new Error("Пустой ответ от нейросети");
        return JSON.parse(text);
    },

    // 2. Генерация/Редактирование изображений (Используем Gemini 2.5 Flash Image)
    generateLookbook: async (imageFile: File, promptText: string) => {
        const ai = getClient();
        const base64Data = await resizeImage(imageFile);

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    { 
                        inlineData: { 
                            mimeType: 'image/jpeg', 
                            data: base64Data 
                        } 
                    },
                    { text: promptText }
                ]
            }
        });

        // Ищем часть с изображением в ответе
        if (response.candidates && response.candidates[0].content.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                }
            }
        }
        
        // Если изображение не вернулось, возможно модель вернула текст (ошибку или описание)
        if (response.text) {
            console.warn("AI Response Text:", response.text);
            throw new Error("Нейросеть вернула текст вместо изображения. Попробуйте упростить промт.");
        }

        throw new Error("Не удалось сгенерировать изображение.");
    }
};
