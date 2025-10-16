import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Modal,
  ActivityIndicator,
  Alert,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CodeEditorScreen } from './CodeEditorScreen';
import { TerminalScreen } from './TerminalScreen';
import { AIAssistantScreen } from './AIAssistantScreen';

const API_BASE = 'http://localhost:5000/api';

export function ProjectScreen({ project, onClose }) {
  const [activeTab, setActiveTab] = useState('files');
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [deploymentStatus, setDeploymentStatus] = useState(null);
  const [isCreateFileModalVisible, setCreateFileModalVisible] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [fileNameError, setFileNameError] = useState('');

  const trimmedFileName = useMemo(() => newFileName.trim(), [newFileName]);

  useEffect(() => {
    loadProjectFiles();
    checkDeploymentStatus();
  }, []);

  const loadProjectFiles = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_BASE}/mobile/projects/${project.id}/files`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setFiles(data);
    } catch (error) {
      console.error('Failed to load files:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkDeploymentStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_BASE}/projects/${project.id}/deployment`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setDeploymentStatus(data.status);
    } catch (error) {
      console.error('Failed to check deployment:', error);
    }
  };

  const runProject = async () => {
    setIsRunning(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_BASE}/projects/${project.id}/run`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        Alert.alert('Success', 'Project is running');
      } else {
        Alert.alert('Error', 'Failed to run project');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error');
    } finally {
      setIsRunning(false);
    }
  };

  const deployProject = async () => {
    Alert.alert(
      'Deploy Project',
      'Deploy this project to production?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deploy',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('authToken');
              const response = await fetch(`${API_BASE}/projects/${project.id}/deploy`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              });
              
              if (response.ok) {
                Alert.alert('Success', 'Deployment started');
                setDeploymentStatus('deploying');
              } else {
                Alert.alert('Error', 'Failed to deploy');
              }
            } catch (error) {
              Alert.alert('Error', 'Network error');
            }
          }
        }
      ]
    );
  };

  const openFile = (file) => {
    setSelectedFile(file);
    setShowEditor(true);
  };

  const createNewFile = () => {
    setNewFileName('');
    setFileNameError('');
    setCreateFileModalVisible(true);
  };

  const submitNewFile = async () => {
    if (!trimmedFileName) {
      setFileNameError('Please enter a file name.');
      return;
    }

    setIsCreatingFile(true);

    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_BASE}/projects/${project.id}/files`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          path: trimmedFileName,
          content: ''
        })
      });

      if (response.ok) {
        await loadProjectFiles();
        setCreateFileModalVisible(false);
        setNewFileName('');
        setFileNameError('');
      } else {
        Alert.alert('Error', 'Failed to create file');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to create file');
    } finally {
      setIsCreatingFile(false);
    }
  };

  if (showEditor && selectedFile) {
    return (
      <CodeEditorScreen 
        project={project}
        file={selectedFile}
        onClose={() => {
          setShowEditor(false);
          setSelectedFile(null);
          loadProjectFiles();
        }}
      />
    );
  }

  if (showTerminal) {
    return (
      <TerminalScreen 
        project={project}
        onClose={() => setShowTerminal(false)}
      />
    );
  }

  if (showAI) {
    return (
      <AIAssistantScreen 
        project={project}
        onClose={() => setShowAI(false)}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.projectInfo}>
          <Text style={styles.projectName}>{project.name}</Text>
          <View style={styles.projectMeta}>
            <View style={styles.languageBadge}>
              <Text style={styles.languageText}>{project.language}</Text>
            </View>
            {deploymentStatus && (
              <View style={[styles.statusBadge, deploymentStatus === 'live' && styles.liveBadge]}>
                <Text style={styles.statusText}>{deploymentStatus}</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={runProject} disabled={isRunning}>
            <Icon name="play-arrow" size={24} color={isRunning ? '#6b7280' : '#10b981'} />
          </TouchableOpacity>
          <TouchableOpacity onPress={deployProject}>
            <Icon name="cloud-upload" size={24} color="#0079F2" />
          </TouchableOpacity>
          <TouchableOpacity>
            <Icon name="more-vert" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {['files', 'preview', 'console', 'settings'].map(tab => (
          <TouchableOpacity 
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {activeTab === 'files' && (
        <ScrollView style={styles.content}>
          {loading ? (
            <ActivityIndicator size="large" color="#0079F2" style={styles.loader} />
          ) : (
            <>
              <TouchableOpacity style={styles.newFileButton} onPress={createNewFile}>
                <Icon name="add" size={20} color="#0079F2" />
                <Text style={styles.newFileText}>New File</Text>
              </TouchableOpacity>
              
              {files.map((file, index) => (
                <TouchableOpacity 
                  key={index}
                  style={styles.fileItem}
                  onPress={() => openFile(file)}
                >
                  <Icon 
                    name={file.path.includes('.') ? 'description' : 'folder'} 
                    size={20} 
                    color="#6b7280" 
                  />
                  <Text style={styles.fileName}>{file.path}</Text>
                  <Text style={styles.fileSize}>{formatFileSize(file.size)}</Text>
                </TouchableOpacity>
              ))}
            </>
          )}
        </ScrollView>
      )}

      {activeTab === 'preview' && (
        <View style={styles.previewContainer}>
          <Icon name="web" size={48} color="#6b7280" />
          <Text style={styles.previewText}>Web preview coming soon</Text>
          <TouchableOpacity 
            style={styles.openBrowserButton}
            onPress={() => {
              // In production, use Linking.openURL(`http://localhost:3000/preview/${project.id}`)
              Alert.alert('Preview', `Opening project preview for ${project.name}`);
            }}
          >
            <Text style={styles.openBrowserText}>Open in Browser</Text>
          </TouchableOpacity>
        </View>
      )}

      {activeTab === 'console' && (
        <View style={styles.consoleContainer}>
          <Text style={styles.consoleTitle}>Console Output</Text>
          <ScrollView style={styles.consoleContent}>
            <Text style={styles.consoleText}>Project console will appear here...</Text>
          </ScrollView>
        </View>
      )}

      {activeTab === 'settings' && (
        <ScrollView style={styles.settingsContainer}>
          <View style={styles.settingSection}>
            <Text style={styles.settingTitle}>Project Settings</Text>
            <TouchableOpacity style={styles.settingItem}>
              <Icon name="public" size={20} color="#6b7280" />
              <Text style={styles.settingText}>Make Public</Text>
              <Icon name="chevron-right" size={20} color="#6b7280" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingItem}>
              <Icon name="group" size={20} color="#6b7280" />
              <Text style={styles.settingText}>Collaborators</Text>
              <Icon name="chevron-right" size={20} color="#6b7280" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingItem}>
              <Icon name="vpn-key" size={20} color="#6b7280" />
              <Text style={styles.settingText}>Environment Variables</Text>
              <Icon name="chevron-right" size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.bottomAction}
          onPress={() => setShowTerminal(true)}
        >
          <Icon name="terminal" size={20} color="#fff" />
          <Text style={styles.bottomActionText}>Terminal</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.bottomAction}
          onPress={() => setShowAI(true)}
        >
          <Icon name="auto-awesome" size={20} color="#f59e0b" />
          <Text style={styles.bottomActionText}>AI Assistant</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bottomAction}>
          <Icon name="share" size={20} color="#fff" />
          <Text style={styles.bottomActionText}>Share</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bottomAction}>
          <Icon name="fork-right" size={20} color="#fff" />
          <Text style={styles.bottomActionText}>Fork</Text>
        </TouchableOpacity>
      </View>

      <Modal
        animationType="slide"
        transparent
        visible={isCreateFileModalVisible}
        onRequestClose={() => {
          if (!isCreatingFile) {
            setCreateFileModalVisible(false);
            setNewFileName('');
            setFileNameError('');
          }
        }}
      >
        <TouchableWithoutFeedback
          accessible={false}
          onPress={() => {
            if (isCreatingFile) return;
            setCreateFileModalVisible(false);
            setNewFileName('');
            setFileNameError('');
          }}
        >
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.modalKeyboardAvoider}
            >
              <TouchableWithoutFeedback
                onPress={Keyboard.dismiss}
                accessibilityLabel="Dismiss keyboard"
              >
                <View style={styles.modalContainer}>
                  <Text style={styles.modalTitle}>New File</Text>
                  <TextInput
                    autoFocus
                    placeholder="Enter file name"
                    placeholderTextColor="#6b7280"
                    style={[styles.modalInput, fileNameError && styles.modalInputError]}
                    value={newFileName}
                    onChangeText={text => {
                      if (fileNameError) {
                        setFileNameError('');
                      }
                      setNewFileName(text);
                    }}
                    editable={!isCreatingFile}
                    returnKeyType="done"
                    onSubmitEditing={() => {
                      if (trimmedFileName) {
                        submitNewFile();
                      } else {
                        setFileNameError('Please enter a file name.');
                      }
                    }}
                  />
                  {!!fileNameError && <Text style={styles.modalErrorText}>{fileNameError}</Text>}
                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.modalCancelButton]}
                      onPress={() => {
                        if (isCreatingFile) return;
                        setCreateFileModalVisible(false);
                        setNewFileName('');
                        setFileNameError('');
                      }}
                      disabled={isCreatingFile}
                    >
                      <Text style={styles.modalCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.modalButton,
                        styles.modalConfirmButton,
                        (isCreatingFile || !trimmedFileName) && styles.modalConfirmButtonDisabled,
                      ]}
                      onPress={submitNewFile}
                      disabled={isCreatingFile || !trimmedFileName}
                    >
                      {isCreatingFile ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.modalConfirmText}>Create</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0e1525',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c2333',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2d3748',
  },
  projectInfo: {
    flex: 1,
    marginLeft: 12,
  },
  projectName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  projectMeta: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  languageBadge: {
    backgroundColor: '#0079F220',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  languageText: {
    color: '#0079F2',
    fontSize: 11,
    fontWeight: '600',
  },
  statusBadge: {
    backgroundColor: '#6b728020',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  liveBadge: {
    backgroundColor: '#10b98120',
  },
  statusText: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 16,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#1c2333',
    borderBottomWidth: 1,
    borderBottomColor: '#2d3748',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#0079F2',
  },
  tabText: {
    color: '#6b7280',
    fontSize: 14,
  },
  activeTabText: {
    color: '#0079F2',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  loader: {
    marginTop: 32,
  },
  newFileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1c2333',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 1,
  },
  newFileText: {
    color: '#0079F2',
    fontSize: 14,
    fontWeight: '600',
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c2333',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 1,
  },
  fileName: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    marginLeft: 12,
  },
  fileSize: {
    color: '#6b7280',
    fontSize: 12,
  },
  previewContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  previewText: {
    color: '#6b7280',
    fontSize: 14,
    marginTop: 16,
    marginBottom: 24,
  },
  openBrowserButton: {
    backgroundColor: '#0079F2',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  openBrowserText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  consoleContainer: {
    flex: 1,
    backgroundColor: '#0a0e1a',
  },
  consoleTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2d3748',
  },
  consoleContent: {
    flex: 1,
    padding: 16,
  },
  consoleText: {
    color: '#6b7280',
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  settingsContainer: {
    flex: 1,
  },
  settingSection: {
    marginTop: 16,
  },
  settingTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c2333',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 1,
  },
  settingText: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    marginLeft: 12,
  },
  bottomBar: {
    flexDirection: 'row',
    backgroundColor: '#1c2333',
    borderTopWidth: 1,
    borderTopColor: '#2d3748',
  },
  bottomAction: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  bottomActionText: {
    color: '#fff',
    fontSize: 11,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#00000080',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalKeyboardAvoider: {
    width: '100%',
  },
  modalContainer: {
    width: '100%',
    backgroundColor: '#1c2333',
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: '#0e1525',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#2d3748',
    marginBottom: 20,
  },
  modalInputError: {
    borderColor: '#ef4444',
  },
  modalErrorText: {
    color: '#f87171',
    fontSize: 12,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  modalCancelButton: {
    backgroundColor: 'transparent',
  },
  modalConfirmButton: {
    backgroundColor: '#0079F2',
  },
  modalConfirmButtonDisabled: {
    backgroundColor: '#1e293b',
  },
  modalCancelText: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '500',
  },
  modalConfirmText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
