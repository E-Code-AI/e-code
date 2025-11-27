import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { ProjectFile } from '../types';
import { mobileColors, mobileSpacing, mobileTypography, mobileBorderRadius } from '../../../shared/theme/mobile-theme';

type FileManagerScreenProps = NativeStackScreenProps<RootStackParamList, 'FileManager'> & {
  projectId: number;
  token: string;
};

const FileManagerScreen: React.FC<FileManagerScreenProps> = ({ navigation, projectId, token }) => {
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPath, setCurrentPath] = useState('/');

  useEffect(() => {
    fetchFiles();
  }, [currentPath]);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      // TODO: Implement real API
      await new Promise(resolve => setTimeout(resolve, 500));

      const mockFiles: ProjectFile[] = [
        { id: 1, name: 'src', path: '/src', isDirectory: true, size: 0, content: '' },
        { id: 2, name: 'package.json', path: '/package.json', isDirectory: false, size: 1024, content: '' },
        { id: 3, name: 'README.md', path: '/README.md', isDirectory: false, size: 512, content: '' },
        { id: 4, name: 'tsconfig.json', path: '/tsconfig.json', isDirectory: false, size: 256, content: '' }
      ];

      setFiles(mockFiles);
    } finally {
      setLoading(false);
    }
  };

  const handleFilePress = useCallback((file: ProjectFile) => {
    if (file.isDirectory) {
      setCurrentPath(file.path);
    } else {
      // Open file in editor
      Alert.alert('Open File', `Opening ${file.name}`);
    }
  }, []);

  const handleFileLongPress = useCallback((file: ProjectFile) => {
    Alert.alert(
      file.name,
      'Choose an action',
      [
        { text: 'Open', onPress: () => handleFilePress(file) },
        { text: 'Rename', onPress: () => Alert.alert('Coming Soon') },
        { text: 'Delete', style: 'destructive', onPress: () => Alert.alert('Coming Soon') },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  }, [handleFilePress]);

  const getFileIcon = (file: ProjectFile) => {
    if (file.isDirectory) return '📁';

    const ext = file.name.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'js':
      case 'jsx':
      case 'ts':
      case 'tsx':
        return '📜';
      case 'json':
        return '📋';
      case 'md':
        return '📝';
      case 'css':
      case 'scss':
        return '🎨';
      case 'html':
        return '🌐';
      default:
        return '📄';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '--';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const renderFile = useCallback(
    ({ item }: { item: ProjectFile }) => (
      <TouchableOpacity
        style={styles.fileItem}
        onPress={() => handleFilePress(item)}
        onLongPress={() => handleFileLongPress(item)}
      >
        <Text style={styles.fileIcon}>{getFileIcon(item)}</Text>
        <View style={styles.fileInfo}>
          <Text style={styles.fileName}>{item.name}</Text>
          {!item.isDirectory && (
            <Text style={styles.fileSize}>{formatFileSize(item.size)}</Text>
          )}
        </View>
        <Text style={styles.fileArrow}>›</Text>
      </TouchableOpacity>
    ),
    [handleFilePress, handleFileLongPress]
  );

  return (
    <View style={styles.container}>
      <View style={styles.pathBar}>
        <TouchableOpacity onPress={() => setCurrentPath('/')}>
          <Text style={styles.pathText}>~</Text>
        </TouchableOpacity>
        <Text style={styles.pathText}>{currentPath}</Text>
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={mobileColors.primary} />
        </View>
      ) : files.length > 0 ? (
        <FlatList
          data={files}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderFile}
          contentContainerStyle={styles.list}
        />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📂</Text>
          <Text style={styles.emptyTitle}>Empty Directory</Text>
        </View>
      )}

      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.actionButton} onPress={() => Alert.alert('Coming Soon')}>
          <Text style={styles.actionButtonText}>+ New File</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => Alert.alert('Coming Soon')}>
          <Text style={styles.actionButtonText}>+ New Folder</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: mobileColors.background
  },
  pathBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: mobileSpacing.md,
    paddingVertical: mobileSpacing.sm,
    backgroundColor: mobileColors.surfaceSecondary,
    borderBottomWidth: 1,
    borderBottomColor: mobileColors.border,
    gap: mobileSpacing.xs
  },
  pathText: {
    fontSize: mobileTypography.fontSize.sm,
    color: mobileColors.textSecondary,
    fontFamily: 'monospace'
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  list: {
    padding: mobileSpacing.md
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: mobileColors.surfaceSecondary,
    borderRadius: mobileBorderRadius.md,
    padding: mobileSpacing.md,
    marginBottom: mobileSpacing.sm,
    borderWidth: 1,
    borderColor: mobileColors.border
  },
  fileIcon: {
    fontSize: 24,
    marginRight: mobileSpacing.md
  },
  fileInfo: {
    flex: 1
  },
  fileName: {
    fontSize: mobileTypography.fontSize.base,
    fontWeight: '600',
    color: mobileColors.text,
    marginBottom: 2
  },
  fileSize: {
    fontSize: mobileTypography.fontSize.xs,
    color: mobileColors.textMuted,
    fontFamily: 'monospace'
  },
  fileArrow: {
    fontSize: 24,
    color: mobileColors.textMuted,
    fontWeight: '300'
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: mobileSpacing.md
  },
  emptyTitle: {
    fontSize: mobileTypography.fontSize.lg,
    fontWeight: '600',
    color: mobileColors.text
  },
  actionBar: {
    flexDirection: 'row',
    gap: mobileSpacing.sm,
    padding: mobileSpacing.md,
    backgroundColor: mobileColors.surfaceSecondary,
    borderTopWidth: 1,
    borderTopColor: mobileColors.border
  },
  actionButton: {
    flex: 1,
    paddingVertical: mobileSpacing.sm,
    backgroundColor: mobileColors.primary,
    borderRadius: mobileBorderRadius.md,
    alignItems: 'center'
  },
  actionButtonText: {
    fontSize: mobileTypography.fontSize.sm,
    fontWeight: '600',
    color: '#fff'
  }
});

export default FileManagerScreen;
