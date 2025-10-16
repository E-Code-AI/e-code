import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ActivityIndicator,
  Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import io from 'socket.io-client';

const API_BASE = 'http://localhost:5000/api';
const WS_BASE = 'ws://localhost:5000';

export function CodeEditorScreen({ project, file, onClose }) {
  const [code, setCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [socket, setSocket] = useState(null);
  const [language, setLanguage] = useState('javascript');
  const [showConsole, setShowConsole] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState([]);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    loadFile();
    connectWebSocket();
    
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  const connectWebSocket = () => {
    const ws = io(WS_BASE, {
      transports: ['websocket'],
      query: { projectId: project.id }
    });

    ws.on('connect', () => {
      console.log('Connected to code sync');
    });

    ws.on('code-update', (data) => {
      if (data.fileId === file.id && data.userId !== 'current-user') {
        setCode(data.content);
      }
    });

    ws.on('console-output', (data) => {
      setConsoleOutput(prev => [...prev, data]);
    });

    setSocket(ws);
  };

  const loadFile = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_BASE}/projects/${project.id}/files/${file.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setCode(data.content || '');
      setLanguage(detectLanguage(file.path));
    } catch (error) {
      console.error('Failed to load file:', error);
    }
  };

  const saveFile = async () => {
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      await fetch(`${API_BASE}/projects/${project.id}/files/${file.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: code })
      });
      
      // Emit code update via WebSocket
      if (socket) {
        socket.emit('code-change', {
          fileId: file.id,
          content: code
        });
      }
      
      Alert.alert('Success', 'File saved successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to save file');
    } finally {
      setSaving(false);
    }
  };

  const runCode = async () => {
    setRunning(true);
    setShowConsole(true);
    setConsoleOutput([]);
    
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_BASE}/projects/${project.id}/run`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fileId: file.id,
          code
        })
      });
      
      const result = await response.json();
      setConsoleOutput([{
        type: 'output',
        text: result.output || 'Code executed successfully'
      }]);
    } catch (error) {
      setConsoleOutput([{
        type: 'error',
        text: 'Failed to run code'
      }]);
    } finally {
      setRunning(false);
    }
  };

  const detectLanguage = (filepath) => {
    const ext = filepath.split('.').pop();
    const langMap = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'html': 'html',
      'css': 'css',
      'json': 'json'
    };
    return langMap[ext] || 'plaintext';
  };

  const getLanguageKeywords = () => {
    const keywords = {
      javascript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'import', 'export', 'async', 'await'],
      python: ['def', 'class', 'import', 'from', 'if', 'else', 'elif', 'for', 'while', 'return', 'async', 'await', 'with', 'as'],
      html: ['<div', '<span', '<p', '<h1', '<h2', '<h3', '<button', '<input', '<form', '<a'],
      css: ['color:', 'background:', 'display:', 'position:', 'width:', 'height:', 'margin:', 'padding:', 'border:']
    };
    return keywords[language] || [];
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.fileInfo}>
          <Text style={styles.fileName}>{file.path}</Text>
          <Text style={styles.projectName}>{project.name}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={runCode} disabled={running}>
            <Icon name="play-arrow" size={24} color={running ? '#6b7280' : '#10b981'} />
          </TouchableOpacity>
          <TouchableOpacity onPress={saveFile} disabled={saving}>
            <Icon name="save" size={24} color={saving ? '#6b7280' : '#fff'} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowConsole(!showConsole)}>
            <Icon name="terminal" size={24} color={showConsole ? '#0079F2' : '#fff'} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Code Editor */}
      <KeyboardAvoidingView
        style={styles.editorContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.editorScroll}
          contentContainerStyle={styles.editorContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.codeRow}>
            <View style={styles.lineNumbers}>
              {code.split('\n').map((_, index) => (
                <Text key={index} style={styles.lineNumber}>{index + 1}</Text>
              ))}
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              bounces={false}
              contentContainerStyle={styles.codeSurface}
            >
              <TextInput
                style={[styles.codeInput, { minHeight: 500 }]}
                value={code}
                onChangeText={setCode}
                multiline
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
                keyboardType="default"
                placeholder="// Start coding..."
                placeholderTextColor="#6b7280"
              />
            </ScrollView>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Console Output */}
      {showConsole && (
        <View style={styles.console}>
          <View style={styles.consoleHeader}>
            <Text style={styles.consoleTitle}>Console</Text>
            <TouchableOpacity onPress={() => setConsoleOutput([])}>
              <Text style={styles.clearButton}>Clear</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.consoleContent}>
            {consoleOutput.map((output, index) => (
              <Text 
                key={index} 
                style={[
                  styles.consoleText,
                  output.type === 'error' && styles.consoleError
                ]}
              >
                {output.text}
              </Text>
            ))}
            {running && <ActivityIndicator color="#0079F2" />}
          </ScrollView>
        </View>
      )}

      {/* Bottom Toolbar */}
      <View style={styles.toolbar}>
        <TouchableOpacity style={styles.toolButton}>
          <Icon name="format-indent-increase" size={20} color="#6b7280" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolButton}>
          <Icon name="search" size={20} color="#6b7280" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolButton}>
          <Icon name="find-replace" size={20} color="#6b7280" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolButton}>
          <Icon name="settings" size={20} color="#6b7280" />
        </TouchableOpacity>
        <View style={styles.languageBadge}>
          <Text style={styles.languageText}>{language.toUpperCase()}</Text>
        </View>
      </View>
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
    alignItems: 'center',
    backgroundColor: '#1c2333',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2d3748',
  },
  backButton: {
    marginRight: 12,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  projectName: {
    color: '#6b7280',
    fontSize: 12,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 16,
  },
  editorContainer: {
    flex: 1,
  },
  editorScroll: {
    flex: 1,
  },
  editorContent: {
    flexGrow: 1,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: '#0e1525',
    borderRadius: 8,
    overflow: 'hidden',
  },
  lineNumbers: {
    backgroundColor: '#0b1220',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRightWidth: 1,
    borderRightColor: '#1f2937',
    width: 56,
    alignItems: 'flex-end',
  },
  lineNumber: {
    color: '#6b7280',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 20,
  },
  codeSurface: {
    flexGrow: 1,
  },
  codeInput: {
    color: '#f3f4f6',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    paddingHorizontal: 16,
    paddingVertical: 12,
    lineHeight: 20,
    backgroundColor: '#0e1525',
    borderLeftWidth: 1,
    borderLeftColor: '#1f2937',
    textAlignVertical: 'top',
    minWidth: 300,
  },
  console: {
    height: 150,
    backgroundColor: '#1c2333',
    borderTopWidth: 1,
    borderTopColor: '#2d3748',
  },
  consoleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2d3748',
  },
  consoleTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  clearButton: {
    color: '#0079F2',
    fontSize: 12,
  },
  consoleContent: {
    flex: 1,
    padding: 12,
  },
  consoleText: {
    color: '#e5e7eb',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 4,
  },
  consoleError: {
    color: '#ef4444',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c2333',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#2d3748',
  },
  toolButton: {
    padding: 8,
    marginRight: 8,
  },
  languageBadge: {
    marginLeft: 'auto',
    backgroundColor: '#0079F220',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  languageText: {
    color: '#0079F2',
    fontSize: 11,
    fontWeight: '600',
  },
});