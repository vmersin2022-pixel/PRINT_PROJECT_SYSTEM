
import { supabase } from '../supabaseClient';

export const aiService = {
    // 1. Генерация текста (Название и Описание)
    // Оставляем как есть, так как текстовые запросы обычно короткие и проходят напрямую
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
    generateLookbook: async (imageUrl: string, promptText: string) => {
        // Подготовка промпта
        const cleanPrompt = promptText.trim().replace(/\.$/, ''); 
        const enhancedPrompt = `${cleanPrompt}. The photo MUST feature a black t-shirt with the specific graphic design provided in the image input. High quality, photorealistic, 8k, professional fashion photography, detailed texture.`;
        
        console.log("AI Generation: Sending request to Supabase Edge Function...");

        try {
            // Вызов серверной функции. Данные передаются в теле POST-запроса, 
            // поэтому лимиты на длину URL больше не действуют.
            const { data, error } = await supabase.functions.invoke('generate-image', {
                body: {
                    prompt: enhancedPrompt,
                    imageUrl: imageUrl,
                    model: 'flux', // Принудительно используем Flux
                    width: 1024,
                    height: 1024,
                    seed: Math.floor(Math.random() * 1000000)
                },
                responseType: 'blob' // Ожидаем бинарный файл (картинку)
            });

            if (error) {
                // Пытаемся прочитать текст ошибки, если он есть
                console.error("Edge Function Error Details:", error);
                throw new Error(`Server Error: ${error.message || 'Unknown error'}`);
            }

            if (!(data instanceof Blob)) {
                throw new Error("Invalid server response format (Expected Blob)");
            }

            console.log("Server generation successful! Image received.");
            return URL.createObjectURL(data);

        } catch (err: any) {
            console.error("Generation Failed:", err);
            // Прокидываем понятную ошибку на фронтенд
            throw new Error(`Ошибка генерации: ${err.message}. Попробуйте позже.`);
        }
    }
};
