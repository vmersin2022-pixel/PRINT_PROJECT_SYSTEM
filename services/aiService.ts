import { GoogleGenAI } from "@google/generative-ai";

// Инициализация клиента "на лету" для избежания ошибок при загрузке страницы
const getClient = () => {
    const apiKey = (import.meta as any).env.VITE_API_KEY;
    if (!apiKey || apiKey === "undefined") {
        throw new Error("API Key не найден! Проверьте VITE_API_KEY в настройках Vercel и сделайте Redeploy.");
    }
    return new GoogleGenAI(apiKey);
};

// Сжатие изображения перед отправкой
const resizeImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const MAX_SIZE = 1024;

                if (width > height) {
                    if (width > MAX_SIZE) {
                        height *= MAX_SIZE / width;
                        width = MAX_SIZE;
                    }
                } else {
                    if (height > MAX_SIZE) {
                        width *= MAX_SIZE / height;
                        height = MAX_SIZE;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                resolve(dataUrl.split(',')[1]); 
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
};

export const aiService = {
    // 1. Генерация текста (Название и Описание)
    generateProductDescription: async (name: string, categories: string[]) => {
        try {
            const genAI = getClient();
            const model = genAI.getGenerativeModel({ 
                model: "gemini-1.5-flash",
                generationConfig: { responseMimeType: "application/json" }
            });

            const prompt = `
                Ты креативный директор киберпанк-бренда одежды "PRINT PROJECT". 
                Твой стиль: сухой, технический, футуристичный, "system logs". 
                Используй термины: 'PROTOCOL', 'UNIT', 'DATA', 'SYSTEM', 'FABRIC_SHELL'.
                
                Входные данные товара:
                Название (черновик): "${name}"
                Категории: ${categories.join(', ')}
                
                Задача:
                1. Придумай крутое название товара. Стиль: "T-SHIRT [CODE_NAME]" или "HOODIE [SYSTEM_ID]".
                2. Напиши описание товара (до 300 символов). Опиши крой, ткань (хлопок), ощущения. Без эмодзи. Используй CAPS LOCK для акцентов.
                
                Верни ответ ТОЛЬКО в формате JSON:
                {
                    "name": "string",
                    "description": "string"
                }
            `;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            
            return JSON.parse(text);
        } catch (error: any) {
            console.error("AI Text Service Error:", error);
            throw new Error(error.message || "Ошибка генерации текста");
        }
    },

    // 2. Анализ изображения (Vision)
    // Примечание: Эта модель возвращает ТЕКСТ (описание лукбука), а не файл картинки.
    generateLookbook: async (imageFile: File, promptText: string) => {
        try {
            const genAI = getClient();
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            
            const base64Data = await resizeImage(imageFile);

            const result = await model.generateContent([
                {
                    inlineData: {
                        mimeType: "image/jpeg",
                        data: base64Data
                    }
                },
                { text: promptText }
            ]);

            const response = await result.response;
            return response.text(); // Возвращает текстовое описание
        } catch (error: any) {
            console.error("AI Image Service Error:", error);
            throw new Error(error.message || "Ошибка анализа изображения");
        }
    }
};
