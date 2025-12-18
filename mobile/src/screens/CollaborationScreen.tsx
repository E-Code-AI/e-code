import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Platform
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { mobileColors, mobileSpacing, mobileTypography, mobileBorderRadius } from '../../../shared/theme/mobile-theme';
import { getCollaborators, inviteCollaborator, removeCollaborator, Collaborator as ApiCollaborator } from '../services/api';

type CollaborationScreenProps = NativeStackScreenProps<RootStackParamList, 'Collaboration'>;

type Collaborator = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  status: 'online' | 'offline';
  lastActive?: Date;
};

const CollaborationScreen: React.FC<CollaborationScreenProps> = ({ route }) => {
  const { projectId, token } = route.params;
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  const fetchCollaborators = useCallback(async () => {
    try {
      const apiCollaborators = await getCollaborators(projectId, token);
      const transformed: Collaborator[] = apiCollaborators.map((c: ApiCollaborator) => ({
        ...c,
        lastActive: c.lastActive ? new Date(c.lastActive) : undefined
      }));
      setCollaborators(transformed);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch collaborators');
    } finally {
      setLoading(false);
    }
  }, [projectId, token]);

  useEffect(() => {
    fetchCollaborators();
  }, [fetchCollaborators]);

  const handleOpenInviteModal = useCallback(() => {
    setInviteEmail('');
    setInviteModalVisible(true);
  }, []);

  const handleCloseInviteModal = useCallback(() => {
    setInviteModalVisible(false);
    setInviteEmail('');
  }, []);

  const handleSendInvite = useCallback(async () => {
    if (!inviteEmail.trim()) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }

    setInviting(true);
    try {
      await inviteCollaborator(projectId, { email: inviteEmail.trim(), role: 'member' }, token);
      Alert.alert('Success', 'Invitation sent successfully');
      handleCloseInviteModal();
      fetchCollaborators();
    } catch (error) {
      Alert.alert('Error', 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  }, [projectId, token, inviteEmail, fetchCollaborators, handleCloseInviteModal]);

  const handleRemove = useCallback((collaborator: Collaborator) => {
    Alert.alert(
      'Remove Collaborator',
      `Remove ${collaborator.displayName} from this project?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeCollaborator(projectId, collaborator.id, token);
              fetchCollaborators();
            } catch (error) {
              Alert.alert('Error', 'Failed to remove collaborator');
            }
          }
        }
      ]
    );
  }, [projectId, token, fetchCollaborators]);

  const getRoleBadgeColor = (role: Collaborator['role']) => {
    switch (role) {
      case 'owner':
        return '#ef4444';
      case 'admin':
        return '#f59e0b';
      case 'member':
        return '#3b82f6';
      case 'viewer':
        return '#94a3b8';
    }
  };

  const renderCollaborator = useCallback(
    ({ item }: { item: Collaborator }) => (
      <TouchableOpacity
        style={styles.collaboratorItem}
        onLongPress={() => item.role !== 'owner' && handleRemove(item)}
      >
        <View style={styles.avatarContainer}>
          {item.avatarUrl ? (
            <View style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {item.displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View
            style={[
              styles.statusDot,
              { backgroundColor: item.status === 'online' ? '#10b981' : '#6b7280' }
            ]}
          />
        </View>
        <View style={styles.collaboratorInfo}>
          <View style={styles.collaboratorHeader}>
            <Text style={styles.collaboratorName}>{item.displayName}</Text>
            <View
              style={[
                styles.roleBadge,
                { backgroundColor: getRoleBadgeColor(item.role) + '20' }
              ]}
            >
              <Text
                style={[
                  styles.roleText,
                  { color: getRoleBadgeColor(item.role) }
                ]}
              >
                {item.role}
              </Text>
            </View>
          </View>
          <Text style={styles.collaboratorUsername}>@{item.username}</Text>
          {item.status === 'offline' && item.lastActive && (
            <Text style={styles.lastActive}>
              Last active {Math.floor((Date.now() - item.lastActive.getTime()) / 3600000)}h ago
            </Text>
          )}
        </View>
      </TouchableOpacity>
    ),
    [handleRemove]
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={mobileColors.primary} />
        </View>
      ) : (
        <FlatList
          data={collaborators}
          keyExtractor={(item) => item.id}
          renderItem={renderCollaborator}
          contentContainerStyle={styles.list}
        />
      )}

      <TouchableOpacity style={styles.inviteButton} onPress={handleOpenInviteModal}>
        <Text style={styles.inviteButtonText}>+ Invite Collaborator</Text>
      </TouchableOpacity>

      <Modal
        visible={inviteModalVisible}
        transparent
        animationType="slide"
        onRequestClose={handleCloseInviteModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Invite Collaborator</Text>
              <TouchableOpacity onPress={handleCloseInviteModal} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Email Address</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter email address"
              placeholderTextColor={mobileColors.textMuted}
              value={inviteEmail}
              onChangeText={setInviteEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={handleCloseInviteModal}
                disabled={inviting}
              >
                <Text style={styles.modalButtonTextSecondary}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary, inviting && styles.modalButtonDisabled]}
                onPress={handleSendInvite}
                disabled={inviting}
              >
                {inviting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalButtonTextPrimary}>Send Invite</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: mobileColors.background
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  list: {
    padding: mobileSpacing.md
  },
  collaboratorItem: {
    flexDirection: 'row',
    backgroundColor: mobileColors.surfaceSecondary,
    borderRadius: mobileBorderRadius.lg,
    padding: mobileSpacing.md,
    marginBottom: mobileSpacing.sm,
    borderWidth: 1,
    borderColor: mobileColors.border
  },
  avatarContainer: {
    position: 'relative',
    marginRight: mobileSpacing.md
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: mobileColors.background
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: mobileColors.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff'
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: mobileColors.surfaceSecondary
  },
  collaboratorInfo: {
    flex: 1
  },
  collaboratorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  collaboratorName: {
    fontSize: mobileTypography.fontSize.base,
    fontWeight: '600',
    color: mobileColors.text
  },
  roleBadge: {
    paddingHorizontal: mobileSpacing.sm,
    paddingVertical: 2,
    borderRadius: mobileBorderRadius.full
  },
  roleText: {
    fontSize: mobileTypography.fontSize.xs,
    fontWeight: '600',
    textTransform: 'uppercase'
  },
  collaboratorUsername: {
    fontSize: mobileTypography.fontSize.sm,
    color: mobileColors.textSecondary,
    marginBottom: 2
  },
  lastActive: {
    fontSize: mobileTypography.fontSize.xs,
    color: mobileColors.textMuted
  },
  inviteButton: {
    margin: mobileSpacing.md,
    paddingVertical: mobileSpacing.md,
    backgroundColor: mobileColors.primary,
    borderRadius: mobileBorderRadius.lg,
    alignItems: 'center'
  },
  inviteButtonText: {
    fontSize: mobileTypography.fontSize.base,
    fontWeight: '600',
    color: '#fff'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    padding: mobileSpacing.lg
  },
  modalContent: {
    backgroundColor: mobileColors.background,
    borderRadius: mobileBorderRadius.xl,
    padding: mobileSpacing.lg
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: mobileSpacing.lg
  },
  modalTitle: {
    fontSize: mobileTypography.fontSize.xl,
    fontWeight: '700',
    color: mobileColors.text
  },
  closeButton: {
    padding: mobileSpacing.sm
  },
  closeButtonText: {
    fontSize: mobileTypography.fontSize.lg,
    color: mobileColors.textMuted
  },
  modalLabel: {
    fontSize: mobileTypography.fontSize.sm,
    fontWeight: '600',
    color: mobileColors.textSecondary,
    marginBottom: mobileSpacing.xs
  },
  modalInput: {
    backgroundColor: mobileColors.surfaceSecondary,
    borderWidth: 1,
    borderColor: mobileColors.border,
    borderRadius: mobileBorderRadius.md,
    paddingHorizontal: mobileSpacing.md,
    paddingVertical: mobileSpacing.md,
    fontSize: mobileTypography.fontSize.base,
    color: mobileColors.text,
    marginBottom: mobileSpacing.lg
  },
  modalActions: {
    flexDirection: 'row',
    gap: mobileSpacing.sm
  },
  modalButton: {
    flex: 1,
    paddingVertical: mobileSpacing.md,
    borderRadius: mobileBorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48
  },
  modalButtonPrimary: {
    backgroundColor: mobileColors.primary
  },
  modalButtonSecondary: {
    backgroundColor: mobileColors.surfaceSecondary,
    borderWidth: 1,
    borderColor: mobileColors.border
  },
  modalButtonDisabled: {
    opacity: 0.5
  },
  modalButtonTextPrimary: {
    fontSize: mobileTypography.fontSize.base,
    fontWeight: '600',
    color: '#fff'
  },
  modalButtonTextSecondary: {
    fontSize: mobileTypography.fontSize.base,
    fontWeight: '600',
    color: mobileColors.text
  }
});

export default CollaborationScreen;
