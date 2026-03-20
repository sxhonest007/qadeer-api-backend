import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import axios from 'axios';
import * as cheerio from 'cheerio';
import qrcode from 'qrcode';
import bwipjs from 'bwip-js';
import mumaker from 'mumaker';
import fetch from 'node-fetch';
import FormData from 'form-data';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// ==========================================
// 🗄️ DATABASE & USAGE TRACKING (Optional)
// ==========================================
if (process.env.MONGO_URI) {
    mongoose.connect(process.env.MONGO_URI).then(() => console.log("✅ MongoDB + Usage Ready"));
}

const keySchema = new mongoose.Schema({ key: String, name: String, createdAt: Date, usage: { type: Number, default: 0 } });
const Key = mongoose.model('Key', keySchema) || mongoose.models.Key;

const usageSchema = new mongoose.Schema({ key: String, endpoint: String, time: { type: Date, default: Date.now } });
const UsageLog = mongoose.model('Usage', usageSchema) || mongoose.models.Usage;

// Helper function for Usage Logging
async function logUsage(key, endpoint) {
    if (process.env.MONGO_URI) {
        try { await new UsageLog({ key: key || "demo", endpoint }).save(); } catch (e) {}
    }
}

// ==========================================
// 🚀 ROOT & AUTH APIs
// ==========================================
app.get('/', (req, res) => res.json({ live: true, version: "Abbas Advanced API Hub v1.0", status: "All Systems Go 🚀" }));

app.get('/v1/generate-key', async (req, res) => {
    const k = "sk-abbas-" + Math.random().toString(36).substring(2, 20);
    if (process.env.MONGO_URI) await new Key({ key: k, name: req.query.name || "Bot Key", usage: 0 }).save();
    res.json({ success: true, key: k, message: "Copy kar ke bot mein laga lo!" });
});

// ==========================================
// 🤖 1. AI APIs
// ==========================================

// Gemini AI
app.get('/api/ai/gemini', async (req, res) => {
    try {
        await logUsage(req.query.key, '/api/ai/gemini');
        const query = req.query.text;
        if (!query) return res.status(400).json({ status: false, msg: "text parameter missing" });
        const { data } = await axios.get(`https://zelapioffciall.koyeb.app/ai/gemini?text=${encodeURIComponent(query)}`);
        res.json({ status: true, result: data.result.response, model: "Gemini" });
    } catch (e) { res.status(500).json({ status: false, msg: "AI Server Error" }); }
});

// GLM AI
app.get('/api/ai/glm', async (req, res) => {
    try {
        await logUsage(req.query.key, '/api/ai/glm');
        const { data } = await axios.get(`https://zelapioffciall.koyeb.app/ai/glm?text=${encodeURIComponent(req.query.text)}`);
        res.json({ status: true, result: data.result.response, model: "GLM" });
    } catch (e) { res.status(500).json({ status: false, msg: "API Error" }); }
});

// PowerBrain AI
app.get('/api/ai/powerbrain', async (req, res) => {
    try {
        const { data } = await axios.get(`https://www.movanest.xyz/v2/powerbrainai?query=${encodeURIComponent(req.query.text)}`);
        res.json({ status: true, result: data.results });
    } catch (e) { res.status(500).json({ status: false, msg: "API Error" }); }
});

// Text to Image (Creartai)
app.post('/api/ai/text2img', async (req, res) => {
    try {
        await logUsage(req.query.key, '/api/ai/text2img');
        const prompt = req.body.prompt || req.query.prompt;
        if (!prompt) return res.status(400).json({ status: false, msg: "prompt missing" });
        
        const form = new FormData();
        form.append('prompt', prompt);
        form.append('input_image_type', 'text2image');
        form.append('aspect_ratio', '4x5'); 
        form.append('guidance_scale', '9.5');
        
        const response = await axios.post('https://api.creartai.com/api/v2/text2image', form, {
            headers: { ...form.getHeaders() }, responseType: 'arraybuffer' 
        });
        const base64 = Buffer.from(response.data, 'binary').toString('base64');
        res.json({ status: true, image_base64: `data:image/jpeg;base64,${base64}` });
    } catch (e) { res.status(500).json({ status: false, msg: "Image Gen Failed" }); }
});

