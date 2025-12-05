import OpenAI from "openai";

export type ChatModel = "gpt-4.1" | "gpt-4.1-mini";

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
}

export interface ChatCompletionOptions {
  model?: ChatModel;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  stop?: string | string[];
  responseFormat?: "text" | "json_object";
}

export interface ChatCompletionResult {
  content: string;
  raw: OpenAI.Chat.Completions.ChatCompletion;
}

const DEFAULT_MODEL: ChatModel = "gpt-4.1";
const DEFAULT_TEMPERATURE = 0.2;
const DEFAULT_MAX_TOKENS = 1024;

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  throw new Error("OPENAI_API_KEY environment variable is not set");
}

const openai = new OpenAI({
  apiKey,
});

function mapResponseFormat(
  format: ChatCompletionOptions["responseFormat"]
): OpenAI.Chat.Completions.ChatCompletionCreateParams["response_format"] | undefined {
  if (!format) return undefined;
  if (format === "json_object") {
    return { type: "json_object" };
  }
  return undefined;
}

export async function createChatCompletion(
  messages: ChatMessage[],
  options: ChatCompletionOptions = {}
): Promise<ChatCompletionResult> {
  const {
    model = DEFAULT_MODEL,
    temperature = DEFAULT_TEMPERATURE,
    maxTokens = DEFAULT_MAX_TOKENS,
    topP,
    presencePenalty,
    frequencyPenalty,
    stop,
    responseFormat,
  } = options;

  const completion = await openai.chat.completions.create({
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
    top_p: topP,
    presence_penalty: presencePenalty,
    frequency_penalty: frequencyPenalty,
    stop,
    response_format: mapResponseFormat(responseFormat),
  });

  const choice = completion.choices[0];
  const content = choice?.message?.content ?? "";

  return {
    content,
    raw: completion,
  };
}

export async function createJsonChatCompletion<T = unknown>(
  messages: ChatMessage[],
  options: Omit<ChatCompletionOptions, "responseFormat"> = {}
): Promise<{ parsed: T; raw: ChatCompletionResult }> {
  const result = await createChatCompletion(messages, {
    ...options,
    responseFormat: "json_object",
  });

  let parsed: T;
  try {
    parsed = JSON.parse(result.content) as T;
  } catch (error) {
    throw new Error(
      `Failed to parse JSON response from OpenAI: undefined`
    );
  }

  return {
    parsed,
    raw: result,
  };
}

export function getOpenAIClient(): OpenAI {
  return openai;
}

export const OpenAIClientConfig = {
  defaultModel: DEFAULT_MODEL,
  defaultTemperature: DEFAULT_TEMPERATURE,
  defaultMaxTokens: DEFAULT_MAX_TOKENS,
};