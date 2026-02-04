import { GoogleGenAI } from "@google/genai";
import { supabase } from "../supabaseClient";

const getClient = () => {
    const apiKey = (import.meta as any).env.VITE_API_KEY;
    if (!apiKey || apiKey === "undefined") throw new Error("API Key Gemini не найден!");
    return new GoogleGenAI({ apiKey });
};

const POLLINATIONS_KEY = 'sk_DMSauMBAFPyU4FTGlQDeXofP6TOLH3Q2';

export const aiService = {
    // 1. ТЕКСТ (Gemini)
    generateProductDescription: async (name: string, categories: string[]) => {
        const ai = getClient();
        const prompt = `Ты креативный директор бренда "PRINT PROJECT". Стиль: киберпанк. Название "${name}", Категории: ${categories.join(', ')}. Верни ТОЛЬКО JSON: {"name": "...", "description": "..."}`;
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text);
    },

    // 2. ИЗОБРАЖЕНИЕ (Pollinations + Supabase)
    generateLookbook: async (imageFile: File, promptText: string) => {
        let tempFileName: string | null = null;
        try {
            // ШАГ 1: Загружаем в Supabase (нам нужен URL принта для нейронки)
            const fileExt = imageFile.name.split('.').pop();
            tempFileName = `temp_${Date.now()}.${fileExt}`;
            
            await supabase.storage.from('images').upload(tempFileName, imageFile);
            const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(tempFileName);

            // ШАГ 2: Формируем магическую ссылку
            const enhancedPrompt = encodeURIComponent(
                `${promptText}, model wearing high-end streetwear with this print: ${publicUrl}, hyper-realistic, 8k, cyberpunk aesthetic`
            );
            
            // Используем официальный endpoint и передаем ключ как параметр
            // ВАЖНО: Мы не делаем fetch(), мы просто возвращаем готовую строку-ссылку
            const finalUrl = `https://gen.pollinations.ai/image/${enhancedPrompt}?width=1024&height=1280&model=flux&nologo=true&enhance=true&key=${POLLINATIONS_KEY}&seed=${Math.floor(Math.random() * 100000)}`;

            // Возвращаем URL. В админке подставь его в src картинки.
            return finalUrl;

        } catch (e: any) {
            console.error("AI Error:", e);
            throw new Error(e.message || "Ошибка генерации");
        }
    }
};
