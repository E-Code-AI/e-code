import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { CodeEditor } from '../components/CodeEditor';
import { mobileColors } from '../../../shared/theme/mobile-theme';

type EditorScreenProps = NativeStackScreenProps<RootStackParamList, 'Editor'> & {
  fileId: number;
  fileName: string;
  fileContent: string;
  token: string;
};

const EditorScreen: React.FC<EditorScreenProps> = ({ route, token }) => {
  const { fileId, fileName, fileContent } = route.params;

  return (
    <View style={styles.container}>
      <CodeEditor
        initialValue={fileContent}
        language={getLanguageFromFileName(fileName)}
        onSave={(content) => {
          // TODO: Save file
          console.log('Saving file:', fileName);
        }}
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
