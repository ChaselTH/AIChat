import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';

import { config } from './config.js';
import { transcribeAudio } from './services/asrService.js';
import { generateAssistantReply } from './services/chatService.js';
import { synthesizeSpeech } from './services/ttsService.js';

const upload = multer({ dest: 'tmp/' });
const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/asr', upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'audio file is required' });
  }

  try {
    const result = await transcribeAudio(req.file.path);
    res.json(result);
  } catch (err) {
    console.error('ASR error', err);
    res.status(500).json({ error: err.message });
  } finally {
    await fs.unlink(req.file.path).catch(() => {});
  }
});

app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;
  if (!Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array required' });
  }

  try {
    const reply = await generateAssistantReply(messages);
    res.json(reply);
  } catch (err) {
    console.error('Chat error', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tts', async (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'text required' });
  }

  try {
    const audio = await synthesizeSpeech(text);
    res.json(audio);
  } catch (err) {
    console.error('TTS error', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.resolve('public/index.html'));
});

app.listen(config.port, () => {
  console.log(`AI voice chatbot server running on http://localhost:${config.port}`);
});
