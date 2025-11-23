/**
 * React Native Terminal Component
 * WebSocket-based terminal with command history and auto-completion
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { mobileColors, mobileSpacing, mobileTypography, mobileBorderRadius } from '../../../shared/theme/mobile-theme';

interface TerminalProps {
  projectId: string | number;
  token: string;
  height?: number;
}

interface TerminalLine {
  id: string;
  type: 'command' | 'output' | 'error';
  text: string;
  timestamp: Date;
}

export const Terminal: React.FC<TerminalProps> = ({
  projectId,
  token,
  height = 400,
}) => {
  const [lines, setLines] = useState<TerminalLine[]>([
    {
      id: '0',
      type: 'output',
      text: 'E-Code Mobile Terminal v1.0.0',
      timestamp: new Date(),
    },
    {
      id: '1',
      type: 'output',
      text: `Connected to project ${projectId}`,
      timestamp: new Date(),
    },
  ]);
  const [currentCommand, setCurrentCommand] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  // Auto-scroll to bottom when new lines added
  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [lines]);

  // Connect to WebSocket terminal backend
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    setIsConnecting(true);

    try {
      // Determine protocol and host
      const protocol = __DEV__ ? 'ws:' : 'wss:';
      const host = __DEV__ ? 'localhost:3000' : 'your-production-host.com';
      const wsUrl = `${protocol}//${host}/api/terminal/ws?projectId=${projectId}&token=${token}`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setIsConnecting(false);
        addLine('output', 'Terminal connected. Type commands below.');
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          if (message.type === 'output') {
            addLine('output', message.data);
          } else if (message.type === 'error') {
            addLine('error', message.error || message.data);
          }
        } catch (error) {
          console.error('[Terminal] Failed to parse message:', error);
          addLine('output', event.data); // Fallback: show raw data
        }
      };

      ws.onerror = (error) => {
        console.error('[Terminal] WebSocket error:', error);
        setIsConnected(false);
        setIsConnecting(false);
        addLine('error', 'Terminal connection error. Tap "Reconnect" to retry.');
      };

      ws.onclose = () => {
        setIsConnected(false);
        setIsConnecting(false);
        addLine('output', 'Terminal disconnected.');
      };
    } catch (error) {
      console.error('[Terminal] Failed to create WebSocket:', error);
      setIsConnecting(false);
      addLine('error', 'Failed to connect to terminal.');
    }
  }, [projectId, token]);

  // Connect on mount
  useEffect(() => {
    connectWebSocket();

    return () => {
      wsRef.current?.close();
    };
  }, [connectWebSocket]);

  const addLine = (type: TerminalLine['type'], text: string) => {
    setLines(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        type,
        text,
        timestamp: new Date(),
      },
    ]);
  };

  const sendCommand = () => {
    const command = currentCommand.trim();
    if (!command) return;

    // Add to history
    setCommandHistory(prev => [...prev, command]);
    setHistoryIndex(-1);

    // Show command in terminal
    addLine('command', `$ ${command}`);

    // Send to WebSocket
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'input',
        data: command + '\r', // Append carriage return
      }));
    } else {
      addLine('error', 'Not connected to terminal. Tap "Reconnect" to retry.');
    }

    // Clear input
    setCurrentCommand('');
  };

  const handleArrowUp = () => {
    if (commandHistory.length === 0) return;

    const newIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex;
    setHistoryIndex(newIndex);
    setCurrentCommand(commandHistory[commandHistory.length - 1 - newIndex]);
  };

  const handleArrowDown = () => {
    if (historyIndex <= 0) {
      setHistoryIndex(-1);
      setCurrentCommand('');
      return;
    }

    const newIndex = historyIndex - 1;
    setHistoryIndex(newIndex);
    setCurrentCommand(commandHistory[commandHistory.length - 1 - newIndex]);
  };

  const clearTerminal = () => {
    setLines([
      {
        id: Date.now().toString(),
        type: 'output',
        text: 'Terminal cleared.',
        timestamp: new Date(),
      },
    ]);
  };

  const insertText = (text: string) => {
    setCurrentCommand(prev => prev + text);
    inputRef.current?.focus();
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { height }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Toolbar */}
      <View style={styles.toolbar}>
        <View style={styles.toolbarLeft}>
          {isConnecting ? (
            <>
              <ActivityIndicator size="small" color={mobileColors.info} />
              <Text style={styles.statusText}>Connecting...</Text>
            </>
          ) : isConnected ? (
            <>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Connected</Text>
            </>
          ) : (
            <>
              <View style={[styles.statusDot, styles.statusDotDisconnected]} />
              <TouchableOpacity onPress={connectWebSocket}>
                <Text style={styles.reconnectText}>Reconnect</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <TouchableOpacity style={styles.clearButton} onPress={clearTerminal}>
          <Text style={styles.clearButtonText}>Clear</Text>
        </TouchableOpacity>
      </View>

      {/* Terminal Output */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.terminalScroll}
        contentContainerStyle={styles.terminalContent}
        showsVerticalScrollIndicator={true}
      >
        {lines.map((line) => (
          <View key={line.id} style={styles.lineContainer}>
            <Text
              style={[
                styles.lineText,
                line.type === 'command' && styles.commandText,
                line.type === 'error' && styles.errorText,
              ]}
            >
              {line.text}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* Input Toolbar */}
      <View style={styles.inputToolbar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickKeys}>
          <TouchableOpacity style={styles.quickKey} onPress={() => insertText('ls ')}>
            <Text style={styles.quickKeyText}>ls</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickKey} onPress={() => insertText('cd ')}>
            <Text style={styles.quickKeyText}>cd</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickKey} onPress={() => insertText('npm ')}>
            <Text style={styles.quickKeyText}>npm</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickKey} onPress={() => insertText('git ')}>
            <Text style={styles.quickKeyText}>git</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickKey} onPress={() => insertText('node ')}>
            <Text style={styles.quickKeyText}>node</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickKey} onPress={handleArrowUp}>
            <Text style={styles.quickKeyText}>↑</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickKey} onPress={handleArrowDown}>
            <Text style={styles.quickKeyText}>↓</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Command Input */}
      <View style={styles.inputContainer}>
        <Text style={styles.prompt}>$</Text>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={currentCommand}
          onChangeText={setCurrentCommand}
          onSubmitEditing={sendCommand}
          placeholder="Enter command..."
          placeholderTextColor={mobileColors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          returnKeyType="send"
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[styles.sendButton, !currentCommand && styles.sendButtonDisabled]}
          onPress={sendCommand}
          disabled={!currentCommand}
        >
          <Text style={styles.sendButtonText}>→</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: mobileColors.terminalBg,
    borderWidth: 1,
    borderColor: mobileColors.border,
    borderRadius: mobileBorderRadius.md,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: mobileSpacing.md,
    paddingVertical: mobileSpacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: mobileColors.border,
    backgroundColor: mobileColors.surface,
  },
  toolbarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: mobileSpacing.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: mobileColors.success,
  },
  statusDotDisconnected: {
    backgroundColor: mobileColors.danger,
  },
  statusText: {
    color: mobileColors.textSecondary,
    fontSize: mobileTypography.fontSize.xs,
  },
  reconnectText: {
    color: mobileColors.primary,
    fontSize: mobileTypography.fontSize.xs,
    fontWeight: mobileTypography.fontWeight.semibold as any,
  },
  clearButton: {
    paddingHorizontal: mobileSpacing.md,
    paddingVertical: mobileSpacing.xs,
  },
  clearButtonText: {
    color: mobileColors.danger,
    fontSize: mobileTypography.fontSize.sm,
    fontWeight: mobileTypography.fontWeight.medium as any,
  },
  terminalScroll: {
    flex: 1,
  },
  terminalContent: {
    padding: mobileSpacing.md,
    gap: mobileSpacing.xs,
  },
  lineContainer: {
    marginBottom: 2,
  },
  lineText: {
    color: mobileColors.text,
    fontSize: mobileTypography.fontSize.sm,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    lineHeight: 18,
  },
  commandText: {
    color: mobileColors.info,
    fontWeight: mobileTypography.fontWeight.semibold as any,
  },
  errorText: {
    color: mobileColors.danger,
  },
  inputToolbar: {
    borderTopWidth: 1,
    borderTopColor: mobileColors.border,
    borderBottomWidth: 1,
    borderBottomColor: mobileColors.border,
    backgroundColor: mobileColors.surfaceSecondary,
  },
  quickKeys: {
    flexDirection: 'row',
    padding: mobileSpacing.sm,
    gap: mobileSpacing.xs,
  },
  quickKey: {
    backgroundColor: mobileColors.surface,
    paddingHorizontal: mobileSpacing.md,
    paddingVertical: mobileSpacing.xs,
    borderRadius: mobileBorderRadius.sm,
  },
  quickKeyText: {
    color: mobileColors.text,
    fontSize: mobileTypography.fontSize.xs,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: mobileSpacing.md,
    paddingVertical: mobileSpacing.sm,
    borderTopWidth: 1,
    borderTopColor: mobileColors.border,
    backgroundColor: mobileColors.surface,
    gap: mobileSpacing.sm,
  },
  prompt: {
    color: mobileColors.success,
    fontSize: mobileTypography.fontSize.base,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontWeight: mobileTypography.fontWeight.bold as any,
  },
  input: {
    flex: 1,
    color: mobileColors.text,
    fontSize: mobileTypography.fontSize.sm,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    paddingVertical: mobileSpacing.xs,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: mobileColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: mobileColors.text,
    fontSize: mobileTypography.fontSize.lg,
    fontWeight: mobileTypography.fontWeight.bold as any,
  },
});
