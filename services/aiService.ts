import { GoogleGenAI } from "@google/genai";
import { supabase } from "../supabaseClient";

const getClient = () => {
    // В Amvera добавь переменную VITE_API_KEY в разделе Конфигурация
    const apiKey = (import.meta as any).env.VITE_API_KEY;
    if (!apiKey || apiKey === "undefined") {
        throw new Error("API Key не найден! Проверьте переменные окружения.");
    }
    return new GoogleGenAI({ apiKey });
};

export const aiService = {
    // 1. Генерация текста (Nano Banana Flash)
    generateProductDescription: async (name: string, categories: string[]) => {
        const ai = getClient();
        // Используем актуальную модель 3.0 (Nano Banana)
        const model = ai.getGenerativeModel({ model: "gemini-3-flash" });
        
        const prompt = `
            Ты креативный директор бренда "PRINT PROJECT". 
            Стиль: "system logs", технический, футуристичный.
            Данные: Название "${name}", Категории: ${categories.join(', ')}.
            Задача: Придумай короткое название (name) и описание (description) в стиле логов системы.
            Верни ТОЛЬКО JSON: {"name": "...", "description": "..."}
        `;

        try {
            const result = await model.generateContent(prompt);
            const text = result.response.text();
            // Очистка от markdown если нейронка его добавит
            const cleanJson = text.replace(/```json|```/g, "");
            return JSON.parse(cleanJson);
        } catch (e) {
            console.error("AI Text Error", e);
            return { name, description: "SYSTEM_ERROR: Не удалось сгенерировать описание." };
        }
    },

    // 2. Визуализация принта (Nano Banana Pro / Image Guidance)
    generatePreview: async (promptText: string, printImageBase64?: string) => {
        const ai = getClient();
        // Для работы с изображениями в 3.0 используем Pro версию
        const model = ai.getGenerativeModel({ model: "gemini-3-pro-visual-preview" });

        try {
            if (printImageBase64) {
                // Если есть принт, используем Image-to-Image (Nano Banana Pro)
                const result = await model.generateContent([
                    `Apply this design to a high-quality oversized t-shirt. 
                     Context: ${promptText}. 
                     Follow fabric folds and lighting. Cyberpunk lookbook style.`,
                    { inlineData: { data: printImageBase64, mimeType: "image/png" } }
                ]);
                // Примечание: Google API вернет описание или обработанную картинку в зависимости от настроек проекта
                // Если ты хочешь именно генерацию через Pollinations как раньше, оставляем метод ниже
            }
            
            // Запасной стабильный путь через Flux (Pollinations)
            const enhancedPrompt = encodeURIComponent(
                `A professional fashion model wearing a blank streetwear t-shirt with this exact print design: ${promptText}. 
                 The print is centered on chest, following fabric wrinkles. 8k, urban setting.`
            );
            return `https://image.pollinations.ai/prompt/${enhancedPrompt}?width=1024&height=1280&model=flux&nologo=true`;
            
        } catch (e) {
            console.error("AI Image Error", e);
            throw e;
        }
    }
};