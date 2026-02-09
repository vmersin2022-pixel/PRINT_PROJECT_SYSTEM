// Вспомогательная функция задержки
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const getPollinationsKey = () => {
    // Vite подтягивает переменные с префиксом VITE_ из окружения Amvera
    const apiKey = (import.meta as any).env?.VITE_POLLINATIONS_KEY || (import.meta as any).env?.VITE_API_KEY;

    if (!apiKey || apiKey === "undefined") {
        console.error("Pollinations API Key is missing in Amvera settings.");
        throw new Error("API Key не найден! Добавьте VITE_POLLINATIONS_KEY в настройки Amvera.");
    }
    return apiKey;
};

// Сжатие изображения для ускорения передачи данных
const compressImage = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const reader = new FileReader();
        reader.onload = (e) => { img.src = e.target?.result as string; };
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_DIMENSION = 800; // Оптимально для Pollinations
            let width = img.width, height = img.height;
            if (width > height) {
                if (width > MAX_DIMENSION) { height *= MAX_DIMENSION / width; width = MAX_DIMENSION; }
            } else {
                if (height > MAX_DIMENSION) { width *= MAX_DIMENSION / height; height = MAX_DIMENSION; }
            }
            canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject(new Error("Canvas Error"));
            
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            
            resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        reader.readAsDataURL(file);
    });
};

export const aiService = {
    // 1. Генерация текста через Unified API
    generateProductDescription: async (name: string, categories: string[]) => {
        const apiKey = getPollinationsKey();
        const prompt = `Ты креативный директор киберпанк-бренда одежды "PRINT PROJECT". 
        Данные: Название "${name}", Категории: ${categories.join(', ')}.
        Задача: Придумай название и техническое описание. 
        Верни ТОЛЬКО чистый JSON объект: { "name": "...", "description": "..." }`;

        try {
            const response = await fetch('https://gen.pollinations.ai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: "openai", 
                    messages: [{ role: "user", content: prompt }]
                })
            });

            const data = await response.json();
            const text = data.choices[0].message.content;
            
            // Очистка от markdown-оберток ```json ... ```
            const cleanJson = text.replace(/```json|```/g, "").trim();
            return JSON.parse(cleanJson);
        } catch (e) {
            console.error("Text Gen Error:", e);
            throw new Error("Ошибка генерации описания товара.");
        }
    },

    // 2. Генерация изображений через Klein Large (Vision Mode)
    generateLookbook: async (imageFile: File, promptText: string) => {
        const apiKey = getPollinationsKey();
        const base64Image = await compressImage(imageFile);

        try {
            const response = await fetch('https://gen.pollinations.ai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: "klein-large", 
                    messages: [
                        {
                            role: "user",
                            content: [
                                { 
                                    type: "text", 
                                    text: `${promptText}. Highly detailed apparel mockup, realistic fabric, professional studio lighting. The attached image is the print design to be applied on the t-shirt.` 
                                },
                                { 
                                    type: "image_url", 
                                    image_url: { url: base64Image } 
                                }
                            ]
                        }
                    ],
                    seed: Math.floor(Math.random() * 1000000),
                    width: 768,
                    height: 1024
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error?.message || "Pollinations API Error");
            }

            const data = await response.json();
            const content = data.choices[0].message.content;

            // Извлечение ссылки на изображение из ответа (Markdown или прямой URL)
            const urlMatch = content.match(/\((https:\/\/.*?)\)/);
            const imageUrl = urlMatch ? urlMatch[1] : content.trim();

            if (!imageUrl.startsWith('http')) {
                throw new Error("API не вернул корректную ссылку на изображение.");
            }

            return imageUrl;

        } catch (error: any) {
            console.error("Image Gen Error:", error);
            throw new Error(`Ошибка генерации лукбука: ${error.message}`);
        }
    }
};
