
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

    // 2. ГЕНЕРАЦИЯ ЛУКБУКА (Smart Hybrid Mode)
    generateLookbook: async (imageUrl: string, promptText: string) => {
        // Очищаем промпт от лишних знаков
        const cleanPrompt = promptText.trim().replace(/\.$/, ''); 
        const enhancedPrompt = `${cleanPrompt}. The photo MUST feature a black t-shirt with the specific graphic design provided in the image input. High quality, photorealistic, 8k, professional fashion photography, detailed texture.`;
        
        console.log("AI Generation: Starting...");

        // ПОПЫТКА 1: Пробуем через твой сервер (Supabase Edge Function)
        try {
            console.log("Attempt 1: Server-Side Proxy (Edge Function)...");
            const { data, error } = await supabase.functions.invoke('generate-image', {
                body: {
                    prompt: enhancedPrompt,
                    imageUrl: imageUrl,
                    model: 'flux', // Explicitly request flux
                    width: 1024,
                    height: 1024,
                    seed: Math.floor(Math.random() * 1000000)
                },
                responseType: 'blob'
            });

            if (error) {
                console.warn("Edge Function Error:", error);
                throw error;
            }

            if (!(data instanceof Blob)) {
                throw new Error("Invalid server response format");
            }

            console.log("Server generation successful!");
            return URL.createObjectURL(data);

        } catch (serverError: any) {
            console.warn("Edge Function Failed. Falling back to Direct Link.", serverError.message);
            
            // ПОПЫТКА 2: Фолбэк на прямой запрос
            try {
                // Ждем 1 секунду перед фолбэком, чтобы не спамить
                await new Promise(r => setTimeout(r, 1000));

                const seed = Math.floor(Math.random() * 1000000);
                const encodedPrompt = encodeURIComponent(enhancedPrompt);
                
                // В браузере лучше использовать более простой URL, если есть картинка
                let url = `https://image.pollinations.ai/prompt/${encodedPrompt}?model=flux&width=1024&height=1024&seed=${seed}&nologo=true`;
                
                if (imageUrl) {
                    const encodedImage = encodeURIComponent(imageUrl);
                    url += `&image=${encodedImage}`;
                }

                // Пытаемся использовать ключ если он доступен в ENV (Vite)
                const clientKey = (import.meta as any).env?.VITE_POLLINATIONS_KEY;
                const headers: any = {};
                if (clientKey) {
                    // Некоторые прокси Pollinations могут принимать ключ в заголовке, но основной публичный GET может игнорировать
                    // Попробуем, хуже не будет
                    headers['Authorization'] = `Bearer ${clientKey}`; 
                }

                console.log("Attempt 2: Client-Side Direct Fetch...");
                const response = await fetch(url, { 
                    method: 'GET',
                    headers: headers
                }); 

                if (!response.ok) {
                    const errText = await response.text();
                    throw new Error(`AI Provider Error: ${response.status} ${errText.substring(0, 100)}`);
                }

                const blob = await response.blob();
                return URL.createObjectURL(blob);

            } catch (clientError: any) {
                console.error("All generation methods failed:", clientError);
                throw new Error(`Ошибка генерации: ${clientError.message}`);
            }
        }
    }
};
