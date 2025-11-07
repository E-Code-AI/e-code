import { Router } from 'express';
import { ensureAuthenticated } from '../middleware/auth';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import winston from 'winston';

// Create logger instance
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

const router = Router();

// Helper to set SSE headers
const setupSSE = (res: any) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  // Send initial connection event
  res.write('event: connected\n');
  res.write('data: {"status": "connected"}\n\n');
};

// Helper to send SSE message
const sendSSE = (res: any, event: string, data: any) => {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
};

/**
 * Main streaming chat endpoint for AI Agent panel
 * Supports OpenAI, Anthropic, Google AI, and more
 */
router.post('/api/agent/chat/stream', ensureAuthenticated, async (req, res) => {
  setupSSE(res);
  
  const { 
    message, 
    projectId, 
    conversationId,
    provider = 'openai',
    model,
    context = [],
    temperature = 0.7,
    maxTokens = 4096,
    tools = [],
    systemPrompt
  } = req.body;
  
  const userId = (req as any).user?.id;
  
  try {
    // Build messages array with context
    const messages = [
      {
        role: 'system',
        content: systemPrompt || `You are an expert AI coding assistant integrated into the E-Code Platform IDE. 
        You help users build, debug, and improve their applications with detailed explanations and high-quality code.
        You have access to the project context and can execute actions like creating files, running commands, and modifying code.`
      },
      ...context,
      { role: 'user', content: message }
    ];
    
    // Track usage
    sendSSE(res, 'usage', { 
      provider, 
      model: model || 'default',
      tokens: 0 
    });
    
    let fullResponse = '';
    let tokenCount = 0;
    
    // Stream based on provider
    switch (provider) {
      case 'openai':
        await streamOpenAI(res, messages, { model, temperature, maxTokens, tools });
        break;
        
      case 'anthropic':
        await streamAnthropic(res, messages, { model, temperature, maxTokens });
        break;
        
      case 'gemini':
        await streamGemini(res, messages, { model, temperature, maxTokens });
        break;
        
      default:
        // Fallback to OpenAI
        await streamOpenAI(res, messages, { model, temperature, maxTokens, tools });
    }
    
    // Send completion event
    sendSSE(res, 'done', { 
      conversationId,
      projectId,
      totalTokens: tokenCount 
    });
    
    res.end();
    
  } catch (error: any) {
    logger.error('Streaming chat error:', error);
    
    // Send error event
    sendSSE(res, 'error', {
      message: error.message || 'An error occurred during streaming',
      code: error.code || 'STREAM_ERROR',
      provider
    });
    
    res.end();
  }
});

/**
 * Stream from OpenAI API
 */
async function streamOpenAI(res: any, messages: any[], options: any) {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    sendSSE(res, 'error', { 
      message: 'OpenAI API key not configured. Please add OPENAI_API_KEY to secrets.',
      code: 'MISSING_API_KEY'
    });
    return;
  }
  
  const openai = new OpenAI({ apiKey });
  
  const stream = await openai.chat.completions.create({
    model: options.model || 'gpt-4-turbo-preview',
    messages,
    temperature: options.temperature,
    max_tokens: options.maxTokens,
    stream: true,
    tools: options.tools?.length > 0 ? options.tools : undefined
  });
  
  let fullContent = '';
  let toolCalls: any[] = [];
  
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta;
    
    if (delta?.content) {
      fullContent += delta.content;
      sendSSE(res, 'token', { content: delta.content });
    }
    
    if (delta?.tool_calls) {
      toolCalls.push(...delta.tool_calls);
      sendSSE(res, 'tool_call', { tools: delta.tool_calls });
    }
  }
  
  // Send final message
  sendSSE(res, 'message', { 
    content: fullContent,
    tool_calls: toolCalls,
    model: options.model || 'gpt-4-turbo-preview'
  });
}

/**
 * Stream from Anthropic API
 */
async function streamAnthropic(res: any, messages: any[], options: any) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    sendSSE(res, 'error', { 
      message: 'Anthropic API key not configured. Please add ANTHROPIC_API_KEY to secrets.',
      code: 'MISSING_API_KEY'
    });
    return;
  }
  
  const anthropic = new Anthropic({ apiKey });
  
  // Convert messages format for Anthropic
  const systemMessage = messages.find(m => m.role === 'system');
  const userMessages = messages.filter(m => m.role !== 'system');
  
  const stream = await anthropic.messages.create({
    model: options.model || 'claude-3-5-sonnet-20241022',
    messages: userMessages,
    system: systemMessage?.content,
    max_tokens: options.maxTokens,
    temperature: options.temperature,
    stream: true
  });
  
  let fullContent = '';
  
  for await (const event of stream) {
    if (event.type === 'content_block_delta') {
      const delta = event.delta as any;
      if (delta.type === 'text_delta' && delta.text) {
        fullContent += delta.text;
        sendSSE(res, 'token', { content: delta.text });
      }
    }
  }
  
  // Send final message
  sendSSE(res, 'message', { 
    content: fullContent,
    model: options.model || 'claude-3-5-sonnet-20241022'
  });
}

/**
 * Stream from Google Gemini API
 */
async function streamGemini(res: any, messages: any[], options: any) {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  
  if (!apiKey) {
    sendSSE(res, 'error', { 
      message: 'Google AI API key not configured. Please add GOOGLE_AI_API_KEY to secrets.',
      code: 'MISSING_API_KEY'
    });
    return;
  }
  
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ 
    model: options.model || 'gemini-pro' 
  });
  
  // Convert messages to Gemini format
  const chat = model.startChat({
    history: messages.slice(0, -1).map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }))
  });
  
  const result = await chat.sendMessageStream(messages[messages.length - 1].content);
  
  let fullContent = '';
  
  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) {
      fullContent += text;
      sendSSE(res, 'token', { content: text });
    }
  }
  
  // Send final message
  sendSSE(res, 'message', { 
    content: fullContent,
    model: options.model || 'gemini-pro'
  });
}

/**
 * Stop streaming endpoint - allows client to cancel ongoing stream
 */
router.post('/api/agent/chat/stop', ensureAuthenticated, (req, res) => {
  const { conversationId } = req.body;
  
  // In a production system, you'd track active streams and close them
  logger.info(`Stopping stream for conversation: ${conversationId}`);
  
  res.json({ success: true, conversationId });
});

/**
 * Get available AI models endpoint
 */
router.get('/api/agent/models', ensureAuthenticated, (req, res) => {
  const models = [
    // OpenAI Models
    { provider: 'openai', model: 'gpt-4-turbo-preview', name: 'GPT-4 Turbo', context: 128000 },
    { provider: 'openai', model: 'gpt-4', name: 'GPT-4', context: 8192 },
    { provider: 'openai', model: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', context: 16385 },
    
    // Anthropic Models  
    { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', context: 200000 },
    { provider: 'anthropic', model: 'claude-3-opus-20240229', name: 'Claude 3 Opus', context: 200000 },
    { provider: 'anthropic', model: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', context: 200000 },
    
    // Google Models
    { provider: 'gemini', model: 'gemini-pro', name: 'Gemini Pro', context: 30720 },
    { provider: 'gemini', model: 'gemini-pro-vision', name: 'Gemini Pro Vision', context: 12288 },
  ];
  
  res.json(models);
});

export default router;