import { GoogleGenAI } from "@google/genai";
import { supabase } from "../supabaseClient";

const getClient = () => {
    const apiKey = (import.meta as any).env.VITE_API_KEY;
    if (!apiKey || apiKey === "undefined") {
        throw new Error("API Key не найден! Проверьте VITE_API_KEY в настройках Vercel.");
    }
    return new GoogleGenAI({ apiKey });
};

const POLLINATIONS_KEY = 'sk_DMSauMBAFPyU4FTGlQDeXofP6TOLH3Q2';

export const aiService = {
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
                config: { responseMimeType: "application/json" }
            });

            const text = response.text;
            if (!text) throw new Error("Пустой ответ от нейросети");
            return JSON.parse(text);
        } catch (error: any) {
            console.error("AI Text Error:", error);
            throw new Error("Ошибка генерации текста: " + error.message);
        }
    },

    generateLookbook: async (imageFile: File, promptText: string) => {
        let tempFileName: string | null = null;
        try {
            const fileExt = imageFile.name.split('.').pop();
            tempFileName = `temp_gen_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            
            const { error: uploadError } = await supabase.storage
                .from('images')
                .upload(tempFileName, imageFile);

            if (uploadError) throw new Error("Ошибка загрузки файла: " + uploadError.message);

            const { data: { publicUrl } } = supabase.storage
                .from('images')
                .getPublicUrl(tempFileName);

            const enhancedPrompt = encodeURIComponent(
                `${promptText}, wearing t-shirt with this print design, professional fashion photography, cyberpunk aesthetic, 8k resolution`
            );
            
            // Оставляем image.pollinations.ai, но ключ передаем ТОЛЬКО в URL
            const baseUrl = `https://image.pollinations.ai/prompt/${enhancedPrompt}`;
            
            const params = new URLSearchParams({
                width: '1024',
                height: '1280',
                model: 'flux',
                nologo: 'true',
                enhance: 'true',
                image: publicUrl,
                key: POLLINATIONS_KEY // Ключ здесь
            });

            const url = `${baseUrl}?${params.toString()}`;

            // УДАЛИЛИ Headers, чтобы не было ошибки CORS
            const response = await fetch(url, { method: 'GET' });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Pollinations API Error: ${response.status} ${errText}`);
            }
            
            const blob = await response.blob();

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
            if (tempFileName) {
                await supabase.storage.from('images').remove([tempFileName]);
            }
        }
    }
};
