
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

declare const Deno: any;

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
    const { prompt, imageUrl, model, width, height } = await req.json();

    // 2. Security: Get API Key from Supabase Secrets (Best practice)
    // Fallback to hardcoded key only if secret is not set
    const API_KEY = Deno.env.get('POLLINATIONS_API_KEY') || 'sk_U9eN3uLF7gwPgVR7VW1Nv5q6A5L8ujI1';

    // 3. Construct the Pollinations Request
    const selectedModel = model || 'flux';
    const enhancedPrompt = `${prompt}. Professional fashion photography, high-end commercial style, 8k resolution, crisp details.`;
    const encodedPrompt = encodeURIComponent(enhancedPrompt);
    
    let url = `https://image.pollinations.ai/prompt/${encodedPrompt}?model=${selectedModel}&width=${width || 1024}&height=${height || 1024}&nologo=true&seed=${Math.floor(Math.random() * 1000000)}&enhance=false`;
    
    if (imageUrl) {
        url += `&image=${encodeURIComponent(imageUrl)}`;
    }

    console.log(`AI Proxy: Requesting from Pollinations (Model: ${selectedModel})...`);

    // 4. Server-to-Server Fetch (Authorized)
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'User-Agent': 'PrintProjectProxy/2.0'
        }
    });

    if (!response.ok) {
        const errText = await response.text();
        console.error("Pollinations Provider Error:", errText);
        throw new Error(`AI Provider Error: ${response.status} ${response.statusText}`);
    }

    // 5. Stream the Image Blob back to Frontend
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
