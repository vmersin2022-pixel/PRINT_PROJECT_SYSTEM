
import { GoogleGenAI } from "@google/genai";
import { supabase } from "../supabaseClient";

// Инициализация через официальный метод нового SDK
const getClient = () => {
    const apiKey = (import.meta as any).env.VITE_API_KEY;
    if (!apiKey || apiKey === "undefined") {
        throw new Error("API Key не найден! Проверьте VITE_API_KEY в настройках Vercel.");
    }
    return new GoogleGenAI({ apiKey });
};

// Pollinations API Key provided by user
const POLLINATIONS_KEY = 'sk_DMSauMBAFPyU4FTGlQDeXofP6TOLH3Q2';

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

    // 2. Генерация изображений (Pollinations.ai / Flux Schnell)
    // ОБНОВЛЕНО: Используем метод GET с API Key и ссылкой на изображение
    generateLookbook: async (imageFile: File, promptText: string) => {
        let tempFileName: string | null = null;
        try {
            // 1. Сначала загружаем файл в Supabase, чтобы получить публичную ссылку
            // Pollinations через GET не умеет принимать файлы напрямую, только URL
            const fileExt = imageFile.name.split('.').pop();
            tempFileName = `temp_gen_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            
            const { error: uploadError } = await supabase.storage
                .from('images')
                .upload(tempFileName, imageFile);

            if (uploadError) throw new Error("Ошибка загрузки файла для обработки: " + uploadError.message);

            const { data: { publicUrl } } = supabase.storage
                .from('images')
                .getPublicUrl(tempFileName);

            // 2. Формируем GET запрос к Pollinations с API Key
            const enhancedPrompt = encodeURIComponent(
                `${promptText}, wearing t-shirt with this print design, professional fashion photography, cyberpunk aesthetic, volumetric lighting, 8k resolution, highly detailed texture, grunge style background`
            );
            
            // Используем официальный endpoint
            const baseUrl = `https://image.pollinations.ai/prompt/${enhancedPrompt}`;
            
            const params = new URLSearchParams({
                width: '1024',
                height: '1280',
                model: 'flux',
                nologo: 'true',
                enhance: 'true',
                image: publicUrl, // Передаем ссылку на наш принт
                key: POLLINATIONS_KEY // Передаем API ключ
            });

            const url = `${baseUrl}?${params.toString()}`;

            const response = await fetch(url, {
                method: 'GET',
                // Дублируем ключ в заголовке для надежности
                headers: {
                    'Authorization': `Bearer ${POLLINATIONS_KEY}`
                }
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Pollinations API Error: ${response.status} ${errText}`);
            }
            
            const blob = await response.blob();

            // 3. Конвертируем результат в Base64 для отображения
            return await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });

        } catch (e: any) {
            console.error("AI Image Error", e);
            throw new Error(e.message || "Не удалось сгенерировать изображение.");
        } finally {
            // 4. Очищаем временный файл из Supabase
            if (tempFileName) {
                await supabase.storage.from('images').remove([tempFileName]);
            }
        }
    }
};
