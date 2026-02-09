
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

declare const Deno: any;

// Получаем ключ из секретов Supabase (нужно добавить его в Dashboard)
const API_KEY = Deno.env.get('POLLINATIONS_API_KEY') || Deno.env.get('VITE_POLLINATIONS_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 1. Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { prompt, imageUrl, model, width, height, seed } = await req.json();

    if (!API_KEY) {
      throw new Error('Server API Key not configured');
    }

    // 2. Construct Pollinations URL
    const encodedPrompt = encodeURIComponent(prompt);
    const encodedImage = imageUrl ? encodeURIComponent(imageUrl) : '';
    
    // Формируем URL
    let url = `https://image.pollinations.ai/prompt/${encodedPrompt}?model=${model || 'flux'}&width=${width || 1024}&height=${height || 1024}&seed=${seed || 42}&nologo=true&enhance=false`;
    
    if (encodedImage) {
        url += `&image=${encodedImage}`;
    }

    // 3. Server-to-Server Request with Authorization Header
    // Серверы могут обмениваться заголовками без CORS блокировок
    console.log("Proxying to AI:", url);
    
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'User-Agent': 'PrintProjectProxy/1.0'
        }
    });

    if (!response.ok) {
        const errText = await response.text();
        console.error("AI Error:", errText);
        throw new Error(`AI Provider Error: ${response.status} ${response.statusText}`);
    }

    // 4. Return Image Blob directly
    const imageBlob = await response.blob();

    return new Response(imageBlob, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000' // Кэшируем успешный результат
      },
      status: 200,
    })

  } catch (error: any) {
    console.error("Function Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
