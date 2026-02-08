
import { GoogleGenAI } from "@google/genai";

const getClient = () => {
    // Безопасное получение ключа для Vite
    const apiKey = (import.meta as any).env?.VITE_API_KEY;

    if (!apiKey || apiKey === "undefined") {
        console.error("API Key is missing.");
        throw new Error("API Key не найден! Проверьте настройки (.env).");
    }
    return new GoogleGenAI({ apiKey });
};

// Вспомогательная функция задержки
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Конвертация файла в чистую Base64 строку (без префикса data:...)
async function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            // Отделяем метаданные, берем только контент после запятой
            const base64 = result.split(',')[1]; 
            resolve(base64);
        };
        reader.onerror = error => reject(error);
    });
}

export const aiService = {
    // 1. Генерация текста (Gemini 3 Flash)
    generateProductDescription: async (name: string, categories: string[]) => {
        const ai = getClient();
        
        const prompt = `
            Ты креативный директор киберпанк-бренда одежды "PRINT PROJECT". 
            Стиль: сухой, технический, "system logs". 
            Данные: Название "${name}", Категории: ${categories.join(', ')}.
            Задача: Придумай название (name) и описание (description).
            Верни ТОЛЬКО JSON объект.
        `;

        try {
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: {
                    responseMimeType: "application/json"
                }
            });

            const text = response.text;
            if (!text) throw new Error("Пустой ответ от нейросети");
            return JSON.parse(text);
        } catch (error: any) {
            console.error("AI Text Error:", error);
            throw new Error("Ошибка генерации текста: " + error.message);
        }
    },

    // 2. Генерация изображений (Gemini 2.5 Flash Image) с умным повтором (Smart Retry)
    generateLookbook: async (imageFile: File, promptText: string) => {
        // Уменьшаем кол-во попыток до 3, так как ожидание при ошибке 429 очень долгое (30+ сек)
        const MAX_RETRIES = 3; 
        let lastError: any;

        const base64Data = await fileToBase64(imageFile);

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                const ai = getClient();

                // Запрос к модели
                // Используем gemini-2.5-flash-image как наиболее стабильную модель для визуальных задач
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash-image',
                    contents: {
                        parts: [
                            {
                                inlineData: {
                                    mimeType: imageFile.type,
                                    data: base64Data
                                }
                            },
                            {
                                text: promptText + " (High quality photorealistic fashion photography, detailed fabric texture, professional lighting)"
                            }
                        ]
                    }
                });

                // Ищем изображение в ответе
                let generatedImageBase64 = null;
                if (response.candidates?.[0]?.content?.parts) {
                    for (const part of response.candidates[0].content.parts) {
                        if (part.inlineData) {
                            generatedImageBase64 = part.inlineData.data;
                            break;
                        }
                    }
                }

                if (!generatedImageBase64) {
                    // Проверка на Safety Filters
                    if (response.candidates?.[0]?.finishReason === 'SAFETY') {
                        throw new Error("Генерация заблокирована фильтром безопасности (Safety Filter). Попробуйте другое фото.");
                    }
                    throw new Error("Gemini не вернул изображение (пустой ответ). Возможно, модель перегружена.");
                }

                // Успех
                return `data:image/png;base64,${generatedImageBase64}`;

            } catch (e: any) {
                console.warn(`AI Generation Attempt ${attempt}/${MAX_RETRIES} failed:`, e.message);
                lastError = e;

                // ЛОГИКА ОБРАБОТКИ ОШИБОК
                const errorMsg = e.message?.toLowerCase() || '';
                const isRateLimit = errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('exhausted');

                if (isRateLimit && attempt < MAX_RETRIES) {
                    // Если лимиты исчерпаны, API обычно просит подождать ~30-35 секунд.
                    // Ждем 35 секунд, чтобы наверняка.
                    console.log("⏳ Quota Exceeded (429). Waiting 35 seconds before retry...");
                    await wait(35000); 
                } else if (attempt < MAX_RETRIES) {
                    // Обычная ошибка (сеть, 500 и т.д.) - ждем 2 секунды
                    await wait(2000);
                }
            }
        }

        // Если все попытки провалились
        throw new Error(`Не удалось сгенерировать изображение: ${lastError?.message || 'Неизвестная ошибка'}`);
    }
};
