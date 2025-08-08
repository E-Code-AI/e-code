import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import io from 'socket.io-client';

const API_BASE = 'http://localhost:5000/api';
const WS_BASE = 'ws://localhost:5000';

export function AIAssistantScreen({ project, onClose }) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'ai',
      text: `Hello! I'm your AI assistant for ${project.name}. I can help you with:\n• Writing code\n• Debugging issues\n• Explaining concepts\n• Refactoring code\n• Generating tests\n\nWhat would you like help with?`,
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [socket, setSocket] = useState(null);
  const scrollViewRef = useRef();

  useEffect(() => {
    connectAI();
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  const connectAI = async () => {
    const token = await AsyncStorage.getItem('authToken');
    const ws = io(`${WS_BASE}/ai`, {
      transports: ['websocket'],
      auth: { token },
      query: { projectId: project.id }
    });

    ws.on('ai-response', (data) => {
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'ai',
        text: data.text,
        timestamp: new Date()
      }]);
      setIsTyping(false);
    });

    ws.on('ai-streaming', (data) => {
      // Handle streaming responses
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last && last.type === 'ai' && last.streaming) {
          return [...prev.slice(0, -1), {
            ...last,
            text: last.text + data.chunk
          }];
        }
        return [...prev, {
          id: Date.now(),
          type: 'ai',
          text: data.chunk,
          streaming: true,
          timestamp: new Date()
        }];
      });
    });

    setSocket(ws);
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      text: inputText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_BASE}/ai/chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          projectId: project.id,
          message: inputText,
          context: {
            language: project.language,
            files: [] // Could include relevant files
          }
        })
      });

      const data = await response.json();
      
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'ai',
        text: data.response,
        timestamp: new Date()
      }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'error',
        text: 'Failed to get AI response. Please try again.',
        timestamp: new Date()
      }]);
    } finally {
      setIsTyping(false);
    }

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const quickActions = [
    { icon: 'code', label: 'Generate Code', prompt: 'Generate a ' },
    { icon: 'bug-report', label: 'Debug', prompt: 'Help me debug ' },
    { icon: 'lightbulb', label: 'Explain', prompt: 'Explain how ' },
    { icon: 'build', label: 'Refactor', prompt: 'Refactor this code: ' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose}>
          <Icon name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Icon name="auto-awesome" size={20} color="#f59e0b" />
          <Text style={styles.title}>AI Assistant</Text>
        </View>
        <TouchableOpacity>
          <Icon name="more-vert" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <ScrollView 
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
      >
        {messages.map((message) => (
          <View 
            key={message.id} 
            style={[
              styles.messageWrapper,
              message.type === 'user' && styles.userMessageWrapper
            ]}
          >
            <View style={[
              styles.message,
              message.type === 'user' && styles.userMessage,
              message.type === 'error' && styles.errorMessage
            ]}>
              {message.type === 'ai' && (
                <View style={styles.aiIcon}>
                  <Icon name="auto-awesome" size={16} color="#f59e0b" />
                </View>
              )}
              <Text style={[
                styles.messageText,
                message.type === 'user' && styles.userMessageText
              ]}>
                {message.text}
              </Text>
            </View>
            <Text style={styles.timestamp}>
              {message.timestamp.toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </Text>
          </View>
        ))}
        
        {isTyping && (
          <View style={styles.typingIndicator}>
            <ActivityIndicator size="small" color="#0079F2" />
            <Text style={styles.typingText}>AI is thinking...</Text>
          </View>
        )}
      </ScrollView>

      {/* Quick Actions */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.quickActions}
      >
        {quickActions.map((action, index) => (
          <TouchableOpacity 
            key={index}
            style={styles.quickAction}
            onPress={() => setInputText(action.prompt)}
          >
            <Icon name={action.icon} size={16} color="#0079F2" />
            <Text style={styles.quickActionText}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Input */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask AI anything..."
            placeholderTextColor="#6b7280"
            multiline
            maxHeight={100}
          />
          <TouchableOpacity 
            style={styles.sendButton}
            onPress={sendMessage}
            disabled={!inputText.trim() || isTyping}
          >
            <Icon 
              name="send" 
              size={20} 
              color={inputText.trim() && !isTyping ? '#0079F2' : '#6b7280'} 
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0e1525',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1c2333',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2d3748',
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  messageWrapper: {
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  userMessageWrapper: {
    alignItems: 'flex-end',
  },
  message: {
    backgroundColor: '#1c2333',
    borderRadius: 12,
    padding: 12,
    maxWidth: '80%',
  },
  userMessage: {
    backgroundColor: '#0079F2',
  },
  errorMessage: {
    backgroundColor: '#ef444420',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  aiIcon: {
    marginBottom: 8,
  },
  messageText: {
    color: '#e5e7eb',
    fontSize: 14,
    lineHeight: 20,
  },
  userMessageText: {
    color: '#fff',
  },
  timestamp: {
    color: '#6b7280',
    fontSize: 11,
    marginTop: 4,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
  },
  typingText: {
    color: '#6b7280',
    fontSize: 13,
  },
  quickActions: {
    backgroundColor: '#1c2333',
    paddingVertical: 8,
    paddingHorizontal: 16,
    maxHeight: 50,
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0e1525',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  quickActionText: {
    color: '#0079F2',
    fontSize: 12,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#1c2333',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#2d3748',
  },
  input: {
    flex: 1,
    backgroundColor: '#0e1525',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    color: '#fff',
    fontSize: 14,
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    padding: 8,
  },
});