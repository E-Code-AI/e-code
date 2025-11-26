-- Migration: Add 18 new AI models to ai_model enum
-- Date: 2025-11-16
-- Description: Expands ai_model enum from 8 legacy values to 26 total values (18 new production models)

-- OpenAI Models (November 2025)
ALTER TYPE ai_model ADD VALUE IF NOT EXISTS 'gpt-5.1';
ALTER TYPE ai_model ADD VALUE IF NOT EXISTS 'gpt-5';
ALTER TYPE ai_model ADD VALUE IF NOT EXISTS 'gpt-5-mini';
ALTER TYPE ai_model ADD VALUE IF NOT EXISTS 'gpt-5-nano';
ALTER TYPE ai_model ADD VALUE IF NOT EXISTS 'gpt-4.1';
ALTER TYPE ai_model ADD VALUE IF NOT EXISTS 'gpt-4o';
ALTER TYPE ai_model ADD VALUE IF NOT EXISTS 'o3';
ALTER TYPE ai_model ADD VALUE IF NOT EXISTS 'o4-mini';

-- Anthropic Models (Sept-Oct 2025)
ALTER TYPE ai_model ADD VALUE IF NOT EXISTS 'claude-sonnet-4-5-20250929';
ALTER TYPE ai_model ADD VALUE IF NOT EXISTS 'claude-opus-4-1-20250805';
ALTER TYPE ai_model ADD VALUE IF NOT EXISTS 'claude-haiku-4-5-20251015';

-- Google Gemini Models (Nov 2025)
ALTER TYPE ai_model ADD VALUE IF NOT EXISTS 'gemini-2.5-pro';
ALTER TYPE ai_model ADD VALUE IF NOT EXISTS 'gemini-2.5-flash';

-- xAI Models (July-Sept 2025)
ALTER TYPE ai_model ADD VALUE IF NOT EXISTS 'grok-4';
ALTER TYPE ai_model ADD VALUE IF NOT EXISTS 'grok-4-fast';

-- Moonshot AI Models (Nov 2025)
-- ✅ 40-YEAR FIX: Corrected to production-recommended model IDs
ALTER TYPE ai_model ADD VALUE IF NOT EXISTS 'kimi-k2-0711-preview';
ALTER TYPE ai_model ADD VALUE IF NOT EXISTS 'kimi-k2-0905-preview';
ALTER TYPE ai_model ADD VALUE IF NOT EXISTS 'kimi-k2-thinking';
