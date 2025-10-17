import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../navigation/types';
import { Project, User } from '../types';
import { getProjects } from '../services/api';

type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'> & {
  token: string;
  user: User;
  onLogout: () => void;
};

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation, token, user, onLogout }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    try {
      const data = await getProjects(token);
      setProjects(data);
      setError(null);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load projects');
    }
  }, [token]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      try {
        await fetchProjects();
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [fetchProjects]);

  useFocusEffect(
    useCallback(() => {
      fetchProjects();
    }, [fetchProjects])
  );

  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <View style={styles.userBadge}>
          <Text style={styles.userBadgeText}>
            {(user.displayName?.charAt(0) ?? user.username.charAt(0)).toUpperCase()}
          </Text>
        </View>
      ),
      headerRight: () => (
        <TouchableOpacity onPress={onLogout}>
          <Text style={styles.logoutText}>Sign out</Text>
        </TouchableOpacity>
      )
    });
  }, [navigation, onLogout, user]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchProjects();
    } finally {
      setRefreshing(false);
    }
  }, [fetchProjects]);

  const renderProject = useCallback(
    ({ item }: { item: Project }) => (
      <TouchableOpacity
        style={styles.projectCard}
        onPress={() => navigation.navigate('Project', { projectId: item.id, projectName: item.name })}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.projectName}>{item.name}</Text>
          <View style={styles.languageBadge}>
            <Text style={styles.languageText}>{(item.language ?? 'Unknown').toUpperCase()}</Text>
          </View>
        </View>
        {item.description ? (
          <Text style={styles.projectDescription}>{item.description}</Text>
        ) : null}
        <View style={styles.cardFooter}>
          <Text style={styles.metaText}>Updated {formatUpdatedAt(item.updatedAt)}</Text>
          {item.stats ? (
            <Text style={styles.metaText}>
              {(item.stats.views ?? 0).toLocaleString()} views · {(item.stats.forks ?? 0)} forks
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>
    ),
    [navigation]
  );

  const listEmptyComponent = useMemo(() => {
    if (loading) {
      return null;
    }

    if (error) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>We hit a snag</Text>
          <Text style={styles.emptySubtitle}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchProjects}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>No projects yet</Text>
        <Text style={styles.emptySubtitle}>Create a project from the web app to see it here.</Text>
      </View>
    );
  }, [error, fetchProjects, loading]);

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#38bdf8" />
        </View>
      ) : null}
      <FlatList
        data={projects}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderProject}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#38bdf8" />}
        contentContainerStyle={projects.length === 0 ? styles.emptyContainer : styles.listContent}
        ListEmptyComponent={listEmptyComponent}
      />
    </View>
  );
};

function formatUpdatedAt(value: Project['updatedAt']): string {
  if (!value) {
    return 'recently';
  }

  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    return 'recently';
  }

  return date.toLocaleString();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617'
  },
  loader: {
    paddingVertical: 16
  },
  listContent: {
    padding: 16,
    gap: 12
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24
  },
  projectCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#1e293b'
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  projectName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#e2e8f0'
  },
  projectDescription: {
    fontSize: 14,
    color: '#94a3b8'
  },
  languageBadge: {
    backgroundColor: '#1d4ed8',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999
  },
  languageText: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '600'
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  metaText: {
    fontSize: 12,
    color: '#64748b'
  },
  emptyState: {
    alignItems: 'center',
    gap: 12
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#e2e8f0'
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center'
  },
  retryButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12
  },
  retryText: {
    color: '#fff',
    fontWeight: '600'
  },
  userBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center'
  },
  userBadgeText: {
    color: '#fff',
    fontWeight: '700'
  },
  logoutText: {
    color: '#f87171',
    fontWeight: '600'
  }
});

export default HomeScreen;
