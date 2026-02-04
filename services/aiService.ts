
import { GoogleGenAI } from "@google/genai";
import { supabase } from "../supabaseClient";

// Инициализация через официальный метод нового SDK
const getClient = () => {
    const apiKey = (import.meta as any).env.VITE_API_KEY;
    if (!apiKey || apiKey === "undefined") {
        throw new Error("API Key не найден! Проверьте VITE_API_KEY в настройках Vercel.");
    }
    return new GoogleGenAI({ apiKey });
};

export const aiService = {
    // 1. Генерация текста (Остается на Google Gemini 3 Flash - он работает отлично)
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

    // 2. Генерация изображений (Переход на Pollinations.ai / Flux Schnell)
    generateLookbook: async (imageFile: File, promptText: string) => {
        try {
            // ШАГ 1: Загружаем принт в Supabase, чтобы получить публичную ссылку
            // Pollinations нужны URL картинки-референса
            const fileExt = imageFile.name.split('.').pop();
            const fileName = `temp_ref_${Date.now()}.${fileExt}`;
            
            const { error: uploadError } = await supabase.storage.from('images').upload(fileName, imageFile);
            if (uploadError) throw new Error("Ошибка загрузки референса: " + uploadError.message);

            const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(fileName);

            // ШАГ 2: Формируем запрос к Pollinations
            // Используем модель 'flux' (Flux Schnell) для скорости и качества
            // Добавляем стиль в промт
            const enhancedPrompt = encodeURIComponent(
                `${promptText}, wearing t-shirt with this print design, professional fashion photography, cyberpunk aesthetic, volumetric lighting, 8k resolution, highly detailed texture, grunge style background`
            );
            
            // Параметр &image=URL заставляет модель использовать нашу картинку как основу
            const pollinationsUrl = `https://image.pollinations.ai/prompt/${enhancedPrompt}?image=${encodeURIComponent(publicUrl)}&width=1024&height=1280&model=flux&nologo=true&enhance=true`;

            // ШАГ 3: Скачиваем результат
            const response = await fetch(pollinationsUrl);
            if (!response.ok) throw new Error("Pollinations API Error");
            
            const blob = await response.blob();

            // ШАГ 4: Конвертируем в Base64 для предпросмотра
            return await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });

        } catch (e: any) {
            console.error("AI Image Error", e);
            throw new Error(e.message || "Не удалось сгенерировать изображение.");
        }
    }
};
