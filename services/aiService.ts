
// Вспомогательная функция задержки
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const getPollinationsKey = () => {
    // Vite подтягивает переменные с префиксом VITE_ из окружения Amvera
    const apiKey = (import.meta as any).env?.VITE_POLLINATIONS_KEY || (import.meta as any).env?.VITE_API_KEY;
    return apiKey || "";
};

export const aiService = {
    // 1. Генерация текста (Название и Описание)
    generateProductDescription: async (name: string, categories: string[]) => {
        const apiKey = getPollinationsKey();
        const prompt = `Ты креативный директор бренда одежды "PRINT PROJECT". 
        Данные: Название "${name}", Категории: ${categories.join(', ')}.
        Задача: Придумай название и техническое описание. 
        Верни ТОЛЬКО чистый JSON объект: { "name": "...", "description": "..." }`;

        try {
            const headers: any = { 'Content-Type': 'application/json' };
            // Text API обычно нормально принимает ключи, но если будет ошибка - можно убрать и здесь
            if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

            const response = await fetch('https://text.pollinations.ai/openai', {
                method: 'POST',
                headers: headers,
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
            // Fallback mock if API fails
            return { name: name, description: "Автоматическое описание (API Error)" };
        }
    },

    // 2. ГЕНЕРАЦИЯ ЛУКБУКА (Image-to-Image / Vision)
    // Используем GET запрос к image.pollinations.ai с моделью FLUX
    generateLookbook: async (imageUrl: string, promptText: string) => {
        const seed = Math.floor(Math.random() * 1000000);
        const model = "flux"; 

        // Flux требует детального описания сцены.
        // Мы явно указываем, что принт (imageUrl) должен быть на футболке.
        const enhancedPrompt = `${promptText}. The photo MUST feature a black t-shirt with the specific graphic design provided in the image input. High quality, photorealistic, 8k, professional fashion photography, detailed texture.`;
        
        // Кодируем параметры
        const encodedPrompt = encodeURIComponent(enhancedPrompt);
        const encodedImage = encodeURIComponent(imageUrl);
        
        // Формируем URL
        // model=flux - лучшая модель для композиции
        // image=... - передаем ссылку на принт как исходник (Image-to-Image)
        // nologo=true - убираем водяной знак
        // enhance=false - отключаем авто-улучшение промпта, чтобы сохранить точность инструкции про принт
        const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?model=${model}&width=1024&height=1024&seed=${seed}&nologo=true&enhance=false&image=${encodedImage}`;

        try {
            // ВАЖНО: Убираем headers с Authorization для GET запроса картинки.
            // Сервер pollinations не разрешает этот заголовок в CORS для браузера.
            const response = await fetch(url);
            
            if (!response.ok) {
                if (response.status === 429) {
                    throw new Error(`Лимит генераций исчерпан. Подождите немного.`);
                }
                throw new Error(`Pollinations API Error: ${response.statusText}`);
            }
            
            const blob = await response.blob();
            // Возвращаем временную ссылку на Blob для отображения
            return URL.createObjectURL(blob);
        } catch (error: any) {
            console.error("Image Gen Error:", error);
            throw new Error(`Ошибка генерации: ${error.message}`);
        }
    }
};
