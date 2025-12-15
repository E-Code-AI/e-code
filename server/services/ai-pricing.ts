export const AI_MODEL_PRICING: Record<string, { input: number; output: number }> = {
  // OpenAI
  'gpt-5.1': { input: 2.50, output: 10.00 },
  'gpt-5': { input: 5.00, output: 15.00 },
  'gpt-5-mini': { input: 0.30, output: 1.20 },
  'gpt-5-nano': { input: 0.10, output: 0.40 },
  'gpt-4o': { input: 2.50, output: 10.00 },
  'o3': { input: 10.00, output: 40.00 },
  'o4-mini': { input: 1.10, output: 4.40 },
  // Anthropic
  'claude-opus-4-5-20251124': { input: 15.00, output: 75.00 },
  'claude-sonnet-4-5-20250929': { input: 3.00, output: 15.00 },
  'claude-haiku-4-5-20251015': { input: 0.80, output: 4.00 },
  // Gemini
  'gemini-2.5-pro': { input: 1.25, output: 5.00 },
  'gemini-2.5-flash': { input: 0.075, output: 0.30 },
  'gemini-2.0-flash': { input: 0.10, output: 0.40 },
  // xAI
  'grok-4': { input: 3.00, output: 15.00 },
  'grok-4-fast': { input: 5.00, output: 25.00 },
  // Moonshot
  'kimi-k2-0711-preview': { input: 0.60, output: 2.40 },
  'moonshot-v1-128k': { input: 0.50, output: 2.00 },
};

export function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = AI_MODEL_PRICING[model] || { input: 1.00, output: 3.00 };
  return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
}
