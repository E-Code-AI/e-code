import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../navigation/types';
import { ProjectFile, RunResult } from '../types';
import { getProjectFiles, runProject, updateProjectFile } from '../services/api';
import { mobileColors, mobileSpacing, mobileTypography, mobileBorderRadius } from '../../../shared/theme/mobile-theme';
import { useAgentSession } from '../../../shared/agent';
import { setMobileAgentToken } from '../lib/agentApiClient';
import { CodeEditor } from '../components/CodeEditor';
import { Terminal } from '../components/Terminal';

type ProjectScreenProps = NativeStackScreenProps<RootStackParamList, 'Project'> & {
  token: string;
};

type TabType = 'agent' | 'files' | 'editor' | 'terminal';

const ProjectScreen: React.FC<ProjectScreenProps> = ({ route, token }) => {
  const { projectId, projectName } = route.params;
  const [activeTab, setActiveTab] = useState<TabType>('agent');
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<number | null>(null);
  const [editorContent, setEditorContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Agent input state (separate from shared hook)
  const [agentInput, setAgentInput] = useState('');
  const scrollViewRef = useRef<FlatList>(null);

  const { width } = useWindowDimensions();

  // Configure mobile API client with auth token BEFORE using the hook
  // This prevents race conditions where the hook tries to send messages before token is set
  setMobileAgentToken(token);

  // Use shared Agent session hook
  const { state, actions } = useAgentSession({
    projectId,
    onBuildComplete: () => {
      console.log('[ProjectScreen] Build completed successfully');
    },
    onError: (error) => {
      console.error('[ProjectScreen] Error:', error.message);
    }
  });

  const { messages, isLoading: isAgentLoading, isBuilding } = state;
  const { sendMessage: sendAgentMessage } = actions;

  const loadFiles = useCallback(async () => {
    setError(null);
    try {
      const data = await getProjectFiles(projectId, token);
      setFiles(data);
      setSelectedFileId((currentId) => {
        const next = data.find((file) => file.id === currentId) ?? data[0] ?? null;
        setEditorContent(next?.content ?? '');
        return next ? next.id : null;
      });
    } catch (err: any) {
      setError(err.message ?? 'Failed to load project files');
    }
  }, [projectId, token]);

  const refreshFiles = useCallback(async () => {
    setLoading(true);
    try {
      await loadFiles();
    } finally {
      setLoading(false);
    }
  }, [loadFiles]);

  useEffect(() => {
    refreshFiles();
  }, [refreshFiles]);

  const selectedFile = useMemo(
    () => files.find((file) => file.id === selectedFileId) ?? null,
    [files, selectedFileId]
  );

  const handleSelectFile = useCallback((file: ProjectFile) => {
    setSelectedFileId(file.id);
    setEditorContent(file.content ?? '');
    setRunResult(null);
    // Auto-switch to editor tab when file selected
    setActiveTab('editor');
  }, []);

  const handleSave = useCallback(async () => {
    if (!selectedFile) {
      return;
    }

    setSaving(true);
    try {
      await updateProjectFile(projectId, selectedFile.id, editorContent, token);
      await loadFiles();
      Alert.alert('File saved', `${selectedFile.path} was updated successfully.`);
    } catch (err: any) {
      Alert.alert('Save failed', err.message ?? 'Unable to save file');
    } finally {
      setSaving(false);
    }
  }, [editorContent, loadFiles, projectId, selectedFile, token]);

  const handleRun = useCallback(async () => {
    if (!selectedFile) {
      return;
    }

    setRunning(true);
    try {
      const result = await runProject(
        projectId,
        {
          fileId: selectedFile.id,
          code: editorContent,
          language: selectedFile.language
        },
        token
      );
      setRunResult(result);
    } catch (err: any) {
      Alert.alert('Execution failed', err.message ?? 'Unable to execute project');
    } finally {
      setRunning(false);
    }
  }, [editorContent, projectId, selectedFile, token]);

  // Agent functions
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
    const messageText = agentInput.trim();
    if (!messageText) return;

    await sendAgentMessage(messageText);
    setAgentInput('');
  }, [agentInput, sendAgentMessage]);

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

  const agentEmptyState = useCallback(() => (
    <View style={styles.emptyState}>
      <View style={styles.botIconContainer}>
        <Text style={styles.botIcon}>🤖</Text>
      </View>
      <Text style={styles.emptyTitle}>E-Code Agent</Text>
      <Text style={styles.emptyText}>
        I'm your AI coding assistant for {projectName}. Tell me what you'd like to build and I'll help you create it.
      </Text>
      <View style={styles.suggestionContainer}>
        <Text style={styles.suggestionTitle}>Try asking me to:</Text>
        <TouchableOpacity
          style={styles.suggestionChip}
          onPress={() => setAgentInput('Add error handling to my functions')}
        >
          <Text style={styles.suggestionText}>Add error handling</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.suggestionChip}
          onPress={() => setAgentInput('Refactor this code to be more efficient')}
        >
          <Text style={styles.suggestionText}>Refactor my code</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.suggestionChip}
          onPress={() => setAgentInput('Create unit tests for my project')}
        >
          <Text style={styles.suggestionText}>Create unit tests</Text>
        </TouchableOpacity>
      </View>
    </View>
  ), [projectName]);

  const renderFile = ({ item }: { item: ProjectFile }) => {
    const isSelected = item.id === selectedFileId;
    return (
      <TouchableOpacity
        style={[styles.fileItem, isSelected && styles.fileItemActive]}
        onPress={() => handleSelectFile(item)}
      >
        <Text style={styles.fileName}>{item.path}</Text>
        <Text style={styles.fileLanguage}>{item.language}</Text>
      </TouchableOpacity>
    );
  };

  const renderTabContent = () => {
    if (activeTab === 'agent') {
      return (
        <KeyboardAvoidingView
          style={styles.tabContent}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 150 : 0}
        >
          <FlatList
            ref={scrollViewRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesContainer}
            ListEmptyComponent={agentEmptyState}
            onContentSizeChange={scrollToBottom}
            onLayout={scrollToBottom}
          />

          <View style={styles.agentInputContainer}>
            <TextInput
              style={styles.agentInput}
              placeholder="Ask the AI agent for help..."
              placeholderTextColor={mobileColors.textMuted}
              value={agentInput}
              onChangeText={setAgentInput}
              multiline
              maxLength={500}
              editable={!isAgentLoading}
            />
            <TouchableOpacity
              style={[styles.sendButton, (!agentInput.trim() || isAgentLoading) && styles.sendButtonDisabled]}
              onPress={sendMessage}
              disabled={!agentInput.trim() || isAgentLoading}
            >
              {isAgentLoading ? (
                <ActivityIndicator color={mobileColors.text} size="small" />
              ) : (
                <Text style={styles.sendButtonText}>➤</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      );
    }

    if (activeTab === 'files') {
      return (
        <View style={styles.tabContent}>
          {loading ? (
            <View style={styles.loader}>
              <ActivityIndicator size="large" color={mobileColors.primary} />
            </View>
          ) : null}

          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={refreshFiles}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <FlatList
            data={files}
            renderItem={renderFile}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.fileListContent}
            ListEmptyComponent={
              <Text style={styles.emptyText}>This project does not contain any files yet.</Text>
            }
          />
        </View>
      );
    }

    // Terminal tab
    if (activeTab === 'terminal') {
      return (
        <View style={styles.tabContent}>
          <Terminal projectId={projectId} token={token} />
        </View>
      );
    }

    // Editor tab
    return (
      <View style={styles.tabContent}>
        <Text style={styles.sectionTitle}>{selectedFile?.path ?? 'Select a file to edit'}</Text>
        <CodeEditor
          value={editorContent}
          onChange={setEditorContent}
          language={selectedFile?.language as any}
          readOnly={!selectedFile}
          placeholder={selectedFile ? undefined : 'Select a file from Files tab'}
        />

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.saveButton, (!selectedFile || saving) && styles.disabledButton]}
            onPress={handleSave}
            disabled={!selectedFile || saving}
          >
            {saving ? (
              <ActivityIndicator color={mobileColors.text} />
            ) : (
              <Text style={styles.actionText}>Save</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.runButton, (!selectedFile || running) && styles.disabledButton]}
            onPress={handleRun}
            disabled={!selectedFile || running}
          >
            {running ? (
              <ActivityIndicator color={mobileColors.text} />
            ) : (
              <Text style={styles.actionText}>Run</Text>
            )}
          </TouchableOpacity>
        </View>

        {runResult ? (
          <View style={styles.outputContainer}>
            <Text style={styles.outputTitle}>Terminal output</Text>
            <ScrollView style={styles.outputScroll}>
              {runResult.output ? (
                <Text style={styles.outputText}>{runResult.output.trim()}</Text>
              ) : null}
              {runResult.error ? (
                <Text style={styles.errorOutput}>{runResult.error.trim()}</Text>
              ) : null}
              <Text style={styles.outputMeta}>
                Exit code {runResult.exitCode} · {runResult.executionTime}ms
              </Text>
            </ScrollView>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'agent' && styles.tabActive]}
          onPress={() => setActiveTab('agent')}
        >
          <Text style={[styles.tabText, activeTab === 'agent' && styles.tabTextActive]}>
            ✨ Agent
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'files' && styles.tabActive]}
          onPress={() => setActiveTab('files')}
        >
          <Text style={[styles.tabText, activeTab === 'files' && styles.tabTextActive]}>
            📁 Files
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'editor' && styles.tabActive]}
          onPress={() => setActiveTab('editor')}
        >
          <Text style={[styles.tabText, activeTab === 'editor' && styles.tabTextActive]}>
            📝 Editor
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'terminal' && styles.tabActive]}
          onPress={() => setActiveTab('terminal')}
        >
          <Text style={[styles.tabText, activeTab === 'terminal' && styles.tabTextActive]}>
            💻 Terminal
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {renderTabContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: mobileColors.background,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: mobileColors.border,
    backgroundColor: mobileColors.surface,
  },
  tab: {
    flex: 1,
    paddingVertical: mobileSpacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: mobileColors.primary,
    backgroundColor: mobileColors.surfaceHover,
  },
  tabText: {
    fontSize: mobileTypography.fontSize.sm,
    fontWeight: mobileTypography.fontWeight.medium as any,
    color: mobileColors.textSecondary,
  },
  tabTextActive: {
    color: mobileColors.primary,
    fontWeight: mobileTypography.fontWeight.semibold as any,
  },
  tabContent: {
    flex: 1,
  },

  // Agent tab styles
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
  agentInputContainer: {
    flexDirection: 'row',
    padding: mobileSpacing.lg,
    gap: mobileSpacing.md,
    borderTopWidth: 1,
    borderTopColor: mobileColors.border,
    backgroundColor: mobileColors.surfaceSecondary,
  },
  agentInput: {
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

  // Files tab styles
  loader: {
    paddingVertical: mobileSpacing.lg,
  },
  errorContainer: {
    backgroundColor: mobileColors.danger + '20',
    margin: mobileSpacing.lg,
    padding: mobileSpacing.lg,
    borderRadius: mobileBorderRadius.md,
    borderWidth: 1,
    borderColor: mobileColors.danger,
  },
  errorText: {
    color: mobileColors.danger,
    marginBottom: mobileSpacing.sm,
  },
  retryButton: {
    alignSelf: 'flex-start',
    backgroundColor: mobileColors.danger,
    paddingHorizontal: mobileSpacing.lg,
    paddingVertical: mobileSpacing.sm,
    borderRadius: mobileBorderRadius.sm,
  },
  retryText: {
    color: mobileColors.text,
    fontWeight: mobileTypography.fontWeight.semibold as any,
  },
  fileListContent: {
    padding: mobileSpacing.lg,
    gap: mobileSpacing.sm,
  },
  fileItem: {
    padding: mobileSpacing.md,
    borderRadius: mobileBorderRadius.md,
    backgroundColor: mobileColors.surface,
  },
  fileItemActive: {
    backgroundColor: mobileColors.primary,
  },
  fileName: {
    color: mobileColors.text,
    fontWeight: mobileTypography.fontWeight.semibold as any,
  },
  fileLanguage: {
    color: mobileColors.textSecondary,
    fontSize: mobileTypography.fontSize.sm,
  },

  // Editor tab styles
  sectionTitle: {
    color: mobileColors.text,
    fontWeight: mobileTypography.fontWeight.semibold as any,
    fontSize: mobileTypography.fontSize.lg,
    padding: mobileSpacing.lg,
  },
  editorScroll: {
    flex: 1,
    borderWidth: 1,
    borderColor: mobileColors.border,
    borderRadius: mobileBorderRadius.md,
    backgroundColor: mobileColors.editorBg,
    marginHorizontal: mobileSpacing.lg,
  },
  editor: {
    minHeight: mobileSpacing['3xl'] * 7.5,
    color: mobileColors.text,
    fontSize: mobileTypography.fontSize.sm,
    fontFamily: mobileTypography.fontFamily.mono,
    padding: mobileSpacing.lg,
  },
  actions: {
    flexDirection: 'row',
    gap: mobileSpacing.md,
    padding: mobileSpacing.lg,
  },
  actionButton: {
    flex: 1,
    borderRadius: mobileBorderRadius.md,
    paddingVertical: mobileSpacing.md,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: mobileColors.buttonPrimary,
  },
  runButton: {
    backgroundColor: mobileColors.success,
  },
  disabledButton: {
    opacity: 0.6,
  },
  actionText: {
    color: mobileColors.text,
    fontWeight: mobileTypography.fontWeight.semibold as any,
  },
  outputContainer: {
    borderWidth: 1,
    borderColor: mobileColors.border,
    borderRadius: mobileBorderRadius.md,
    backgroundColor: mobileColors.terminalBg,
    marginHorizontal: mobileSpacing.lg,
    marginBottom: mobileSpacing.lg,
  },
  outputTitle: {
    padding: mobileSpacing.md,
    color: mobileColors.info,
    fontWeight: mobileTypography.fontWeight.semibold as any,
  },
  outputScroll: {
    maxHeight: mobileSpacing['3xl'] * 5,
    paddingHorizontal: mobileSpacing.md,
    paddingBottom: mobileSpacing.md,
  },
  outputText: {
    color: mobileColors.success,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    marginBottom: mobileSpacing.sm,
  },
  errorOutput: {
    color: mobileColors.danger,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    marginBottom: mobileSpacing.sm,
  },
  outputMeta: {
    color: mobileColors.textMuted,
    fontSize: mobileTypography.fontSize.xs,
  },
});

export default ProjectScreen;
