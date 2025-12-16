import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { mobileColors, mobileSpacing, mobileTypography, mobileBorderRadius } from '../../../shared/theme/mobile-theme';
import { getDeployments, createDeployment, Deployment as ApiDeployment } from '../services/api';

type DeploymentsScreenProps = NativeStackScreenProps<RootStackParamList, 'Deployments'>;

type Deployment = {
  id: string;
  status: 'success' | 'failed' | 'pending' | 'building';
  branch: string;
  commit: string;
  timestamp: Date;
  url?: string;
};

const DeploymentsScreen: React.FC<DeploymentsScreenProps> = ({ route }) => {
  const { projectId, token } = route.params;
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDeployments = useCallback(async () => {
    try {
      const apiDeployments = await getDeployments(projectId, token);
      const transformed: Deployment[] = apiDeployments.map((d: ApiDeployment) => ({
        ...d,
        timestamp: new Date(d.timestamp)
      }));
      setDeployments(transformed);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch deployments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [projectId, token]);

  useEffect(() => {
    fetchDeployments();
  }, [fetchDeployments]);

  const handleNewDeployment = useCallback(() => {
    Alert.prompt(
      'New Deployment',
      'Enter branch name:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deploy',
          onPress: async (branch) => {
            if (branch) {
              try {
                setLoading(true);
                await createDeployment(projectId, { branch }, token);
                Alert.alert('Success', 'Deployment started successfully');
                fetchDeployments();
              } catch (error) {
                Alert.alert('Error', 'Failed to create deployment');
                setLoading(false);
              }
            }
          }
        }
      ],
      'plain-text',
      'main'
    );
  }, [projectId, token, fetchDeployments]);

  const getStatusIcon = (status: Deployment['status']) => {
    switch (status) {
      case 'success':
        return '✓';
      case 'failed':
        return '✕';
      case 'building':
        return '⟳';
      case 'pending':
        return '⋯';
    }
  };

  const getStatusColor = (status: Deployment['status']) => {
    switch (status) {
      case 'success':
        return '#10b981';
      case 'failed':
        return '#ef4444';
      case 'building':
        return '#f59e0b';
      case 'pending':
        return '#94a3b8';
    }
  };

  const renderDeployment = useCallback(
    ({ item }: { item: Deployment }) => (
      <View style={styles.deploymentItem}>
        <View style={[styles.statusIcon, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusIconText, { color: getStatusColor(item.status) }]}>
            {getStatusIcon(item.status)}
          </Text>
        </View>
        <View style={styles.deploymentInfo}>
          <View style={styles.deploymentHeader}>
            <Text style={styles.deploymentBranch}>{item.branch}</Text>
            <Text style={[styles.deploymentStatus, { color: getStatusColor(item.status) }]}>
              {item.status}
            </Text>
          </View>
          <Text style={styles.deploymentCommit}>Commit: {item.commit}</Text>
          <Text style={styles.deploymentTime}>
            {item.timestamp.toLocaleString()}
          </Text>
          {item.url && (
            <TouchableOpacity>
              <Text style={styles.deploymentUrl}>{item.url}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    ),
    []
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={mobileColors.primary} />
        </View>
      ) : (
        <FlatList
          data={deployments}
          keyExtractor={(item) => item.id}
          renderItem={renderDeployment}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchDeployments();
              }}
              tintColor={mobileColors.primary}
            />
          }
          contentContainerStyle={styles.list}
        />
      )}

      <TouchableOpacity style={styles.deployButton} onPress={handleNewDeployment}>
        <Text style={styles.deployButtonText}>+ New Deployment</Text>
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
  deploymentItem: {
    flexDirection: 'row',
    backgroundColor: mobileColors.surfaceSecondary,
    borderRadius: mobileBorderRadius.lg,
    padding: mobileSpacing.md,
    marginBottom: mobileSpacing.sm,
    borderWidth: 1,
    borderColor: mobileColors.border
  },
  statusIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: mobileSpacing.md
  },
  statusIconText: {
    fontSize: 20,
    fontWeight: '700'
  },
  deploymentInfo: {
    flex: 1
  },
  deploymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  deploymentBranch: {
    fontSize: mobileTypography.fontSize.base,
    fontWeight: '600',
    color: mobileColors.text
  },
  deploymentStatus: {
    fontSize: mobileTypography.fontSize.sm,
    fontWeight: '600',
    textTransform: 'capitalize'
  },
  deploymentCommit: {
    fontSize: mobileTypography.fontSize.sm,
    color: mobileColors.textSecondary,
    fontFamily: 'monospace',
    marginBottom: 2
  },
  deploymentTime: {
    fontSize: mobileTypography.fontSize.xs,
    color: mobileColors.textMuted,
    marginBottom: 4
  },
  deploymentUrl: {
    fontSize: mobileTypography.fontSize.sm,
    color: mobileColors.primary,
    textDecorationLine: 'underline'
  },
  deployButton: {
    margin: mobileSpacing.md,
    paddingVertical: mobileSpacing.md,
    backgroundColor: mobileColors.primary,
    borderRadius: mobileBorderRadius.lg,
    alignItems: 'center'
  },
  deployButtonText: {
    fontSize: mobileTypography.fontSize.base,
    fontWeight: '600',
    color: '#fff'
  }
});

export default DeploymentsScreen;
