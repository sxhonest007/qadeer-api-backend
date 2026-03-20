import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected ✓"))
  .catch(err => console.error("MongoDB connection error:", err));

// Schema + Model
const keySchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  name: String,
  createdAt: { type: Date, default: Date.now },
  lastUsed: Date
});

const ApiKey = mongoose.model('ApiKey', keySchema);

// ──────────────────────────────────────────────── Routes

app.get('/', (req, res) => {
  res.json({ status: "online", message: "Qadeer API Backend 2026" });
});

// Generate & save new key
app.get('/v1/generate-key', async (req, res) => {
  try {
    const newKey = "sk-qadeer-" + Math.random().toString(36).slice(2, 15) + Math.random().toString(36).slice(2, 10);
    const doc = new ApiKey({
      key: newKey,
      name: req.query.name || "Unnamed Key",
    });
    await doc.save();

    res.json({ success: true, api_key: newKey });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// List all keys
app.get('/v1/my-keys', async (req, res) => {
  const keys = await ApiKey.find().sort({ createdAt: -1 });
  res.json({ success: true, count: keys.length, keys });
});

// ──────────────────────────────────────────────── Demo endpoints

app.get('/v1/joke', async (req, res) => {
  const r = await fetch('https://official-joke-api.appspot.com/random_joke');
  const data = await r.json();
  res.json(data);
});

app.get('/v1/image', (req, res) => {
  const id = Math.floor(Math.random() * 1084);
  res.json({ url: `https://picsum.photos/id/${id}/800/600` });
});

app.post('/v1/chat', (req, res) => {
  const msg = req.body.message || "hello";
  res.json({ reply: `Qadeer bhai! "${msg}" pe jawab: bohot zabardast! 🔥` });
});

app.post('/v1/whatsapp', (req, res) => {
  res.json({ status: "queued", messageId: "wamid." + Date.now() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running → http://localhost:${PORT}`);
});