// ==========================================
// 📥 2. DOWNLOADER APIs
// ==========================================

// TikTok Downloader (Tikwm Native Scraper)
app.get('/api/dl/tiktok', async (req, res) => {
    try {
        await logUsage(req.query.key, '/api/dl/tiktok');
        const url = req.query.url;
        if (!url) return res.status(400).json({ status: false, msg: "url parameter missing" });

        const encodedParams = new URLSearchParams();
        encodedParams.set("url", url);
        encodedParams.set("hd", "1");
        
        const response = await axios.post("https://tikwm.com/api/", encodedParams.toString(), {
            headers: { "Content-Type": "application/x-www-form-urlencoded" }
        });
        
        if (response.data.code !== 0) throw new Error("API failed");
        res.json({ 
            status: true, 
            title: response.data.data.title, 
            author: response.data.data.author.nickname,
            video: response.data.data.play || response.data.data.wmplay 
        });
    } catch (e) { res.status(500).json({ status: false, msg: "TikTok Scraper Error" }); }
});

// YouTube MP4 (Movanest Wrapper)
app.get('/api/dl/ytmp4', async (req, res) => {
    try {
        await logUsage(req.query.key, '/api/dl/ytmp4');
        const { data } = await axios.get(`https://www.movanest.xyz/v2/ytmp4?url=${encodeURIComponent(req.query.url)}`);
        const videoData = data.result.quality_list['720p'] || Object.values(data.result.quality_list)[0];
        res.json({ status: true, title: data.result.title, download_url: videoData.url });
    } catch (e) { res.status(500).json({ status: false, msg: "YT Downloader Error" }); }
});

// YouTube MP3 (xwolf Wrapper)
app.get('/api/dl/ytmp3', async (req, res) => {
    try {
        const { data } = await axios.get(`https://apis.xwolf.space/download/ytmp3?url=${encodeURIComponent(req.query.url)}`);
        res.json({ status: true, title: data.title, download_url: data.downloadUrl, thumbnail: data.thumbnail });
    } catch (e) { res.status(500).json({ status: false, msg: "YT Audio Error" }); }
});

// Instagram Downloader
app.get('/api/dl/instagram', async (req, res) => {
    try {
        const { data } = await axios.get(`https://api.giftedtech.co.ke/api/download/instadl?apikey=gifted&url=${encodeURIComponent(req.query.url)}`);
        res.json({ status: true, download_url: data.result.download_url });
    } catch (e) { res.status(500).json({ status: false, msg: "IG Downloader Error" }); }
});

// CapCut Downloader
app.get('/api/dl/capcut', async (req, res) => {
    try {
        const { data } = await axios.get(`https://api.nekolabs.web.id/dwn/capcut?url=${encodeURIComponent(req.query.url)}`);
        res.json({ status: true, title: data.result.title, video_url: data.result.videoUrl });
    } catch (e) { res.status(500).json({ status: false, msg: "Capcut Downloader Error" }); }
});

// MediaFire Downloader
app.get('/api/dl/mediafire', async (req, res) => {
    try {
        const { data } = await axios.get(`https://api.nekolabs.web.id/dwn/mediafire?url=${encodeURIComponent(req.query.url)}`);
        res.json({ status: true, file_name: data.result.filename, download_url: data.result.download_url });
    } catch (e) { res.status(500).json({ status: false, msg: "Mediafire Error" }); }
});

// ==========================================
// 🔍 3. SEARCH APIs (Google & Pinterest)
// ==========================================

