import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { mobileColors, mobileSpacing, mobileTypography, mobileBorderRadius } from '../../../shared/theme/mobile-theme';

type CollaborationScreenProps = NativeStackScreenProps<RootStackParamList, 'Collaboration'> & {
  projectId: number;
  token: string;
};

type Collaborator = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  status: 'online' | 'offline';
  lastActive?: Date;
};

const CollaborationScreen: React.FC<CollaborationScreenProps> = ({ projectId, token }) => {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCollaborators();
  }, []);

  const fetchCollaborators = async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const mockCollaborators: Collaborator[] = [
        {
          id: '1',
          username: 'johndoe',
          displayName: 'John Doe',
          role: 'owner',
          status: 'online'
        },
        {
          id: '2',
          username: 'janedoe',
          displayName: 'Jane Doe',
          role: 'admin',
          status: 'online'
        },
        {
          id: '3',
          username: 'bobsmith',
          displayName: 'Bob Smith',
          role: 'member',
          status: 'offline',
          lastActive: new Date(Date.now() - 3600000)
        }
      ];

      setCollaborators(mockCollaborators);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = useCallback(() => {
    Alert.alert('Coming Soon', 'Invite collaborators feature coming soon');
  }, []);

  const handleRemove = useCallback((collaborator: Collaborator) => {
    Alert.alert(
      'Remove Collaborator',
      `Remove ${collaborator.displayName} from this project?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive' }
      ]
    );
  }, []);

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

      <TouchableOpacity style={styles.inviteButton} onPress={handleInvite}>
        <Text style={styles.inviteButtonText}>+ Invite Collaborator</Text>
      </TouchableOpacity>
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
  }
});

export default CollaborationScreen;
