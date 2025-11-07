import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../navigation/types';
import { useAgentSession } from '../../../shared/agent';
import { setMobileAgentToken } from '../lib/agentApiClient';
import { mobileColors, mobileSpacing, mobileTypography, mobileBorderRadius } from '../../../shared/theme/mobile-theme';

type AgentScreenProps = NativeStackScreenProps<RootStackParamList, 'Agent'> & {
  token: string;
};

const AgentScreen: React.FC<AgentScreenProps> = ({ route, navigation, token }) => {
  const { projectId, projectName } = route.params;
  const [input, setInput] = useState('');
  const scrollViewRef = useRef<FlatList>(null);

  // Configure mobile API client with auth token BEFORE using the hook
  // This prevents race conditions where the hook tries to send messages before token is set
  setMobileAgentToken(token);

  // Set navigation header with action to open editor
  useEffect(() => {
    navigation.setOptions({
      title: projectName,
      headerRight: () => (
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.navigate('Project', { projectId, projectName })}
        >
          <Text style={styles.headerButtonText}>Editor</Text>
        </TouchableOpacity>
      )
    });
  }, [navigation, projectId, projectName]);

  // Use shared Agent session hook
  const { state, actions } = useAgentSession({
    projectId,
    onBuildComplete: () => {
      console.log('[AgentScreen] Build completed successfully');
    },
    onError: (error) => {
      console.error('[AgentScreen] Error:', error.message);
    }
  });

  const { messages, isLoading, isBuilding } = state;
  const { sendMessage: sendAgentMessage } = actions;

  const scrollToBottom = useCallback(() => {
    if (scrollViewRef.current && messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessage = useCallback(async () => {
    const messageText = input.trim();
    if (!messageText) return;

    await sendAgentMessage(messageText);
    setInput('');
  }, [input, sendAgentMessage]);

  const renderMessage = useCallback(({ item }: { item: any }) => {
    const isUser = item.role === 'user';
    
    return (
      <View style={[styles.messageContainer, isUser ? styles.userMessageContainer : styles.assistantMessageContainer]}>
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.assistantBubble]}>
          <Text style={[styles.messageText, isUser ? styles.userText : styles.assistantText]}>
            {item.content}
          </Text>
          <Text style={styles.timestamp}>
            {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  }, []);

  const keyExtractor = useCallback((item: any) => item.id, []);

  const listEmptyComponent = useCallback(() => (
    <View style={styles.emptyState}>
      <View style={styles.botIconContainer}>
        <Text style={styles.botIcon}>🤖</Text>
      </View>
      <Text style={styles.emptyTitle}>E-Code Agent</Text>
      <Text style={styles.emptyText}>
        I'm your AI coding assistant. Tell me what you'd like to build and I'll help you create it step by step.
      </Text>
      <View style={styles.suggestionContainer}>
        <Text style={styles.suggestionTitle}>Try asking me to:</Text>
        <TouchableOpacity
          style={styles.suggestionChip}
          onPress={() => setInput('Create a login page with email and password fields')}
        >
          <Text style={styles.suggestionText}>Create a login page</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.suggestionChip}
          onPress={() => setInput('Add a navigation menu to my app')}
        >
          <Text style={styles.suggestionText}>Add navigation menu</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.suggestionChip}
          onPress={() => setInput('Build a user profile component')}
        >
          <Text style={styles.suggestionText}>Build user profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  ), []);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <FlatList
        ref={scrollViewRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.messagesContainer}
        ListEmptyComponent={listEmptyComponent}
        onContentSizeChange={scrollToBottom}
        onLayout={scrollToBottom}
      />

      {isBuilding && (
        <View style={styles.buildingIndicator}>
          <ActivityIndicator color={mobileColors.info} />
          <Text style={styles.buildingText}>Building your feature...</Text>
        </View>
      )}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Ask the AI agent for help..."
          placeholderTextColor={mobileColors.textMuted}
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={500}
          editable={!isLoading}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!input.trim() || isLoading) && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={!input.trim() || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={mobileColors.text} size="small" />
          ) : (
            <Text style={styles.sendButtonText}>➤</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: mobileColors.background,
  },
  headerButton: {
    paddingHorizontal: mobileSpacing.lg,
    paddingVertical: mobileSpacing.sm,
  },
  headerButtonText: {
    color: mobileColors.primary,
    fontSize: mobileTypography.fontSize.base,
    fontWeight: mobileTypography.fontWeight.semibold as any,
  },
  messagesContainer: {
    padding: mobileSpacing.lg,
    gap: mobileSpacing.md,
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: mobileSpacing['3xl'],
    paddingVertical: mobileSpacing['4xl'],
  },
  botIconContainer: {
    width: mobileSpacing['4xl'] * 2,
    height: mobileSpacing['4xl'] * 2,
    borderRadius: mobileBorderRadius.full,
    backgroundColor: mobileColors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: mobileSpacing.lg,
  },
  botIcon: {
    fontSize: mobileTypography.fontSize['4xl'],
  },
  emptyTitle: {
    fontSize: mobileTypography.fontSize['2xl'],
    fontWeight: mobileTypography.fontWeight.bold as any,
    color: mobileColors.text,
    marginBottom: mobileSpacing.sm,
  },
  emptyText: {
    fontSize: mobileTypography.fontSize.base,
    color: mobileColors.textMuted,
    textAlign: 'center',
    lineHeight: mobileTypography.fontSize.base * mobileTypography.lineHeight.relaxed,
    marginBottom: mobileSpacing['2xl'],
  },
  suggestionContainer: {
    width: '100%',
    gap: mobileSpacing.md,
  },
  suggestionTitle: {
    fontSize: mobileTypography.fontSize.sm,
    fontWeight: mobileTypography.fontWeight.semibold as any,
    color: mobileColors.textSecondary,
    marginBottom: mobileSpacing.xs,
  },
  suggestionChip: {
    backgroundColor: mobileColors.surface,
    paddingHorizontal: mobileSpacing.lg,
    paddingVertical: mobileSpacing.md,
    borderRadius: mobileBorderRadius.md,
    borderWidth: 1,
    borderColor: mobileColors.border,
  },
  suggestionText: {
    color: mobileColors.primary,
    fontSize: mobileTypography.fontSize.sm,
    fontWeight: mobileTypography.fontWeight.medium as any,
  },
  messageContainer: {
    marginVertical: mobileSpacing.xs,
  },
  userMessageContainer: {
    alignItems: 'flex-end',
  },
  assistantMessageContainer: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '85%',
    borderRadius: mobileBorderRadius.lg,
    padding: mobileSpacing.md,
  },
  userBubble: {
    backgroundColor: mobileColors.buttonPrimary,
    borderBottomRightRadius: mobileSpacing.xs,
  },
  assistantBubble: {
    backgroundColor: mobileColors.surface,
    borderBottomLeftRadius: mobileSpacing.xs,
  },
  messageText: {
    fontSize: mobileTypography.fontSize.base,
    lineHeight: mobileTypography.fontSize.base * mobileTypography.lineHeight.normal,
    marginBottom: mobileSpacing.xs,
  },
  userText: {
    color: mobileColors.text,
  },
  assistantText: {
    color: mobileColors.text,
  },
  timestamp: {
    fontSize: mobileTypography.fontSize.xs,
    color: mobileColors.textMuted,
    alignSelf: 'flex-end',
  },
  buildingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: mobileSpacing.lg,
    backgroundColor: mobileColors.surfaceSecondary,
    borderTopWidth: 1,
    borderTopColor: mobileColors.border,
    gap: mobileSpacing.md,
  },
  buildingText: {
    color: mobileColors.info,
    fontSize: mobileTypography.fontSize.sm,
    fontWeight: mobileTypography.fontWeight.medium as any,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: mobileSpacing.lg,
    gap: mobileSpacing.md,
    borderTopWidth: 1,
    borderTopColor: mobileColors.border,
    backgroundColor: mobileColors.surfaceSecondary,
  },
  input: {
    flex: 1,
    backgroundColor: mobileColors.surface,
    borderRadius: mobileBorderRadius.lg * 2,
    paddingHorizontal: mobileSpacing.lg,
    paddingVertical: mobileSpacing.md,
    color: mobileColors.text,
    fontSize: mobileTypography.fontSize.base,
    maxHeight: mobileSpacing['3xl'] * 3.75,
    borderWidth: 1,
    borderColor: mobileColors.border,
  },
  sendButton: {
    width: mobileSpacing['3xl'] + mobileSpacing.lg,
    height: mobileSpacing['3xl'] + mobileSpacing.lg,
    borderRadius: mobileBorderRadius.full,
    backgroundColor: mobileColors.buttonPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: mobileColors.text,
    fontSize: mobileTypography.fontSize.xl,
    fontWeight: mobileTypography.fontWeight.semibold as any,
  },
});

export default AgentScreen;