// Google Image Search (Native Scraper)
app.get('/api/search/gimage', async (req, res) => {
    try {
        await logUsage(req.query.key, '/api/search/gimage');
        const query = req.query.q;
        if (!query) return res.status(400).json({ status: false, msg: "q missing" });

        const params = new URLSearchParams({ q: query, tbm: "isch", safe: "off" });
        const response = await fetch(`https://www.google.com/search?${params.toString()}`, {
            headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/133.0.0.0 Safari/537.36" }
        });
        
        const text = await response.text();
        const $ = cheerio.load(text);
        const pattern = /\[1,\[0,"(?<id>[\d\w\-_]+)",\["https?:\/\/(?:[^"]+)",\d+,\d+\]\s?,\["(?<url>https?:\/\/(?:[^"]+))",\d+,\d+\]/gm;
        const matches = $.html().matchAll(pattern);
        
        let images = [];
        for (const match of matches) {
            if (match.groups?.url) {
                const decodedUrl = decodeURIComponent(JSON.parse(`"${match.groups.url}"`));
                if (/.*\.(jpe?g|png|gif|webp)$/gi.test(decodedUrl)) images.push(decodedUrl);
            }
        }
        res.json({ status: true, count: images.length, results: images.slice(0, 15) });
    } catch (e) { res.status(500).json({ status: false, msg: "Google Image Error" }); }
});

// Pinterest Search
app.get('/api/search/pinterest', async (req, res) => {
    try {
        const { data } = await axios.get(`https://www.movanest.xyz/v2/pinterest?query=${encodeURIComponent(req.query.q)}&pageSize=10`);
        res.json({ status: true, results: data.results });
    } catch (e) { res.status(500).json({ status: false, msg: "Pinterest Error" }); }
});

// ==========================================
// 🛠️ 4. TOOLS & FUN APIs
// ==========================================

// QR Code Generator
app.get('/api/tools/qr', async (req, res) => {
    try {
        const text = req.query.text;
        if (!text) return res.status(400).json({ status: false, msg: "text missing" });
        const buffer = await qrcode.toDataURL(text, { scale: 8 });
        res.json({ status: true, base64: buffer });
    } catch (e) { res.status(500).json({ status: false, msg: "QR Error" }); }
});

// Barcode Generator
app.get('/api/tools/barcode', async (req, res) => {
    try {
        const text = req.query.text;
        if (!text) return res.status(400).json({ status: false, msg: "text missing" });
        let png = await bwipjs.toBuffer({ bcid: 'code128', text: text.slice(0, 50), scale: 3, height: 10 });
        const base64 = png.toString('base64');
        res.json({ status: true, base64: `data:image/png;base64,${base64}` });
    } catch (e) { res.status(500).json({ status: false, msg: "Barcode Error" }); }
});

// URL Shortener (TinyURL)
app.get('/api/tools/shorten', async (req, res) => {
    try {
        const { data } = await axios.get(`https://tinyurl.com/api-create.php?url=${req.query.url}`);
        res.json({ status: true, original: req.query.url, short: data });
    } catch (e) { res.status(500).json({ status: false, msg: "URL Shorten Error" }); }
});

// TextMaker (Ephoto360 3D Text via Mumaker)
app.get('/api/fun/textmaker', async (req, res) => {
    try {
        await logUsage(req.query.key, '/api/fun/textmaker');
        const { effect, text } = req.query; // effect example: 'neon', 'fire', 'metallic'
        if (!effect || !text) return res.status(400).json({ status: false, msg: "effect & text required" });

        const effectsMap = {
            'metallic': "https://en.ephoto360.com/impressive-decorative-3d-metal-text-effect-798.html",
            'fire': "https://en.ephoto360.com/flame-lettering-effect-372.html",
            'neon': "https://en.ephoto360.com/create-colorful-neon-light-text-effects-online-797.html",
            'glitch': "https://en.ephoto360.com/create-digital-glitch-text-effects-online-767.html"
        };

        const targetUrl = effectsMap[effect] || effectsMap['neon']; // Default to neon
        const result = await mumaker.ephoto(targetUrl, text);
        res.json({ status: true, effect: effect, image_url: result.image });
    } catch (e) { res.status(500).json({ status: false, msg: "TextMaker Error" }); }
});

// ==========================================
// 🟢 START SERVER
// ==========================================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Master API LIVE on Port ${PORT}`));
