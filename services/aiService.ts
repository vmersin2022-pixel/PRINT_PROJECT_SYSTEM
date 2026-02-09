
import { supabase } from '../supabaseClient';

export const aiService = {
    /**
     * ГЕНЕРАЦИЯ ТЕКСТА
     * Текстовые запросы легкие, поэтому используем прямой POST запрос к Pollinations API.
     */
    generateProductDescription: async (name: string, categories: string[]) => {
        const prompt = `Ты креативный директор бренда одежды "PRINT PROJECT". 
        Данные: Название "${name}", Категории: ${categories.join(', ')}.
        Задача: Придумай короткое продающее название и техническое описание. 
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
            return { name: name, description: "Автоматическое описание временно недоступно." };
        }
    },

    /**
     * ГЕНЕРАЦИЯ ИЗОБРАЖЕНИЙ (Lookbook)
     * СТРОГО ЧЕРЕЗ ПРОКСИ (Edge Function). 
     * Решает проблему CORS, Rate Limits и 502 (длинные URL).
     */
    generateLookbook: async (imageUrl: string, promptText: string) => {
        console.log("AI Proxy: Initiating secure server-side generation...");
        
        try {
            // Вызываем функцию в Supabase. Она сама знает секретный ключ (из env).
            const { data, error } = await supabase.functions.invoke('generate-image', {
                body: {
                    prompt: promptText,
                    imageUrl: imageUrl,
                    model: 'flux',
                    width: 1024,
                    height: 1024
                },
                responseType: 'blob' // Получаем картинку как бинарный объект напрямую
            });

            if (error) {
                console.error("Edge Function Error Details:", error);
                throw new Error(error.message || "Ошибка сервера при генерации");
            }

            if (!(data instanceof Blob)) {
                throw new Error("Неверный формат ответа от сервера (ожидался Blob)");
            }

            console.log("Image received successfully via proxy.");
            // Создаем временную локальную ссылку для предпросмотра
            return URL.createObjectURL(data);

        } catch (err: any) {
            console.error("AI Generation Failed:", err);
            // Если ошибка "Requested entity was not found", значит функция не развернута
            const userFriendlyError = err.message.includes('404') 
                ? "Прокси-сервер не найден. Проверьте развертывание Edge Function."
                : err.message;
            throw new Error(`Генерация не удалась: ${userFriendlyError}`);
        }
    }
};
