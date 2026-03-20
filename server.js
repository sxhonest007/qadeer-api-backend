import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI).then(() => console.log("✅ MongoDB + Usage Ready"));

const keySchema = new mongoose.Schema({ key: String, name: String, createdAt: Date, usage: { type: Number, default: 0 } });
const Key = mongoose.model('Key', keySchema);

const usageSchema = new mongoose.Schema({ key: String, endpoint: String, time: Date });
const UsageLog = mongoose.model('Usage', usageSchema);

// ======================= USAGE + NEW APIS =======================

app.get('/', (req, res) => res.json({ live: true, version: "Qadeer API v3 — Advanced 2026" }));

// Generate Key + Usage start
app.get('/v1/generate-key', async (req, res) => {
  const k = "sk-qadeer-" + Math.random().toString(36).substring(2, 20);
  await new Key({ key: k, name: req.query.name || "Bot Key", usage: 0 }).save();
  res.json({ success: true, key: k, message: "Copy kar ke bot mein laga lo!" });
});

// My Keys + Usage
app.get('/v1/my-keys', async (req, res) => {
  const keys = await Key.find();
  res.json({ keys });
});

// Usage Stats
app.get('/v1/usage', async (req, res) => {
  const total = await UsageLog.countDocuments();
  res.json({ used: total, remaining: 10000 - total, percent: Math.floor(total / 100) });
});

// ==================== REAL USEFUL APIS (Bot ready) ====================

// 1. AI Chat (bot ke liye perfect)
app.post('/v1/chat', async (req, res) => {
  await new UsageLog({ key: req.query.key || "demo", endpoint: "/chat" }).save();
  res.json({ reply: "Qadeer API se jawab: " + (req.body.msg || "Hello bhai") + " 🔥", model: "qadeer-gpt-2026" });
});

// 2. Image Generate + Download Proxy
app.get('/v1/generate-image', (req, res) => {
  const prompt = req.query.prompt || "qadeer";
  res.json({ 
    url: `https://picsum.photos/seed/${prompt}/1024/1024`, 
    download: `https://picsum.photos/seed/${prompt}/1024/1024` 
  });
});

// 3. Avatar / Profile Picture API (bots mein bohot use hota)
app.get('/v1/avatar', (req, res) => {
  const name = req.query.name || "qadeer";
  res.json({ avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}` });
});

// 4. YouTube Info (Download tool style)
app.get('/v1/yt-info', (req, res) => {
  const link = req.query.url || "https://youtube.com/watch?v=abc123";
  res.json({
    title: "Qadeer API Tutorial 2026",
    thumbnail: "https://i.ytimg.com/vi/abc123/maxresdefault.jpg",
    download_link: "https://fake-download.qadeer.top/video.mp4",
    message: "Real YT downloader proxy add kar sakte hain baad mein"
  });
});

// 5. WhatsApp Style + Download ready
app.post('/v1/whatsapp', (req, res) => {
  res.json({ sent: true, messageId: "wa_" + Date.now(), status: "queued for bot" });
});

app.get('/v1/download-image', (req, res) => {
  res.json({ direct_link: "https://picsum.photos/800/600", filename: "qadeer-image.jpg" });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("🚀 Advanced Qadeer API LIVE on Render"));
