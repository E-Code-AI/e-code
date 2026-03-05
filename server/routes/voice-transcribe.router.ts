import { Router, Request, Response } from 'express';
import multer from 'multer';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
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

/**
 * Transcribe audio using OpenAI Whisper (primary — best accuracy for code)
 */
async function transcribeWithOpenAI(
  buffer: Buffer,
  mimetype: string,
  language?: string,
  prompt?: string
): Promise<{ text: string; language: string | null }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

  const openai = new OpenAI({ apiKey });
  const ext = mimetype.includes('ogg') ? 'ogg'
    : mimetype.includes('mp4') || mimetype.includes('m4a') ? 'mp4'
    : mimetype.includes('wav') ? 'wav'
    : 'webm';

  const audioFile = await toFile(buffer, `recording.${ext}`, { type: mimetype });
  const transcription = await openai.audio.transcriptions.create({
    file: audioFile,
    model: 'whisper-1',
    language: language || undefined,
    prompt: prompt || 'Code, programming, software development',
  });

  return { text: transcription.text, language: transcription.language ?? null };
}

/**
 * Transcribe audio using Gemini 2.0 Flash (fallback — supports inline audio via multimodal API)
 * Note: Anthropic and xAI do NOT support audio transcription APIs.
 */
async function transcribeWithGemini(
  buffer: Buffer,
  mimetype: string
): Promise<{ text: string; language: null }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const result = await model.generateContent([
    {
      inlineData: {
        data: buffer.toString('base64'),
        mimeType: mimetype as any
      }
    },
    'Transcribe this audio accurately. Output ONLY the transcription text with no preamble, labels, or explanation. Preserve programming terminology, variable names, and technical terms exactly as spoken.'
  ]);

  const text = result.response.text().trim();
  return { text, language: null };
}

router.post(
  '/transcribe',
  ensureAuthenticated,
  tierRateLimiters.api,
  upload.single('audio'),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No audio file provided' });
      }

      const hasOpenAI = !!process.env.OPENAI_API_KEY;
      const hasGemini = !!process.env.GEMINI_API_KEY;

      if (!hasOpenAI && !hasGemini) {
        return res.status(503).json({
          error: 'Voice transcription unavailable. No AI provider configured (requires OPENAI_API_KEY or GEMINI_API_KEY).'
        });
      }

      let result: { text: string; language: string | null };
      let provider = 'openai';

      if (hasOpenAI) {
        try {
          result = await transcribeWithOpenAI(
            req.file.buffer,
            req.file.mimetype,
            req.body.language,
            req.body.prompt
          );
          provider = 'openai-whisper';
        } catch (openaiErr: any) {
          logger.warn('OpenAI Whisper failed, falling back to Gemini', { error: openaiErr.message });

          if (!hasGemini) {
            if (openaiErr.status === 429) {
              return res.status(429).json({ error: 'Rate limit exceeded. Please wait a moment.' });
            }
            throw openaiErr;
          }

          result = await transcribeWithGemini(req.file.buffer, req.file.mimetype);
          provider = 'gemini-2.0-flash';
        }
      } else {
        result = await transcribeWithGemini(req.file.buffer, req.file.mimetype);
        provider = 'gemini-2.0-flash';
      }

      logger.info('Voice transcription completed', {
        userId: (req.user as any)?.id,
        sizeBytes: req.file.size,
        chars: result.text.length,
        provider
      });

      res.json({
        transcript: result.text,
        language: result.language,
        provider
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
