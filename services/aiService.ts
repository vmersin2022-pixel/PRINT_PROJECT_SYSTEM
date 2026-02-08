
import { GoogleGenAI } from "@google/genai";
import { supabase } from "../supabaseClient";

const getClient = () => {
    // 1. Безопасное получение ключа (Safe Access)
    // Используем опциональную цепочку (?.), чтобы приложение не падало, если env еще не загружен
    let apiKey = (import.meta as any).env?.VITE_API_KEY;

    // 2. Fallback: Если переменные окружения не сработали, используем ключ напрямую
    // (Это решит вашу проблему "undefined is not an object")
    if (!apiKey) {
        apiKey = "AIzaSyBSHOHNqhpsIe7Hu9nBjElbD1uc_vGdDno";
    }

    if (!apiKey || apiKey === "undefined") {
        console.error("API Key is missing.");
        throw new Error("API Key не найден! Проверьте настройки.");
    }
    return new GoogleGenAI({ apiKey });
};

// Вспомогательная функция задержки
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const aiService = {
    // 1. Генерация текста (Google Gemini 3 Flash)
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

    // 2. Генерация изображений (Gemini 2.5 Flash Image) с повторными попытками
    generateLookbook: async (imageFile: File, promptText: string) => {
        const MAX_RETRIES = 5;
        const RETRY_DELAY = 1000; // 1 секунда между попытками

        let lastError: any;

        // Конвертация файла в Base64 (делаем один раз до цикла)
        const base64Data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(imageFile);
            reader.onload = () => {
                const result = reader.result as string;
                resolve(result.split(',')[1]);
            };
            reader.onerror = error => reject(error);
        });

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                const ai = getClient();

                // Запрос к модели Gemini
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
                                text: promptText + " Крупный макроснимок белой хлопковой ткани, на которой нанесён типографский принт (принт приложен к заданию). Ракурс низкий и слегка диагональный, камера расположена очень близко к поверхности, создавая ощущение глубины и фокус на текстуре ткани. Экспозиция мягкая и светлая, с рассеянным дневным светом, подчёркивающим матовую поверхность материала и мелкие волокна.Принт выполнен методом дтф:  буквы выглядят плотно нанесёнными и слегка глянцевыми. Хорошо различима лёгкая фактура чернил, создающая рельеф. На ткани видны мелкие ворсинки, что добавляет реалистичности. Глубина резкости мала: передний план и центр изображения в резком фокусе, края плавно размыты"
                            }
                        ]
                    }
                });

                // Извлечение изображения из ответа
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
                    throw new Error("Gemini не вернул изображение (пустой ответ).");
                }

                // Если успешно - возвращаем результат
                return `data:image/png;base64,${generatedImageBase64}`;

            } catch (e: any) {
                console.warn(`AI Generation Attempt ${attempt}/${MAX_RETRIES} failed:`, e.message);
                lastError = e;

                // Если это была не последняя попытка, ждем перед следующей
                if (attempt < MAX_RETRIES) {
                    await wait(RETRY_DELAY);
                }
            }
        }

        // Если цикл завершился и успеха нет, выбрасываем последнюю ошибку
        console.error("AI Image Error (Final):", lastError);
        throw new Error(lastError?.message || "Не удалось сгенерировать изображение после 5 попыток.");
    }
};
