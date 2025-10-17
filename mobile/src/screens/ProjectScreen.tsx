import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../navigation/types';
import { ProjectFile, RunResult } from '../types';
import { getProjectFiles, runProject, updateProjectFile } from '../services/api';

type ProjectScreenProps = NativeStackScreenProps<RootStackParamList, 'Project'> & {
  token: string;
};

const ProjectScreen: React.FC<ProjectScreenProps> = ({ route, token }) => {
  const { projectId } = route.params;
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<number | null>(null);
  const [editorContent, setEditorContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#38bdf8" />
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

      <View style={styles.content}>
        <View style={styles.fileList}>
          <Text style={styles.sectionTitle}>Files</Text>
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

        <View style={styles.editorContainer}>
          <Text style={styles.sectionTitle}>{selectedFile?.path ?? 'Select a file to edit'}</Text>
          <ScrollView style={styles.editorScroll} keyboardShouldPersistTaps="handled">
            <TextInput
              style={styles.editor}
              multiline
              editable={Boolean(selectedFile)}
              value={editorContent}
              onChangeText={setEditorContent}
              placeholder={selectedFile ? undefined : 'Select a file to see its contents'}
              placeholderTextColor="#475569"
            />
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.saveButton, (!selectedFile || saving) && styles.disabledButton]}
              onPress={handleSave}
              disabled={!selectedFile || saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
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
                <ActivityIndicator color="#fff" />
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
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617'
  },
  loader: {
    paddingVertical: 16
  },
  errorContainer: {
    backgroundColor: '#450a0a',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#b91c1c'
  },
  errorText: {
    color: '#fecaca',
    marginBottom: 8
  },
  retryButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#dc2626',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8
  },
  retryText: {
    color: '#fff',
    fontWeight: '600'
  },
  content: {
    flex: 1,
    flexDirection: 'row'
  },
  fileList: {
    width: 140,
    borderRightWidth: 1,
    borderRightColor: '#1e293b',
    padding: 12,
    gap: 12
  },
  fileListContent: {
    gap: 8
  },
  sectionTitle: {
    color: '#e2e8f0',
    fontWeight: '600',
    fontSize: 16
  },
  fileItem: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#0f172a'
  },
  fileItemActive: {
    backgroundColor: '#1d4ed8'
  },
  fileName: {
    color: '#e2e8f0',
    fontWeight: '600'
  },
  fileLanguage: {
    color: '#cbd5f5',
    fontSize: 12
  },
  editorContainer: {
    flex: 1,
    padding: 16,
    gap: 12
  },
  editorScroll: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 12,
    backgroundColor: '#0f172a'
  },
  editor: {
    minHeight: 240,
    color: '#e2e8f0',
    fontSize: 14,
    padding: 16
  },
  actions: {
    flexDirection: 'row',
    gap: 12
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center'
  },
  saveButton: {
    backgroundColor: '#2563eb'
  },
  runButton: {
    backgroundColor: '#16a34a'
  },
  disabledButton: {
    opacity: 0.6
  },
  actionText: {
    color: '#fff',
    fontWeight: '600'
  },
  outputContainer: {
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 12,
    backgroundColor: '#0f172a'
  },
  outputTitle: {
    padding: 12,
    color: '#38bdf8',
    fontWeight: '600'
  },
  outputScroll: {
    maxHeight: 160,
    paddingHorizontal: 12,
    paddingBottom: 12
  },
  outputText: {
    color: '#d1fae5',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    marginBottom: 8
  },
  errorOutput: {
    color: '#fecaca',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    marginBottom: 8
  },
  outputMeta: {
    color: '#94a3b8',
    fontSize: 12
  },
  emptyText: {
    color: '#94a3b8',
    fontStyle: 'italic'
  }
});

export default ProjectScreen;
