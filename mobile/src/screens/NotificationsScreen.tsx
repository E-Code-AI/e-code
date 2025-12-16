import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { mobileColors, mobileSpacing, mobileTypography, mobileBorderRadius } from '../../../shared/theme/mobile-theme';
import { getNotifications, markNotificationRead, markAllNotificationsRead, Notification as ApiNotification } from '../services/api';

type NotificationsScreenProps = NativeStackScreenProps<RootStackParamList, 'Notifications'>;

type Notification = {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
};

function transformApiNotification(apiNotification: ApiNotification): Notification {
  return {
    ...apiNotification,
    timestamp: new Date(apiNotification.timestamp)
  };
}

const NotificationsScreen: React.FC<NotificationsScreenProps> = ({ route }) => {
  const { token } = route.params;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const apiNotifications = await getNotifications(token);
      const transformedNotifications = apiNotifications.map(transformApiNotification);
      setNotifications(transformedNotifications);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAsRead = useCallback(async (id: string) => {
    try {
      await markNotificationRead(id, token);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, [token]);

  const handleMarkAllAsRead = useCallback(async () => {
    try {
      await markAllNotificationsRead(token);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  }, [token]);

  const getIconForType = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return '✓';
      case 'info':
        return 'ℹ';
      case 'warning':
        return '⚠';
      case 'error':
        return '✕';
      default:
        return '•';
    }
  };

  const getColorForType = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return '#10b981';
      case 'info':
        return '#3b82f6';
      case 'warning':
        return '#f59e0b';
      case 'error':
        return '#ef4444';
      default:
        return mobileColors.textSecondary;
    }
  };

  const formatTimestamp = (date: Date) => {
    const now = Date.now();
    const diff = now - date.getTime();

    if (diff < 3600000) {
      return `${Math.floor(diff / 60000)}m ago`;
    } else if (diff < 86400000) {
      return `${Math.floor(diff / 3600000)}h ago`;
    } else {
      return `${Math.floor(diff / 86400000)}d ago`;
    }
  };

  const renderNotification = useCallback(
    ({ item }: { item: Notification }) => (
      <TouchableOpacity
        style={[styles.notificationItem, !item.read && styles.notificationItemUnread]}
        onPress={() => handleMarkAsRead(item.id)}
      >
        <View
          style={[
            styles.notificationIcon,
            { backgroundColor: getColorForType(item.type) + '20' }
          ]}
        >
          <Text style={[styles.notificationIconText, { color: getColorForType(item.type) }]}>
            {getIconForType(item.type)}
          </Text>
        </View>
        <View style={styles.notificationContent}>
          <View style={styles.notificationHeader}>
            <Text style={styles.notificationTitle}>{item.title}</Text>
            <Text style={styles.notificationTime}>{formatTimestamp(item.timestamp)}</Text>
          </View>
          <Text style={styles.notificationMessage}>{item.message}</Text>
          {!item.read && <View style={styles.unreadDot} />}
        </View>
      </TouchableOpacity>
    ),
    [handleMarkAsRead]
  );

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <View style={styles.container}>
      {unreadCount > 0 && (
        <View style={styles.actionBar}>
          <Text style={styles.unreadCount}>{unreadCount} unread</Text>
          <TouchableOpacity onPress={handleMarkAllAsRead}>
            <Text style={styles.markAllButton}>Mark all as read</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={mobileColors.primary} />
        </View>
      ) : notifications.length > 0 ? (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderNotification}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={mobileColors.primary}
            />
          }
          contentContainerStyle={styles.list}
        />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={styles.emptyTitle}>No notifications</Text>
          <Text style={styles.emptySubtitle}>
            You're all caught up!
          </Text>
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
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: mobileSpacing.md,
    paddingVertical: mobileSpacing.sm,
    backgroundColor: mobileColors.surfaceSecondary,
    borderBottomWidth: 1,
    borderBottomColor: mobileColors.border
  },
  unreadCount: {
    fontSize: mobileTypography.fontSize.sm,
    fontWeight: '600',
    color: mobileColors.textSecondary
  },
  markAllButton: {
    fontSize: mobileTypography.fontSize.sm,
    fontWeight: '600',
    color: mobileColors.primary
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  list: {
    padding: mobileSpacing.md
  },
  notificationItem: {
    flexDirection: 'row',
    backgroundColor: mobileColors.surfaceSecondary,
    borderRadius: mobileBorderRadius.lg,
    padding: mobileSpacing.md,
    marginBottom: mobileSpacing.sm,
    borderWidth: 1,
    borderColor: mobileColors.border
  },
  notificationItemUnread: {
    backgroundColor: mobileColors.surfaceSecondary,
    borderColor: mobileColors.primary,
    borderWidth: 1.5
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: mobileSpacing.md
  },
  notificationIconText: {
    fontSize: 20,
    fontWeight: '700'
  },
  notificationContent: {
    flex: 1,
    position: 'relative'
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  notificationTitle: {
    fontSize: mobileTypography.fontSize.base,
    fontWeight: '600',
    color: mobileColors.text,
    flex: 1
  },
  notificationTime: {
    fontSize: mobileTypography.fontSize.xs,
    color: mobileColors.textMuted
  },
  notificationMessage: {
    fontSize: mobileTypography.fontSize.sm,
    color: mobileColors.textSecondary,
    lineHeight: 18
  },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: mobileColors.primary
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: mobileSpacing.xl
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: mobileSpacing.md
  },
  emptyTitle: {
    fontSize: mobileTypography.fontSize.lg,
    fontWeight: '600',
    color: mobileColors.text,
    marginBottom: mobileSpacing.xs
  },
  emptySubtitle: {
    fontSize: mobileTypography.fontSize.base,
    color: mobileColors.textSecondary,
    textAlign: 'center'
  }
});

export default NotificationsScreen;
