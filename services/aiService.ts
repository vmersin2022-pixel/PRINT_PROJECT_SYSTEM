
import { GoogleGenAI } from "@google/genai";
import { supabase } from "../supabaseClient";

const getClient = () => {
    // В Vite используем import.meta.env. 
    // Убедитесь, что в Amvera добавлена переменная VITE_API_KEY
    const apiKey = (import.meta as any).env.VITE_API_KEY;
    if (!apiKey || apiKey === "undefined") {
        console.error("API Key is missing. Check Amvera environment variables.");
        throw new Error("API Key не найден! Проверьте VITE_API_KEY.");
    }
    return new GoogleGenAI({ apiKey });
};

export const aiService = {
    // 1. Генерация текста (Google Gemini 3 Flash)
    generateProductDescription: async (name: string, categories: string[]) => {
        const ai = getClient();
        
        const prompt = `
            Ты креативный директор киберпанк-бренда одежды "PRINT PROJECT". 
            Стиль: сухой, технический, "system logs". 
            Данные: Название "${name}", Категории: ${categories.join(', ')}.
            Задача: Придумай название (name) и описание (description).
            Верни ТОЛЬКО JSON объект.
        `;

        try {
            // ИСПРАВЛЕНО: Новый синтаксис ai.models.generateContent
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: {
                    responseMimeType: "application/json"
                }
            });

            const text = response.text;
            if (!text) throw new Error("Пустой ответ от нейросети");
            return JSON.parse(text);
        } catch (error: any) {
            console.error("AI Text Error:", error);
            throw new Error("Ошибка генерации текста: " + error.message);
        }
    },

    // 2. Генерация изображений (Pollinations.ai / Flux Schnell)
    // Имя функции должно быть generateLookbook, чтобы совпадать с AdminProducts.tsx
    generateLookbook: async (imageFile: File, promptText: string) => {
        try {
            // 1. Загрузка исходника в Supabase
            const fileExt = imageFile.name.split('.').pop();
            const tempFileName = `temp_gen_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            
            const { error: uploadError } = await supabase.storage
                .from('images')
                .upload(tempFileName, imageFile);

            if (uploadError) throw new Error("Ошибка загрузки файла: " + uploadError.message);

            const { data: { publicUrl } } = supabase.storage
                .from('images')
                .getPublicUrl(tempFileName);

            // 2. Формирование URL для Pollinations
            const enhancedPrompt = encodeURIComponent(
                `${promptText}, wearing t-shirt with this print design, professional fashion photography, cyberpunk aesthetic, 8k resolution, highly detailed texture, grunge style background`
            );
            
            const baseUrl = `https://image.pollinations.ai/prompt/${enhancedPrompt}`;
            
            const params = new URLSearchParams({
                width: '1024',
                height: '1280',
                model: 'flux',
                nologo: 'true',
                enhance: 'true',
                image: publicUrl,
                // key: POLLINATIONS_KEY // Если есть платный ключ
            });

            // 3. Возврат прямой ссылки
            return `${baseUrl}?${params.toString()}`;

        } catch (e: any) {
            console.error("AI Image Error", e);
            throw new Error(e.message || "Не удалось сгенерировать изображение.");
        }
    }
};
