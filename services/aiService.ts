
import { supabase } from '../supabaseClient';

export const aiService = {
    // 1. Генерация текста (Название и Описание)
    // Оставляем как есть, так как текстовые запросы легкие и работают стабильно
    generateProductDescription: async (name: string, categories: string[]) => {
        const prompt = `Ты креативный директор бренда одежды "PRINT PROJECT". 
        Данные: Название "${name}", Категории: ${categories.join(', ')}.
        Задача: Придумай название и техническое описание. 
        Верни ТОЛЬКО чистый JSON объект: { "name": "...", "description": "..." }`;

        try {
            const response = await fetch('https://text.pollinations.ai/openai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: "openai", 
                    messages: [{ role: "user", content: prompt }]
                })
            });

            const data = await response.json();
            const text = data.choices?.[0]?.message?.content || data.content || "";
            const cleanJson = text.replace(/```json|```/g, "").trim();
            return JSON.parse(cleanJson);
        } catch (e) {
            console.error("Text Gen Error:", e);
            return { name: name, description: "Автоматическое описание (API Error)" };
        }
    },

    // 2. ГЕНЕРАЦИЯ ЛУКБУКА (Server-Side Only)
    // Полностью переписано для использования только Edge Function
    // Убран любой fallback на Public Tier, чтобы избежать ошибок 502/Rate Limit
    generateLookbook: async (imageUrl: string, promptText: string) => {
        // Подготовка промпта
        const cleanPrompt = promptText.trim().replace(/\.$/, ''); 
        const enhancedPrompt = `${cleanPrompt}. The photo MUST feature a black t-shirt with the specific graphic design provided in the image input. High quality, photorealistic, 8k, professional fashion photography, detailed texture.`;
        
        console.log("AI Generation: Sending POST request to Supabase Edge Function (Server-Side V2)...");

        try {
            // Вызов серверной функции 'generate-image'.
            // Используем POST (передача body), что снимает ограничение на длину URL.
            const { data, error } = await supabase.functions.invoke('generate-image', {
                body: {
                    prompt: enhancedPrompt,
                    imageUrl: imageUrl,
                    model: 'flux', // Принудительно используем Flux для лучшего качества
                    width: 1024,
                    height: 1024,
                    seed: Math.floor(Math.random() * 1000000)
                },
                responseType: 'blob' // Ожидаем бинарный файл (картинку) в ответ
            });

            if (error) {
                // Логируем детали ошибки от Supabase/Deno
                console.error("Edge Function Error Details:", error);
                throw new Error(`Server Error: ${error.message || 'Unknown server error'}`);
            }

            if (!(data instanceof Blob)) {
                throw new Error("Invalid server response format (Expected Blob)");
            }

            console.log("Server generation successful! Image blob received.");
            // Создаем временную ссылку на полученный Blob для отображения в браузере
            return URL.createObjectURL(data);

        } catch (err: any) {
            console.error("AI Generation Failed:", err);
            // Прокидываем читаемую ошибку на UI
            throw new Error(`Ошибка генерации: ${err.message}. Попробуйте позже.`);
        }
    }
};
