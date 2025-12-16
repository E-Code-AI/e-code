import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { CodeEditor } from '../components/CodeEditor';
import { mobileColors } from '../../../shared/theme/mobile-theme';
import { updateProjectFile } from '../services/api';

type EditorScreenProps = NativeStackScreenProps<RootStackParamList, 'Editor'>;

const EditorScreen: React.FC<EditorScreenProps> = ({ route }) => {
  const { fileId, fileName, fileContent, projectId, token } = route.params;

  const handleSave = useCallback(async (content: string) => {
    try {
      const result = await updateProjectFile(projectId, fileId, content, token);
      if (result.success) {
        Alert.alert('Success', 'File saved successfully');
      } else {
        Alert.alert('Error', result.message || 'Failed to save file');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred';
      Alert.alert('Error', message);
    }
  }, [projectId, fileId, token]);

  return (
    <View style={styles.container}>
      <CodeEditor
        initialValue={fileContent}
        language={getLanguageFromFileName(fileName)}
        onSave={handleSave}
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
      return 'plaintext';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: mobileColors.background
  }
});

export default EditorScreen;
