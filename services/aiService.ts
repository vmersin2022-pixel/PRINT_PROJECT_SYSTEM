
import { supabase } from '../supabaseClient';

// Вспомогательная функция задержки
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const aiService = {
    // 1. Генерация текста (Название и Описание)
    // Текст оставляем пока как есть (или можно тоже перенести на прокси позже)
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

    // 2. ГЕНЕРАЦИЯ ЛУКБУКА (Image-to-Image / Vision)
    // Используем Supabase Proxy для обхода ограничений
    generateLookbook: async (imageUrl: string, promptText: string) => {
        const seed = Math.floor(Math.random() * 1000000);
        const model = "flux"; 

        const enhancedPrompt = `${promptText}. The photo MUST feature a black t-shirt with the specific graphic design provided in the image input. High quality, photorealistic, 8k, professional fashion photography, detailed texture.`;
        
        try {
            // Вызываем нашу серверную функцию
            // ВАЖНО: responseType: 'blob' чтобы получить картинку, а не JSON
            const { data, error } = await supabase.functions.invoke('generate-image', {
                body: {
                    prompt: enhancedPrompt,
                    imageUrl: imageUrl,
                    model: model,
                    width: 1024,
                    height: 1024,
                    seed: seed
                },
                responseType: 'blob' 
            });

            if (error) {
                // Пытаемся прочитать текст ошибки из blob, если вернулся JSON с ошибкой
                if (error instanceof Blob) {
                    const text = await (error as any).text();
                    throw new Error(text);
                }
                throw error;
            }

            if (!(data instanceof Blob)) {
                throw new Error("Invalid response format from server");
            }
            
            // Создаем ссылку на полученный Blob
            return URL.createObjectURL(data);

        } catch (error: any) {
            console.error("Image Gen Error:", error);
            throw new Error(`Ошибка генерации: ${error.message || 'Server Error'}`);
        }
    }
};
