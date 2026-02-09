
const express = require('express');
const cors = require('cors');
// Dynamic import for node-fetch (ESM module support in CommonJS)
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();
const PORT = process.env.PORT || 80;

// Enable CORS for your main website
app.use(cors({
    origin: '*', // В продакшене лучше заменить на адрес твоего сайта
    methods: ['POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'] // Added Authorization to allowed headers
}));

app.use(express.json());

app.get('/', (req, res) => {
    res.send('Print Project AI Proxy is Running. Status: Online.');
});

app.post('/generate', async (req, res) => {
    console.log(`[${new Date().toLocaleTimeString()}] New Generation Request`);

    try {
        const { prompt, imageUrl, model, width, height } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        // 1. Construct the URL
        // REMOVED: The automatic suffix ". Professional fashion photography..."
        // Now we send exactly what the user typed/selected.
        const encodedPrompt = encodeURIComponent(prompt);
        
        // 2. Build the Pollinations URL
        // Adding random seed to ensure variety
        const seed = Math.floor(Math.random() * 1000000);
        let url = `https://image.pollinations.ai/prompt/${encodedPrompt}?model=${model || 'flux'}&width=${width || 1024}&height=${height || 1024}&nologo=true&seed=${seed}&enhance=false`;
        
        if (imageUrl) {
            url += `&image=${encodeURIComponent(imageUrl)}`;
        }

        console.log(`--> Proxying to AI Provider: ${model || 'flux'}`);
        console.log(`--> Prompt: ${prompt.substring(0, 50)}...`);

        // 3. Server-to-Server Fetch
        // This runs on the server, so no CORS issues and stable connection
        const aiResponse = await fetch(url, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) PrintProjectProxy/1.0',
                // Authorization header is used if provided in env vars
                'Authorization': `Bearer ${process.env.POLLINATIONS_API_KEY}`
            },
            timeout: 120000 // 2 minutes timeout (Amvera allows long connections)
        });

        if (!aiResponse.ok) {
            const errText = await aiResponse.text();
            console.error('AI Provider Error:', errText);
            throw new Error(`Provider responded with ${aiResponse.status}: ${errText}`);
        }

        // 4. Stream the image back to the frontend
        const arrayBuffer = await aiResponse.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        res.set('Content-Type', 'image/jpeg');
        res.send(buffer);
        console.log(`[${new Date().toLocaleTimeString()}] Success: Image sent to client`);

    } catch (error) {
        console.error('Critical Proxy Error:', error.message);
        res.status(500).json({ 
            error: 'Generation failed on proxy server', 
            details: error.message 
        });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Proxy server started on port ${PORT}`);
});
