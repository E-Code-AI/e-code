import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { ProjectFile } from '../types';
import { mobileColors, mobileSpacing, mobileTypography, mobileBorderRadius } from '../../../shared/theme/mobile-theme';
import { getFiles, createFile, renameFile, deleteFile } from '../services/api';

type FileManagerScreenProps = NativeStackScreenProps<RootStackParamList, 'FileManager'>;

const FileManagerScreen: React.FC<FileManagerScreenProps> = ({ navigation, route }) => {
  const { projectId, token } = route.params;
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPath, setCurrentPath] = useState('/');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'newFile' | 'newFolder' | 'rename'>('newFile');
  const [inputValue, setInputValue] = useState('');
  const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchFiles();
  }, [currentPath]);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const fetchedFiles = await getFiles(projectId, currentPath, token);
      setFiles(fetchedFiles);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const handleFilePress = useCallback((file: ProjectFile) => {
    if (file.isDirectory) {
      setCurrentPath(file.path);
    } else {
      navigation.navigate('Editor', { 
        projectId, 
        fileId: file.id, 
        fileName: file.name,
        fileContent: file.content || '',
        token 
      });
    }
  }, [navigation, projectId, token]);

  const handleRename = useCallback((file: ProjectFile) => {
    setSelectedFile(file);
    setInputValue(file.name);
    setModalType('rename');
    setModalVisible(true);
  }, []);

  const handleDelete = useCallback((file: ProjectFile) => {
    Alert.alert(
      'Delete File',
      `Are you sure you want to delete "${file.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await deleteFile(projectId, file.id, token);
              await fetchFiles();
            } catch (error) {
              Alert.alert('Error', error instanceof Error ? error.message : 'Failed to delete file');
            } finally {
              setActionLoading(false);
            }
          }
        }
      ]
    );
  }, [projectId, token]);

  const handleFileLongPress = useCallback((file: ProjectFile) => {
    Alert.alert(
      file.name,
      'Choose an action',
      [
        { text: 'Open', onPress: () => handleFilePress(file) },
        { text: 'Rename', onPress: () => handleRename(file) },
        { text: 'Delete', style: 'destructive', onPress: () => handleDelete(file) },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  }, [handleFilePress, handleRename, handleDelete]);

  const openNewFileModal = useCallback(() => {
    setSelectedFile(null);
    setInputValue('');
    setModalType('newFile');
    setModalVisible(true);
  }, []);

  const openNewFolderModal = useCallback(() => {
    setSelectedFile(null);
    setInputValue('');
    setModalType('newFolder');
    setModalVisible(true);
  }, []);

  const handleModalSubmit = async () => {
    if (!inputValue.trim()) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }

    setActionLoading(true);
    try {
      if (modalType === 'rename' && selectedFile) {
        await renameFile(projectId, selectedFile.id, inputValue.trim(), token);
      } else if (modalType === 'newFile' || modalType === 'newFolder') {
        const filePath = currentPath === '/' ? `/${inputValue.trim()}` : `${currentPath}/${inputValue.trim()}`;
        await createFile(
          projectId,
          {
            name: inputValue.trim(),
            path: filePath,
            isDirectory: modalType === 'newFolder'
          },
          token
        );
      }
      setModalVisible(false);
      setInputValue('');
      await fetchFiles();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Operation failed');
    } finally {
      setActionLoading(false);
    }
  };

  const getModalTitle = () => {
    switch (modalType) {
      case 'newFile':
        return 'New File';
      case 'newFolder':
        return 'New Folder';
      case 'rename':
        return 'Rename';
      default:
        return '';
    }
  };

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
        data-testid={`file-item-${item.id}`}
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
        <TouchableOpacity onPress={() => setCurrentPath('/')} data-testid="path-home">
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
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={openNewFileModal}
          disabled={actionLoading}
          data-testid="button-new-file"
        >
          <Text style={styles.actionButtonText}>+ New File</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={openNewFolderModal}
          disabled={actionLoading}
          data-testid="button-new-folder"
        >
          <Text style={styles.actionButtonText}>+ New Folder</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{getModalTitle()}</Text>
            <TextInput
              style={styles.modalInput}
              value={inputValue}
              onChangeText={setInputValue}
              placeholder={modalType === 'newFolder' ? 'Folder name' : 'File name'}
              placeholderTextColor={mobileColors.textMuted}
              autoFocus
              data-testid="input-name"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setModalVisible(false)}
                disabled={actionLoading}
                data-testid="button-cancel"
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSubmit]}
                onPress={handleModalSubmit}
                disabled={actionLoading}
                data-testid="button-submit"
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalButtonSubmitText}>
                    {modalType === 'rename' ? 'Rename' : 'Create'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {actionLoading && !modalVisible && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={mobileColors.primary} />
        </View>
      )}
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
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: mobileSpacing.lg
  },
  modalContent: {
    width: '100%',
    backgroundColor: mobileColors.surface,
    borderRadius: mobileBorderRadius.lg,
    padding: mobileSpacing.lg
  },
  modalTitle: {
    fontSize: mobileTypography.fontSize.lg,
    fontWeight: '600',
    color: mobileColors.text,
    marginBottom: mobileSpacing.md,
    textAlign: 'center'
  },
  modalInput: {
    backgroundColor: mobileColors.surfaceSecondary,
    borderRadius: mobileBorderRadius.md,
    padding: mobileSpacing.md,
    fontSize: mobileTypography.fontSize.base,
    color: mobileColors.text,
    borderWidth: 1,
    borderColor: mobileColors.border,
    marginBottom: mobileSpacing.md
  },
  modalButtons: {
    flexDirection: 'row',
    gap: mobileSpacing.sm
  },
  modalButton: {
    flex: 1,
    paddingVertical: mobileSpacing.sm,
    borderRadius: mobileBorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44
  },
  modalButtonCancel: {
    backgroundColor: mobileColors.surfaceSecondary,
    borderWidth: 1,
    borderColor: mobileColors.border
  },
  modalButtonSubmit: {
    backgroundColor: mobileColors.primary
  },
  modalButtonCancelText: {
    fontSize: mobileTypography.fontSize.sm,
    fontWeight: '600',
    color: mobileColors.text
  },
  modalButtonSubmitText: {
    fontSize: mobileTypography.fontSize.sm,
    fontWeight: '600',
    color: '#fff'
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center'
  }
});

export default FileManagerScreen;
