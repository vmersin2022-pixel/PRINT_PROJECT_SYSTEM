
const express = require('express');
const cors = require('cors');
// Dynamic import for node-fetch (ESM module support in CommonJS)
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();
const PORT = process.env.PORT || 80;

// Enable CORS for your main website
app.use(cors({
    origin: '*', 
    methods: ['POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'] 
}));

app.use(express.json());

app.get('/', (req, res) => {
    res.send('Print Project AI Proxy is Running (Fixed v2.2). Status: Online.');
});

app.post('/generate', async (req, res) => {
    const time = new Date().toLocaleTimeString();
    console.log(`[${time}] New Generation Request`);

    try {
        // 1. Safe Body Extraction
        const body = req.body || {};
        const { prompt, imageUrl, model, width, height } = body;

        // 2. Validation
        if (!prompt) {
            console.error(`[${time}] Error: Prompt missing`);
            return res.status(400).json({ error: 'Prompt is required' });
        }

        // 3. Encoding (Explicit declaration to prevent ReferenceError)
        const promptStr = String(prompt);
        const encodedPrompt = encodeURIComponent(promptStr);
        
        // 4. Model Selection
        const selectedModel = model || 'flux';
        const seed = Math.floor(Math.random() * 1000000);
        
        // 5. Build URL
        // Using explicit variable 'encodedPrompt'
        let url = `https://image.pollinations.ai/prompt/${encodedPrompt}?model=${selectedModel}&width=${width || 1024}&height=${height || 1024}&nologo=true&seed=${seed}&enhance=false`;
        
        if (imageUrl && typeof imageUrl === 'string') {
            url += `&image=${encodeURIComponent(imageUrl)}`;
        }

        console.log(`[${time}] Proxying to Model: ${selectedModel}`);
        // console.log(`[${time}] URL: ${url}`); // Uncomment for debugging (hide if sensitive)

        // 6. External Fetch
        const aiResponse = await fetch(url, {
            method: 'GET',
            headers: {
                'User-Agent': 'PrintProjectProxy/2.2',
                // Only send Auth header if Key is present
                ...(process.env.POLLINATIONS_API_KEY ? { 'Authorization': `Bearer ${process.env.POLLINATIONS_API_KEY}` } : {})
            },
            timeout: 120000 // 2 minutes
        });

        if (!aiResponse.ok) {
            const errText = await aiResponse.text();
            console.error(`[${time}] AI Provider Error (${aiResponse.status}):`, errText);
            throw new Error(`AI Provider responded with ${aiResponse.status}: ${errText}`);
        }

        // 7. Success Response
        const arrayBuffer = await aiResponse.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        res.set('Content-Type', 'image/jpeg');
        res.send(buffer);
        console.log(`[${time}] Success: Image sent to client`);

    } catch (error) {
        console.error(`[${time}] Server Error:`, error.message);
        // Return 500 with details so frontend knows what happened
        res.status(500).json({ 
            error: 'Generation failed on proxy server', 
            details: error.message || 'Unknown server error'
        });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Proxy server started on port ${PORT}`);
});
