
// Вспомогательная функция задержки
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const getPollinationsKey = () => {
    // Vite подтягивает переменные с префиксом VITE_ из окружения Amvera
    const apiKey = (import.meta as any).env?.VITE_POLLINATIONS_KEY || (import.meta as any).env?.VITE_API_KEY;
    // Note: For image generation via GET, key might not be strictly required for free tier, 
    // but good to have for text generation.
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
    // Используем GET запрос к image.pollinations.ai с моделью klein-large
    generateLookbook: async (imageUrl: string, promptText: string) => {
        const seed = Math.floor(Math.random() * 1000000);
        // Добавляем ключевые слова для реализма
        const enhancedPrompt = `${promptText}, photorealistic, 8k, highly detailed, professional photography, fashion shoot, wearing black t-shirt`;
        
        // Кодируем параметры
        const encodedPrompt = encodeURIComponent(enhancedPrompt);
        const encodedImage = encodeURIComponent(imageUrl);
        
        // Формируем URL
        // model=klein-large - для высокого качества
        // nologo=true - убираем водяной знак
        // enhance=true - улучшаем промпт автоматически
        const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?model=klein-large&width=1024&height=1024&seed=${seed}&nologo=true&enhance=true&image=${encodedImage}`;

        try {
            // Делаем запрос, чтобы получить картинку как Blob
            const response = await fetch(url);
            if (!response.ok) {
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
