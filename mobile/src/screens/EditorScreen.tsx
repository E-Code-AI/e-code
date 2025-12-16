import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { CodeEditor } from '../components/CodeEditor';
import { mobileColors, mobileSpacing, mobileTypography, mobileBorderRadius } from '../../../shared/theme/mobile-theme';
import { updateProjectFile } from '../services/api';

type EditorScreenProps = NativeStackScreenProps<RootStackParamList, 'Editor'>;

const EditorScreen: React.FC<EditorScreenProps> = ({ route, navigation }) => {
  const { fileId, fileName, fileContent, projectId, token } = route.params;
  const [content, setContent] = useState(fileContent);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
    setHasChanges(newContent !== fileContent);
  }, [fileContent]);

  const handleSave = useCallback(async () => {
    if (saving) return;
    
    setSaving(true);
    try {
      const result = await updateProjectFile(projectId, fileId, content, token);
      if (result.success) {
        setHasChanges(false);
        Alert.alert('Success', 'File saved successfully');
      } else {
        Alert.alert('Error', result.message || 'Failed to save file');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred';
      Alert.alert('Error', message);
    } finally {
      setSaving(false);
    }
  }, [projectId, fileId, content, token, saving]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.fileInfo}>
          <Text style={styles.fileName}>{fileName}</Text>
          {hasChanges && <Text style={styles.unsavedIndicator}>●</Text>}
        </View>
        <TouchableOpacity
          style={[
            styles.saveButton,
            saving && styles.saveButtonDisabled,
            !hasChanges && styles.saveButtonDisabled
          ]}
          onPress={handleSave}
          disabled={saving || !hasChanges}
          data-testid="button-save"
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>
      <CodeEditor
        value={content}
        onChange={handleContentChange}
        language={getLanguageFromFileName(fileName) as 'javascript' | 'typescript' | 'python' | 'html' | 'css' | 'json'}
        readOnly={saving}
      />
    </View>
  );
};

function getLanguageFromFileName(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'js':
    case 'jsx':
      return 'javascript';
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'py':
      return 'python';
    case 'html':
      return 'html';
    case 'css':
      return 'css';
    case 'json':
      return 'json';
    case 'md':
      return 'markdown';
    default:
      return 'javascript';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: mobileColors.background
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: mobileSpacing.md,
    paddingVertical: mobileSpacing.sm,
    backgroundColor: mobileColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: mobileColors.border
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  fileName: {
    fontSize: mobileTypography.fontSize.base,
    fontWeight: '600',
    color: mobileColors.text,
    fontFamily: 'monospace'
  },
  unsavedIndicator: {
    fontSize: mobileTypography.fontSize.sm,
    color: mobileColors.warning,
    marginLeft: mobileSpacing.xs
  },
  saveButton: {
    backgroundColor: mobileColors.primary,
    paddingHorizontal: mobileSpacing.lg,
    paddingVertical: mobileSpacing.sm,
    borderRadius: mobileBorderRadius.md,
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center'
  },
  saveButtonDisabled: {
    backgroundColor: mobileColors.textMuted,
    opacity: 0.6
  },
  saveButtonText: {
    color: '#fff',
    fontSize: mobileTypography.fontSize.sm,
    fontWeight: '600'
  }
});

export default EditorScreen;
