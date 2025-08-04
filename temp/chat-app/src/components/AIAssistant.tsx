import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, Sparkles, Zap, Brain } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

interface AIAssistantProps {
  onClose: () => void;
}

interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function AIAssistant({ onClose }: AIAssistantProps) {
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m your AI assistant. I can help you with:\n\n• Composing messages\n• Translating text\n• Summarizing conversations\n• Smart replies\n• Writing assistance\n\nHow can I help you today?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { token } = useAuthStore();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: AIMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Simulate AI response (in production, call your AI API)
    setTimeout(() => {
      const responses = [
        'I understand you want help with that. Let me think about the best way to assist you...',
        'That\'s an interesting question! Here\'s what I suggest...',
        'Based on what you\'ve told me, I recommend...',
        'I can definitely help you with that! Here\'s my suggestion...',
      ];

      const aiMessage: AIMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responses[Math.floor(Math.random() * responses.length)],
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
      setIsLoading(false);
    }, 1000);
  };

  const quickActions = [
    { icon: Sparkles, label: 'Compose Message', action: 'Help me write a message' },
    { icon: Zap, label: 'Smart Reply', action: 'Suggest a reply to the last message' },
    { icon: Brain, label: 'Translate', action: 'Translate this conversation' },
  ];

  return (
    <div className="w-96 bg-white border-l border-gray-200 flex flex-col animate-slide-in-right">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4 flex items-center justify-between text-white">
        <div className="flex items-center space-x-3">
          <div className="bg-white/20 p-2 rounded-full">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold">AI Assistant</h3>
            <p className="text-sm opacity-90">Powered by GPT-4</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-white/20 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Quick Actions */}
      <div className="p-3 bg-gray-50 space-y-2">
        {quickActions.map((action, index) => (
          <button
            key={index}
            onClick={() => setInput(action.action)}
            className="w-full flex items-center space-x-2 p-2 bg-white rounded-lg hover:bg-gray-100 transition-colors text-left"
          >
            <action.icon className="w-5 h-5 text-purple-600" />
            <span className="text-sm text-gray-700">{action.label}</span>
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-2xl ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white rounded-br-sm'
                  : 'bg-gray-100 text-gray-800 rounded-bl-sm'
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
              <p className="text-xs mt-1 opacity-70">
                {new Date(message.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 p-3 rounded-2xl rounded-bl-sm">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSendMessage();
              }
            }}
            placeholder="Ask me anything..."
            className="flex-1 px-4 py-2 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500"
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!input.trim() || isLoading}
            className="p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}