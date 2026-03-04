import { Router, Request, Response } from 'express';
import multer from 'multer';
import OpenAI from 'openai';
import { ensureAuthenticated } from '../middleware/auth';
import { tierRateLimiters } from '../middleware/tier-rate-limiter';
import { createLogger } from '../utils/logger';
import { toFile } from 'openai';

const logger = createLogger('voice-transcribe');
const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/x-m4a'];
    if (allowed.includes(file.mimetype) || file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'));
    }
  }
});

router.post(
  '/api/voice/transcribe',
  ensureAuthenticated,
  tierRateLimiters.api,
  upload.single('audio'),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No audio file provided' });
      }

      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return res.status(503).json({ error: 'OpenAI API key not configured' });
      }

      const openai = new OpenAI({ apiKey });

      const ext = req.file.mimetype.includes('ogg') ? 'ogg'
        : req.file.mimetype.includes('mp4') || req.file.mimetype.includes('m4a') ? 'mp4'
        : req.file.mimetype.includes('wav') ? 'wav'
        : 'webm';

      const audioFile = await toFile(
        req.file.buffer,
        `recording.${ext}`,
        { type: req.file.mimetype }
      );

      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language: req.body.language || undefined,
        prompt: req.body.prompt || 'Code, programming, software development',
      });

      logger.info('Voice transcription completed', {
        userId: (req.user as any)?.id,
        duration: req.file.size,
        chars: transcription.text.length
      });

      res.json({
        transcript: transcription.text,
        language: transcription.language ?? null,
      });
    } catch (error: any) {
      logger.error('Voice transcription failed', { error: error.message });

      if (error.status === 400) {
        return res.status(400).json({ error: 'Invalid audio file. Please try again.' });
      }
      if (error.status === 429) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please wait a moment.' });
      }

      res.status(500).json({ error: 'Transcription failed. Please try again.' });
    }
  }
);

export default router;
