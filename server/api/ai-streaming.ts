import { Router } from 'express';
import { ensureAuthenticated } from '../middleware/auth';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import winston from 'winston';
import { allTools, toOpenAITools, toAnthropicTools } from '../agent/tool-definitions';
import { ToolExecutor } from '../agent/tool-executor';

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
    systemPrompt,
    capabilities = {}
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
        await streamAnthropic(res, messages, { 
          model, 
          temperature, 
          maxTokens,
          extendedThinking: capabilities.extendedThinking || false
        });
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
 * Stream from OpenAI API with tool execution
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
  const executor = new ToolExecutor(options.projectId || 'default');
  
  // Add tools to the stream
  const tools = toOpenAITools(allTools);
  
  const stream = await openai.chat.completions.create({
    model: options.model || 'gpt-4-turbo-preview',
    messages,
    temperature: options.temperature,
    max_tokens: options.maxTokens,
    stream: true,
    tools: tools.length > 0 ? tools : undefined
  });
  
  let fullContent = '';
  let toolCalls: any[] = [];
  let currentToolCall: any = null;
  
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta;
    
    if (delta?.content) {
      fullContent += delta.content;
      sendSSE(res, 'token', { content: delta.content });
    }
    
    // Handle tool calls
    if (delta?.tool_calls) {
      for (const toolCallDelta of delta.tool_calls) {
        if (toolCallDelta.index !== undefined) {
          if (!toolCalls[toolCallDelta.index]) {
            toolCalls[toolCallDelta.index] = {
              id: toolCallDelta.id,
              type: 'function',
              function: { name: '', arguments: '' }
            };
          }
          
          const toolCall = toolCalls[toolCallDelta.index];
          
          if (toolCallDelta.function?.name) {
            toolCall.function.name += toolCallDelta.function.name;
          }
          if (toolCallDelta.function?.arguments) {
            toolCall.function.arguments += toolCallDelta.function.arguments;
          }
        }
      }
    }
  }
  
  // Execute tools autonomously
  const toolResults: any[] = [];
  for (const toolCall of toolCalls) {
    try {
      const functionName = toolCall.function.name;
      const functionArgs = JSON.parse(toolCall.function.arguments);
      
      sendSSE(res, 'tool_start', {
        toolCallId: toolCall.id,
        tool: functionName,
        parameters: functionArgs
      });
      
      const result = await executor.execute(functionName, functionArgs);
      
      toolResults.push({
        tool_call_id: toolCall.id,
        role: 'tool',
        name: functionName,
        content: JSON.stringify(result)
      });
      
      sendSSE(res, 'tool_result', {
        toolCallId: toolCall.id,
        tool: functionName,
        result: result.output,
        success: result.success,
        metadata: result.metadata
      });
      
    } catch (error: any) {
      sendSSE(res, 'tool_error', {
        toolCallId: toolCall.id,
        error: error.message
      });
    }
  }
  
  // Send final message
  sendSSE(res, 'message', { 
    content: fullContent,
    tool_calls: toolCalls,
    tool_results: toolResults,
    model: options.model || 'gpt-4-turbo-preview'
  });
}

/**
 * Stream from Anthropic API with Extended Thinking support
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
  const executor = new ToolExecutor(options.projectId || 'default');
  
  // Convert messages format for Anthropic
  const systemMessage = messages.find(m => m.role === 'system');
  const userMessages = messages.filter(m => m.role !== 'system');
  
  // Add tools to the request
  const tools = toAnthropicTools(allTools);
  
  const stream = await anthropic.messages.create({
    model: options.model || 'claude-3-5-sonnet-20241022',
    messages: userMessages,
    system: systemMessage?.content,
    max_tokens: options.maxTokens,
    temperature: options.temperature,
    stream: true,
    tools: tools.length > 0 ? tools : undefined,
    thinking: options.extendedThinking ? {
      type: 'enabled',
      budget_tokens: 10000
    } : undefined
  });
  
  let fullContent = '';
  let thinkingContent = '';
  let currentThinkingStep: any = null;
  let toolCalls: any[] = [];
  let currentToolUse: any = null;
  
  for await (const event of stream) {
    // Handle thinking blocks (extended thinking)
    if (event.type === 'content_block_start' && (event as any).content_block?.type === 'thinking') {
      currentThinkingStep = {
        id: Date.now().toString(),
        type: 'reasoning',
        title: 'AI Thinking',
        content: '',
        status: 'active',
        timestamp: new Date(),
        isStreaming: true
      };
      sendSSE(res, 'thinking_start', { step: currentThinkingStep });
    }
    
    // Handle tool use blocks
    if (event.type === 'content_block_start' && (event as any).content_block?.type === 'tool_use') {
      currentToolUse = {
        id: (event as any).content_block.id,
        name: (event as any).content_block.name,
        input: ''
      };
    }
    
    if (event.type === 'content_block_delta') {
      const delta = event.delta as any;
      
      // Thinking content
      if (delta.type === 'thinking_delta' && delta.thinking) {
        thinkingContent += delta.thinking;
        if (currentThinkingStep) {
          currentThinkingStep.content = thinkingContent;
          sendSSE(res, 'thinking_update', { 
            step: currentThinkingStep,
            content: delta.thinking 
          });
        }
      }
      
      // Regular text content
      if (delta.type === 'text_delta' && delta.text) {
        fullContent += delta.text;
        sendSSE(res, 'token', { content: delta.text });
      }
      
      // Tool use input
      if (delta.type === 'input_json_delta' && delta.partial_json && currentToolUse) {
        currentToolUse.input += delta.partial_json;
      }
    }
    
    if (event.type === 'content_block_stop') {
      if (currentThinkingStep) {
        currentThinkingStep.status = 'complete';
        currentThinkingStep.isStreaming = false;
        sendSSE(res, 'thinking_complete', { step: currentThinkingStep });
        currentThinkingStep = null;
        thinkingContent = '';
      }
      
      if (currentToolUse) {
        toolCalls.push(currentToolUse);
        currentToolUse = null;
      }
    }
  }
  
  // Execute tools autonomously
  const toolResults: any[] = [];
  for (const toolCall of toolCalls) {
    try {
      const functionArgs = JSON.parse(toolCall.input);
      
      sendSSE(res, 'tool_start', {
        toolCallId: toolCall.id,
        tool: toolCall.name,
        parameters: functionArgs
      });
      
      const result = await executor.execute(toolCall.name, functionArgs);
      
      toolResults.push({
        tool_use_id: toolCall.id,
        type: 'tool_result',
        content: JSON.stringify(result)
      });
      
      sendSSE(res, 'tool_result', {
        toolCallId: toolCall.id,
        tool: toolCall.name,
        result: result.output,
        success: result.success,
        metadata: result.metadata
      });
      
    } catch (error: any) {
      sendSSE(res, 'tool_error', {
        toolCallId: toolCall.id,
        error: error.message
      });
    }
  }
  
  // Send final message
  sendSSE(res, 'message', { 
    content: fullContent,
    tool_calls: toolCalls,
    tool_results: toolResults,
    model: options.model || 'claude-3-5-sonnet-20241022',
    thinking: thinkingContent
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