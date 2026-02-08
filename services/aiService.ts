
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

// Сжатие изображения перед отправкой
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
            // Ограничиваем размер до 800px для максимальной скорости и стабильности
            const MAX_DIMENSION = 800; 
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
            
            // Белый фон на случай прозрачного PNG
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(0, 0, width, height);
            
            ctx.drawImage(img, 0, 0, width, height);

            // JPEG 0.6 - оптимальный баланс для нейросети (ей не нужно супер качество исходника)
            const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
            resolve(dataUrl.split(',')[1]); // Отдаем чистый base64
        };
        
        img.onerror = (e) => reject(new Error("Ошибка загрузки изображения в Canvas"));
    });
};

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

    // 2. Генерация изображений (Gemini 3 Pro Image - Более мощная модель)
    generateLookbook: async (imageFile: File, promptText: string) => {
        const MAX_RETRIES = 3; 
        let lastError: any;

        const base64Data = await compressImage(imageFile);

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                const ai = getClient();

                // Используем gemini-3-pro-image-preview для лучшего качества и стабильности
                // Она может иметь другие квоты, отличные от Flash
                const response = await ai.models.generateContent({
                    model: 'gemini-3-pro-image-preview',
                    contents: {
                        parts: [
                            {
                                inlineData: {
                                    mimeType: 'image/jpeg',
                                    data: base64Data
                                }
                            },
                            {
                                text: promptText + " (High quality photorealistic fashion photography, 8k resolution, detailed texture)"
                            }
                        ]
                    }
                });

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
                    if (response.candidates?.[0]?.finishReason === 'SAFETY') {
                        throw new Error("SAFETY_BLOCK: Изображение заблокировано фильтрами безопасности.");
                    }
                    throw new Error("EMPTY_RESPONSE: Нейросеть не вернула изображение.");
                }

                return `data:image/png;base64,${generatedImageBase64}`;

            } catch (e: any) {
                console.warn(`AI Generation Attempt ${attempt} failed:`, e.message);
                lastError = e;

                if (attempt < MAX_RETRIES) {
                    // Экспоненциальная задержка: 4 сек -> 8 сек -> 16 сек
                    // Это быстрее чем фиксированные 35 сек, но дает API "остыть"
                    const delay = Math.pow(2, attempt + 1) * 1000;
                    console.log(`Waiting ${delay}ms before retry...`);
                    await wait(delay);
                }
            }
        }

        throw new Error(`Сбой генерации (Попыток: ${MAX_RETRIES}): ${lastError?.message || 'Неизвестная ошибка'}`);
    }
};
