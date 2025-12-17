import { useCallback, useRef, useState } from 'react';
import { AIModel, AIProvider } from '../../../shared/mobile-types';
import { streamChatCompletion, StreamingMessage } from '../services/ai-provider';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

export interface UseStreamingChatOptions {
  projectId: number;
  token: string;
  model: AIModel;
  provider: AIProvider;
  onMessageComplete?: (message: ChatMessage) => void;
  onError?: (error: Error) => void;
}

export interface UseStreamingChatResult {
  messages: ChatMessage[];
  isStreaming: boolean;
  isLoading: boolean;
  error: Error | null;
  sendMessage: (content: string) => Promise<void>;
  cancelGeneration: () => void;
  clearMessages: () => void;
  retryLastMessage: () => Promise<void>;
}

export function useStreamingChat(options: UseStreamingChatOptions): UseStreamingChatResult {
  const { projectId, token, model, provider, onMessageComplete, onError } = options;
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastUserMessageRef = useRef<string | null>(null);
  const streamingContentRef = useRef<string>('');

  const generateMessageId = (): string => {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const cancelGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setIsLoading(false);
    
    if (streamingContentRef.current) {
      setMessages(prev => 
        prev.map(msg => 
          msg.isStreaming 
            ? { ...msg, isStreaming: false, content: streamingContentRef.current + ' [cancelled]' }
            : msg
        )
      );
    }
  }, []);

  const clearMessages = useCallback(() => {
    cancelGeneration();
    setMessages([]);
    setError(null);
    lastUserMessageRef.current = null;
    streamingContentRef.current = '';
  }, [cancelGeneration]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isStreaming || isLoading) return;
    
    setError(null);
    lastUserMessageRef.current = content;
    streamingContentRef.current = '';

    const userMessage: ChatMessage = {
      id: generateMessageId(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    const assistantMessage: ChatMessage = {
      id: generateMessageId(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    };

    setMessages(prev => [...prev, userMessage, assistantMessage]);
    setIsLoading(true);
    setIsStreaming(true);

    abortControllerRef.current = new AbortController();

    const conversationHistory: StreamingMessage[] = [
      ...messages.map(msg => ({ role: msg.role, content: msg.content })),
      { role: 'user' as const, content: content.trim() },
    ];

    try {
      await streamChatCompletion({
        model,
        messages: conversationHistory,
        projectId,
        token,
        signal: abortControllerRef.current.signal,
        onToken: (newToken) => {
          streamingContentRef.current += newToken;
          setMessages(prev => 
            prev.map(msg => 
              msg.id === assistantMessage.id
                ? { ...msg, content: streamingContentRef.current }
                : msg
            )
          );
        },
        onComplete: (fullResponse) => {
          const completedMessage: ChatMessage = {
            ...assistantMessage,
            content: fullResponse,
            isStreaming: false,
          };
          
          setMessages(prev => 
            prev.map(msg => 
              msg.id === assistantMessage.id ? completedMessage : msg
            )
          );
          
          setIsStreaming(false);
          setIsLoading(false);
          abortControllerRef.current = null;
          onMessageComplete?.(completedMessage);
        },
        onError: (err) => {
          setError(err);
          setIsStreaming(false);
          setIsLoading(false);
          abortControllerRef.current = null;
          
          setMessages(prev => 
            prev.map(msg => 
              msg.id === assistantMessage.id
                ? { ...msg, content: 'Error: ' + err.message, isStreaming: false }
                : msg
            )
          );
          
          onError?.(err);
        },
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      setIsStreaming(false);
      setIsLoading(false);
      abortControllerRef.current = null;
      
      setMessages(prev => 
        prev.filter(msg => msg.id !== assistantMessage.id)
      );
      
      onError?.(error);
    }
  }, [messages, model, projectId, token, isStreaming, isLoading, onMessageComplete, onError]);

  const retryLastMessage = useCallback(async () => {
    if (!lastUserMessageRef.current) return;
    
    setMessages(prev => {
      const lastAssistantIdx = prev.findLastIndex(msg => msg.role === 'assistant');
      const lastUserIdx = prev.findLastIndex(msg => msg.role === 'user');
      
      if (lastAssistantIdx > lastUserIdx) {
        return prev.slice(0, lastAssistantIdx);
      }
      return prev.slice(0, lastUserIdx);
    });
    
    setError(null);
    
    await sendMessage(lastUserMessageRef.current);
  }, [sendMessage]);

  return {
    messages,
    isStreaming,
    isLoading,
    error,
    sendMessage,
    cancelGeneration,
    clearMessages,
    retryLastMessage,
  };
}

export default useStreamingChat;
