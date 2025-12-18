import { useCallback, useEffect, useRef, useState } from 'react';
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
import { ModelSelector, useModelSelection } from '../components/ModelSelector';
import { useStreamingChat, ChatMessage } from '../hooks/useStreamingChat';
import { useProjectContext } from '../hooks/useProjectContext';
import { getModelDisplayName, getProviderConfig, AIProvider } from '../services/ai-provider';
import { AIModel } from '../../../shared/mobile-types';

type AgentScreenProps = NativeStackScreenProps<RootStackParamList, 'Agent'> & {
  token: string;
};

const AgentScreen: React.FC<AgentScreenProps> = ({ route, navigation, token }) => {
  const { projectId, projectName } = route.params;
  const [input, setInput] = useState('');
  const [useStreamingMode, setUseStreamingMode] = useState(true);
  const scrollViewRef = useRef<FlatList>(null);

  setMobileAgentToken(token);

  const { model, provider, isLoaded, updateSelection } = useModelSelection();

  const {
    context: projectContext,
    summary: contextSummary,
    isLoading: contextLoading,
    getContextBlock,
  } = useProjectContext({
    projectId,
    token,
    autoRefresh: true,
  });

  const {
    messages: streamingMessages,
    isStreaming,
    isLoading: streamingLoading,
    error: streamingError,
    sendMessage: sendStreamingMessage,
    cancelGeneration,
    clearMessages,
    retryLastMessage
  } = useStreamingChat({
    projectId,
    token,
    model,
    provider,
    onError: (error) => {
      console.error('[AgentScreen] Streaming error:', error.message);
    }
  });

  const { state: agentState, actions: agentActions } = useAgentSession({
    projectId,
    onBuildComplete: () => {
      console.log('[AgentScreen] Build completed successfully');
    },
    onError: (error) => {
      console.error('[AgentScreen] Error:', error.message);
    }
  });

  const messages = useStreamingMode ? streamingMessages : agentState.messages;
  const isLoading = useStreamingMode ? streamingLoading : agentState.isLoading;
  const isBuilding = agentState.isBuilding;

  const handleModelChange = useCallback((newModel: AIModel, newProvider: AIProvider) => {
    updateSelection(newModel, newProvider);
  }, [updateSelection]);

  useEffect(() => {
    const providerConfig = getProviderConfig(provider);
    navigation.setOptions({
      title: projectName,
      headerRight: () => (
        <View style={styles.headerRightContainer}>
          <ModelSelector onModelChange={handleModelChange} compact />
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.navigate('Project', { projectId, projectName })}
          >
            <Text style={styles.headerButtonText}>Editor</Text>
          </TouchableOpacity>
        </View>
      )
    });
  }, [navigation, projectId, projectName, provider, handleModelChange]);

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

    const contextBlock = getContextBlock();
    const messageWithContext = contextBlock 
      ? `${contextBlock}\n\n<user_request>\n${messageText}\n</user_request>`
      : messageText;

    if (useStreamingMode) {
      await sendStreamingMessage(messageWithContext);
    } else {
      await agentActions.sendMessage(messageWithContext);
    }
    setInput('');
  }, [input, useStreamingMode, sendStreamingMessage, agentActions, getContextBlock]);

  const handleCancelOrRetry = useCallback(() => {
    if (isStreaming) {
      cancelGeneration();
    } else if (streamingError) {
      retryLastMessage();
    }
  }, [isStreaming, streamingError, cancelGeneration, retryLastMessage]);

  const renderMessage = useCallback(({ item }: { item: ChatMessage | any }) => {
    const isUser = item.role === 'user';
    const isStreamingMessage = 'isStreaming' in item && item.isStreaming;
    
    return (
      <View style={[styles.messageContainer, isUser ? styles.userMessageContainer : styles.assistantMessageContainer]}>
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.assistantBubble]}>
          <Text style={[styles.messageText, isUser ? styles.userText : styles.assistantText]}>
            {item.content}
            {isStreamingMessage && <Text style={styles.cursor}>▊</Text>}
          </Text>
          {isStreamingMessage && (
            <View style={styles.streamingIndicator}>
              <ActivityIndicator size="small" color={mobileColors.primary} />
              <Text style={styles.streamingText}>Generating...</Text>
            </View>
          )}
          <Text style={styles.timestamp}>
            {item.timestamp instanceof Date 
              ? item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          </Text>
        </View>
      </View>
    );
  }, []);

  const keyExtractor = useCallback((item: any) => item.id, []);

  const listEmptyComponent = useCallback(() => {
    const providerConfig = getProviderConfig(provider);
    
    return (
      <View style={styles.emptyState}>
        <View style={styles.botIconContainer}>
          <Text style={styles.botIcon}>{providerConfig?.icon || '🤖'}</Text>
        </View>
        <Text style={styles.emptyTitle}>E-Code Agent</Text>
        <Text style={styles.modelBadge}>
          {getModelDisplayName(model)} • {providerConfig?.name}
        </Text>
        <Text style={styles.emptyText}>
          I'm your AI coding assistant powered by {providerConfig?.name}. Tell me what you'd like to build and I'll help you create it step by step.
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
    );
  }, [model, provider]);

  const contextHeaderComponent = useCallback(() => {
    if (!contextSummary) return null;
    
    return (
      <View style={styles.contextSummary} data-testid="context-summary">
        <View style={styles.contextSummaryRow}>
          <Text style={styles.contextSummaryIcon}>📁</Text>
          <Text style={styles.contextSummaryText}>
            {contextSummary.fileCount} files • {contextSummary.projectType}
          </Text>
          {contextLoading && (
            <ActivityIndicator size="small" color={mobileColors.textMuted} />
          )}
        </View>
        {contextSummary.hasActiveFile && contextSummary.activeFileName && (
          <View style={styles.contextSummaryRow}>
            <Text style={styles.contextSummaryIcon}>📄</Text>
            <Text style={styles.contextSummaryText}>
              Active: {contextSummary.activeFileName}
            </Text>
          </View>
        )}
        {contextSummary.recentChangeCount > 0 && (
          <View style={styles.contextSummaryRow}>
            <Text style={styles.contextSummaryIcon}>✏️</Text>
            <Text style={styles.contextSummaryText}>
              {contextSummary.recentChangeCount} recent changes
            </Text>
          </View>
        )}
      </View>
    );
  }, [contextSummary, contextLoading]);

  if (!isLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={mobileColors.primary} />
        <Text style={styles.loadingText}>Loading AI models...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 20}
    >
      {contextSummary && contextHeaderComponent()}
      
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

      {streamingError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>Error: {streamingError.message}</Text>
          <TouchableOpacity onPress={retryLastMessage} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.inputContainer}>
        {isStreaming && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={cancelGeneration}
          >
            <Text style={styles.cancelButtonText}>⏹</Text>
          </TouchableOpacity>
        )}
        <TextInput
          style={[styles.input, isStreaming && styles.inputStreaming]}
          placeholder="Ask the AI agent for help..."
          placeholderTextColor={mobileColors.textMuted}
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={500}
          editable={!isLoading && !isStreaming}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!input.trim() || isLoading || isStreaming) && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={!input.trim() || isLoading || isStreaming}
        >
          {isLoading && !isStreaming ? (
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: mobileColors.background,
    gap: mobileSpacing.lg,
  },
  loadingText: {
    color: mobileColors.textMuted,
    fontSize: mobileTypography.fontSize.base,
  },
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: mobileSpacing.sm,
  },
  headerButton: {
    paddingHorizontal: mobileSpacing.md,
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
    marginBottom: mobileSpacing.xs,
  },
  modelBadge: {
    fontSize: mobileTypography.fontSize.sm,
    color: mobileColors.primary,
    backgroundColor: mobileColors.primary + '20',
    paddingHorizontal: mobileSpacing.md,
    paddingVertical: mobileSpacing.xs,
    borderRadius: mobileBorderRadius.full,
    marginBottom: mobileSpacing.md,
    overflow: 'hidden',
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
  cursor: {
    color: mobileColors.primary,
    opacity: 0.7,
  },
  streamingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: mobileSpacing.sm,
    marginTop: mobileSpacing.xs,
  },
  streamingText: {
    fontSize: mobileTypography.fontSize.xs,
    color: mobileColors.primary,
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
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: mobileSpacing.md,
    backgroundColor: mobileColors.error + '20',
    borderTopWidth: 1,
    borderTopColor: mobileColors.error,
  },
  errorText: {
    color: mobileColors.error,
    fontSize: mobileTypography.fontSize.sm,
    flex: 1,
  },
  retryButton: {
    paddingHorizontal: mobileSpacing.md,
    paddingVertical: mobileSpacing.sm,
    backgroundColor: mobileColors.error,
    borderRadius: mobileBorderRadius.md,
  },
  retryButtonText: {
    color: mobileColors.text,
    fontSize: mobileTypography.fontSize.sm,
    fontWeight: mobileTypography.fontWeight.semibold as any,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: mobileSpacing.lg,
    gap: mobileSpacing.md,
    borderTopWidth: 1,
    borderTopColor: mobileColors.border,
    backgroundColor: mobileColors.surfaceSecondary,
    alignItems: 'flex-end',
  },
  cancelButton: {
    width: mobileSpacing['2xl'] + mobileSpacing.sm,
    height: mobileSpacing['2xl'] + mobileSpacing.sm,
    borderRadius: mobileBorderRadius.full,
    backgroundColor: mobileColors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: mobileColors.text,
    fontSize: mobileTypography.fontSize.lg,
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
  inputStreaming: {
    opacity: 0.5,
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
  contextSummary: {
    paddingHorizontal: mobileSpacing.lg,
    paddingVertical: mobileSpacing.md,
    backgroundColor: mobileColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: mobileColors.border,
    gap: mobileSpacing.xs,
  },
  contextSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: mobileSpacing.sm,
  },
  contextSummaryIcon: {
    fontSize: mobileTypography.fontSize.sm,
  },
  contextSummaryText: {
    color: mobileColors.textSecondary,
    fontSize: mobileTypography.fontSize.xs,
    flex: 1,
  },
});

export default AgentScreen;
