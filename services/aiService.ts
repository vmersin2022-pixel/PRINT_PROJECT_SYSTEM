
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
    // ОБНОВЛЕНО: Используем метод POST для прямой отправки файла
    generateLookbook: async (imageFile: File, promptText: string) => {
        try {
            // Формируем URL с параметрами
            // enhance=true позволяет нейросети немного "додумать" детали промпта
            const enhancedPrompt = encodeURIComponent(
                `${promptText}, wearing t-shirt with this print design, professional fashion photography, cyberpunk aesthetic, volumetric lighting, 8k resolution, highly detailed texture, grunge style background`
            );
            
            // Адрес Pollinations для генерации
            const pollinationsUrl = `https://image.pollinations.ai/prompt/${enhancedPrompt}?width=1024&height=1280&model=flux&nologo=true&enhance=true`;

            // Отправляем запрос методом POST, вкладывая сам файл в тело запроса.
            // Это обходит проблему с Supabase URL и ошибками 502.
            const response = await fetch(pollinationsUrl, {
                method: 'POST',
                body: imageFile,
                headers: {
                    // Указываем тип контента, чтобы сервер понял, что это картинка
                    'Content-Type': imageFile.type || 'image/png', 
                }
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Pollinations API Error: ${response.status} ${errText}`);
            }
            
            const blob = await response.blob();

            // Конвертируем результат (Blob) в Base64 для отображения в браузере
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
