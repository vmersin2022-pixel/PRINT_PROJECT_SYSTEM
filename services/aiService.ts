
import { GoogleGenAI } from "@google/genai";

const getClient = () => {
    // 1. Безопасное получение ключа (Safe Access)
    let apiKey = (import.meta as any).env?.VITE_API_KEY;

    // 2. Fallback: Если переменные окружения не сработали
    if (!apiKey || apiKey === "undefined") {
        // Fallback key (Note: It's better to use your own key in .env for production)
        apiKey = "AIzaSyBSHOHNqhpsIe7Hu9nBjElbD1uc_vGdDno";
    }

    if (!apiKey || apiKey === "undefined") {
        console.error("API Key is missing.");
        throw new Error("API Key не найден! Проверьте настройки .env");
    }
    return new GoogleGenAI({ apiKey });
};

// Вспомогательная функция задержки
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// АГРЕССИВНОЕ СЖАТИЕ (512px)
// Это критически важно для Gemini 2.5 Flash Image на бесплатном тарифе
const compressImage = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const reader = new FileReader();

        reader.onload = (e) => {
            img.src = e.target?.result as string;
        };
        reader.onerror = (e) => reject(new Error("Ошибка чтения файла"));

        img.onload = () => {
            const canvas = document.createElement('canvas');
            // Уменьшаем до 512px. Это "золотой стандарт" для быстрой генерации превью.
            const MAX_DIMENSION = 512; 
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > MAX_DIMENSION) {
                    height *= MAX_DIMENSION / width;
                    width = MAX_DIMENSION;
                }
            } else {
                if (height > MAX_DIMENSION) {
                    width *= MAX_DIMENSION / height;
                    height = MAX_DIMENSION;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error("Ошибка контекста Canvas"));
                return;
            }
            
            // Белый фон (убираем прозрачность, так как JPEG её не поддерживает)
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(0, 0, width, height);
            
            ctx.drawImage(img, 0, 0, width, height);

            // Сжимаем в JPEG с качеством 0.6
            const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
            resolve(dataUrl.split(',')[1]); // Отдаем чистый base64
        };
        
        img.onerror = (e) => reject(new Error("Ошибка обработки изображения"));
    });
};

export const aiService = {
    // 1. Генерация текста
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
            // Fallback если 3-flash недоступна
            if (error.message.includes('404') || error.message.includes('not found')) {
                 throw new Error("Модель Gemini 3 Flash недоступна для вашего ключа.");
            }
            throw new Error("Ошибка генерации текста: " + error.message);
        }
    },

    // 2. Генерация изображений (Lookbook)
    generateLookbook: async (imageFile: File, promptText: string) => {
        const MAX_RETRIES = 2; // Уменьшаем кол-во попыток для скорости
        let lastError: any;

        // 1. Сжимаем (обязательно!)
        const base64Data = await compressImage(imageFile);

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                const ai = getClient();

                // Используем gemini-2.5-flash-image
                // Это единственная доступная модель для Image-to-Image в этом классе
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash-image',
                    contents: {
                        parts: [
                            {
                                inlineData: {
                                    mimeType: 'image/jpeg',
                                    data: base64Data
                                }
                            },
                            {
                                text: promptText + " (Photorealistic, highly detailed, professional photography)"
                            }
                        ]
                    }
                });

                // 2. Поиск картинки в ответе
                let generatedImageBase64 = null;
                
                // Иногда модель возвращает текст с отказом вместо картинки
                let refusalText = "";

                if (response.candidates?.[0]?.content?.parts) {
                    for (const part of response.candidates[0].content.parts) {
                        if (part.inlineData) {
                            generatedImageBase64 = part.inlineData.data;
                            break;
                        }
                        if (part.text) {
                            refusalText += part.text;
                        }
                    }
                }

                // 3. Обработка результата
                if (generatedImageBase64) {
                    return `data:image/png;base64,${generatedImageBase64}`;
                } else {
                    // Если картинки нет, проверяем причину
                    if (response.candidates?.[0]?.finishReason === 'SAFETY') {
                        throw new Error("SAFETY BLOCK: Изображение заблокировано фильтрами безопасности.");
                    }
                    if (refusalText) {
                        throw new Error(`Модель отказала в генерации: "${refusalText.slice(0, 100)}..."`);
                    }
                    throw new Error("Пустой ответ от модели (нет изображения).");
                }

            } catch (e: any) {
                console.warn(`AI Attempt ${attempt} failed:`, e.message);
                lastError = e;

                // Если 404 (модель не найдена) - нет смысла повторять
                if (e.message.includes('404') || e.message.includes('not found')) {
                    throw new Error("Модель 'gemini-2.5-flash-image' недоступна для вашего API ключа. Попробуйте сменить регион или ключ.");
                }

                // Если это 429 (лимиты), ждем и пробуем еще раз
                if (attempt < MAX_RETRIES) {
                    const delay = 5000 * attempt; // 5 сек, потом 10 сек
                    console.log(`Waiting ${delay}ms...`);
                    await wait(delay);
                }
            }
        }

        throw new Error(`Ошибка AI: ${lastError?.message || 'Не удалось сгенерировать'}`);
    }
};
