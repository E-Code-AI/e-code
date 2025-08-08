import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const WS_BASE = 'ws://localhost:5000';

export function TerminalScreen({ project, onClose }) {
  const [terminalHistory, setTerminalHistory] = useState([
    { type: 'system', text: 'E-Code Terminal v1.0.0' },
    { type: 'system', text: `Connected to project: ${project.name}` },
    { type: 'prompt', text: '~/$' }
  ]);
  const [currentCommand, setCurrentCommand] = useState('');
  const [socket, setSocket] = useState(null);
  const scrollViewRef = useRef();

  useEffect(() => {
    connectTerminal();
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  const connectTerminal = async () => {
    const token = await AsyncStorage.getItem('authToken');
    const ws = io(`${WS_BASE}/terminal`, {
      transports: ['websocket'],
      auth: { token },
      query: { projectId: project.id }
    });

    ws.on('connect', () => {
      addToHistory('system', 'Terminal connected');
    });

    ws.on('output', (data) => {
      addToHistory('output', data.text);
    });

    ws.on('error', (data) => {
      addToHistory('error', data.message);
    });

    setSocket(ws);
  };

  const addToHistory = (type, text) => {
    setTerminalHistory(prev => [...prev, { type, text }]);
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const executeCommand = () => {
    if (!currentCommand.trim()) return;

    addToHistory('command', `$ ${currentCommand}`);

    // Handle built-in commands
    if (currentCommand === 'clear' || currentCommand === 'cls') {
      setTerminalHistory([
        { type: 'system', text: 'E-Code Terminal v1.0.0' },
        { type: 'prompt', text: '~/$' }
      ]);
      setCurrentCommand('');
      return;
    }

    if (currentCommand === 'help') {
      addToHistory('output', 'Available commands:');
      addToHistory('output', '  ls    - List files');
      addToHistory('output', '  cd    - Change directory');
      addToHistory('output', '  pwd   - Print working directory');
      addToHistory('output', '  npm   - Run npm commands');
      addToHistory('output', '  node  - Run Node.js');
      addToHistory('output', '  clear - Clear terminal');
      addToHistory('prompt', '~/$');
      setCurrentCommand('');
      return;
    }

    // Send command to server
    if (socket) {
      socket.emit('command', { command: currentCommand });
    } else {
      // Simulate command execution
      setTimeout(() => {
        if (currentCommand.startsWith('ls')) {
          addToHistory('output', 'package.json');
          addToHistory('output', 'src/');
          addToHistory('output', 'public/');
          addToHistory('output', 'README.md');
        } else if (currentCommand === 'pwd') {
          addToHistory('output', `/home/projects/${project.id}`);
        } else if (currentCommand.startsWith('echo ')) {
          addToHistory('output', currentCommand.substring(5));
        } else {
          addToHistory('error', `Command not found: ${currentCommand}`);
        }
        addToHistory('prompt', '~/$');
      }, 100);
    }

    setCurrentCommand('');
  };

  const getTextColor = (type) => {
    switch(type) {
      case 'system': return '#0079F2';
      case 'command': return '#10b981';
      case 'output': return '#e5e7eb';
      case 'error': return '#ef4444';
      case 'prompt': return '#6b7280';
      default: return '#e5e7eb';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose}>
          <Icon name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Terminal</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity>
            <Icon name="add" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity>
            <Icon name="settings" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Terminal Output */}
      <ScrollView 
        ref={scrollViewRef}
        style={styles.terminal}
        contentContainerStyle={styles.terminalContent}
      >
        {terminalHistory.map((line, index) => (
          <Text 
            key={index} 
            style={[styles.terminalText, { color: getTextColor(line.type) }]}
          >
            {line.text}
          </Text>
        ))}
      </ScrollView>

      {/* Command Input */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.inputContainer}>
          <Text style={styles.prompt}>$</Text>
          <TextInput
            style={styles.commandInput}
            value={currentCommand}
            onChangeText={setCurrentCommand}
            onSubmitEditing={executeCommand}
            placeholder="Enter command..."
            placeholderTextColor="#6b7280"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="go"
          />
          <TouchableOpacity onPress={executeCommand}>
            <Icon name="send" size={20} color="#0079F2" />
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
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 16,
  },
  terminal: {
    flex: 1,
    backgroundColor: '#0a0e1a',
  },
  terminalContent: {
    padding: 16,
    paddingBottom: 32,
  },
  terminalText: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 2,
    lineHeight: 18,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c2333',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#2d3748',
  },
  prompt: {
    color: '#10b981',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginRight: 8,
  },
  commandInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});