
import { supabase } from '../supabaseClient';

export const aiService = {
    // 1. Генерация текста (Название и Описание)
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

    // 2. ГЕНЕРАЦИЯ ЛУКБУКА (Direct Client-Side)
    // Переключено на прямой запрос из браузера, чтобы избежать проблем с деплоем Edge Functions
    generateLookbook: async (imageUrl: string, promptText: string) => {
        const seed = Math.floor(Math.random() * 1000000);
        const model = "flux"; 

        const enhancedPrompt = `${promptText}. The photo MUST feature a black t-shirt with the specific graphic design provided in the image input. High quality, photorealistic, 8k, professional fashion photography, detailed texture.`;
        
        // CORS FIX: Не используем API Key в браузере, так как сервер Pollinations блокирует заголовок Authorization от клиентов.
        // Используем публичный бесплатный доступ.

        const encodedPrompt = encodeURIComponent(enhancedPrompt);
        const encodedImage = imageUrl ? encodeURIComponent(imageUrl) : '';
        
        let url = `https://image.pollinations.ai/prompt/${encodedPrompt}?model=${model}&width=1024&height=1024&seed=${seed}&nologo=true&enhance=false`;
        
        if (encodedImage) {
            url += `&image=${encodedImage}`;
        }

        try {
            console.log("Generating AI Image via Direct Link (Public Tier)...");
            
            // Убрали headers с Authorization
            const response = await fetch(url, {
                method: 'GET'
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`AI Provider Error: ${response.status} ${errText}`);
            }

            const blob = await response.blob();
            return URL.createObjectURL(blob);

        } catch (error: any) {
            console.error("Image Gen Error:", error);
            throw new Error(`Ошибка генерации: ${error.message || 'Network Error'}`);
        }
    }
};
