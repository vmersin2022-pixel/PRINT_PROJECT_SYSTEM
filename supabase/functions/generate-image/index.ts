
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

declare const Deno: any;

// Получаем ключ из секретов Supabase ИЛИ используем хардкод-значение для быстрого старта
const API_KEY = Deno.env.get('POLLINATIONS_API_KEY') || Deno.env.get('VITE_POLLINATIONS_KEY') || 'sk_U9eN3uLF7gwPgVR7VW1Nv5q6A5L8ujI1';

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
      console.warn("Warning: Server API Key is missing, using default.");
    }

    // 2. Construct Pollinations URL
    const selectedModel = model || 'flux'; 
    const encodedPrompt = encodeURIComponent(prompt);
    
    // Формируем URL
    let url = `https://image.pollinations.ai/prompt/${encodedPrompt}?model=${selectedModel}&width=${width || 1024}&height=${height || 1024}&seed=${seed || 42}&nologo=true&enhance=false`;
    
    if (imageUrl) {
        const encodedImage = encodeURIComponent(imageUrl);
        url += `&image=${encodedImage}`;
    }

    // 3. Server-to-Server Request with Authorization Header
    console.log(`Proxying to AI (Model: ${selectedModel})...`);
    
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'User-Agent': 'PrintProjectProxy/1.0'
        }
    });

    if (!response.ok) {
        const errText = await response.text();
        console.error("AI Provider Error Body:", errText);
        throw new Error(`AI Provider Error: ${response.status} ${response.statusText}`);
    }

    // 4. Return Image Blob directly
    const imageBlob = await response.blob();

    return new Response(imageBlob, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000'
      },
      status: 200,
    })

  } catch (error: any) {
    console.error("Edge Function Critical Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
