
import { supabase } from '../supabaseClient';

export const aiService = {
    /**
     * ГЕНЕРАЦИЯ ТЕКСТА
     * Текстовые запросы легкие, используем прямой вызов.
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
     * Через собственный микросервис на Amvera.
     */
    generateLookbook: async (imageUrl: string, promptText: string, model: string = 'flux') => {
        console.log(`AI Proxy: Connecting to microservice (Model: ${model})...`);
        
        // -----------------------------------------------------------
        // ВАЖНО: АДРЕС ПРОКСИ-СЕРВЕРА
        // Используем вашу ссылку + эндпоинт /generate
        // -----------------------------------------------------------
        const PROXY_URL = 'https://proxy-julia2806.amvera.io/generate'; 

        if (PROXY_URL.includes('YOUR-PROXY-APP-NAME')) {
            console.warn("ВНИМАНИЕ: Адрес прокси-сервера не настроен в aiService.ts");
        }

        try {
            const response = await fetch(PROXY_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prompt: promptText,
                    imageUrl: imageUrl,
                    model: model, // Dynamic model selection
                    width: 1024,
                    height: 1024
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.details || `Ошибка сервера: ${response.status}`);
            }

            // Получаем картинку как Blob (бинарные данные)
            const blob = await response.blob();
            console.log("Image received successfully via proxy.");
            
            // Создаем ссылку для отображения в браузере
            return URL.createObjectURL(blob);

        } catch (err: any) {
            console.error("AI Generation Failed:", err);
            throw new Error(`Генерация не удалась: ${err.message}. Проверьте, запущен ли прокси-сервер.`);
        }
    }
};
