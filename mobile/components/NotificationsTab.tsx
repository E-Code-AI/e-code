import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Image
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'http://localhost:5000/api';

export function NotificationsTab() {
  const [notifications, setNotifications] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      // Simulated notifications data
      const mockNotifications = [
        {
          id: 1,
          type: 'follow',
          user: { username: 'johndoe', avatar: null },
          message: 'started following you',
          time: '2h ago',
          read: false
        },
        {
          id: 2,
          type: 'like',
          user: { username: 'alice', avatar: null },
          message: 'liked your project "Todo App"',
          time: '5h ago',
          read: false
        },
        {
          id: 3,
          type: 'comment',
          user: { username: 'bob', avatar: null },
          message: 'commented on your project',
          time: '1d ago',
          read: true
        },
        {
          id: 4,
          type: 'mention',
          user: { username: 'charlie', avatar: null },
          message: 'mentioned you in a comment',
          time: '2d ago',
          read: true
        },
        {
          id: 5,
          type: 'fork',
          user: { username: 'developer', avatar: null },
          message: 'forked your project "React Dashboard"',
          time: '3d ago',
          read: true
        }
      ];
      setNotifications(mockNotifications);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const getNotificationIcon = (type) => {
    const icons = {
      follow: 'person-add',
      like: 'favorite',
      comment: 'comment',
      mention: 'alternate-email',
      fork: 'call-split'
    };
    return icons[type] || 'notifications';
  };

  const getNotificationColor = (type) => {
    const colors = {
      follow: '#10b981',
      like: '#ef4444',
      comment: '#3b82f6',
      mention: '#f59e0b',
      fork: '#8b5cf6'
    };
    return colors[type] || '#6b7280';
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#0079F2"
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Activity</Text>
        <TouchableOpacity style={styles.markAllButton}>
          <Text style={styles.markAllText}>Mark all as read</Text>
        </TouchableOpacity>
      </View>

      {notifications.length > 0 ? (
        notifications.map(notification => (
          <TouchableOpacity 
            key={notification.id} 
            style={[
              styles.notificationCard,
              !notification.read && styles.unreadCard
            ]}
          >
            <View 
              style={[
                styles.iconContainer,
                { backgroundColor: getNotificationColor(notification.type) + '20' }
              ]}
            >
              <Icon 
                name={getNotificationIcon(notification.type)} 
                size={20} 
                color={getNotificationColor(notification.type)} 
              />
            </View>
            
            <View style={styles.content}>
              <View style={styles.textContainer}>
                <Text style={styles.username}>@{notification.user.username}</Text>
                <Text style={styles.message}> {notification.message}</Text>
              </View>
              <Text style={styles.time}>{notification.time}</Text>
            </View>

            {!notification.read && <View style={styles.unreadDot} />}
          </TouchableOpacity>
        ))
      ) : (
        <View style={styles.emptyState}>
          <Icon name="notifications-none" size={48} color="#6b7280" />
          <Text style={styles.emptyTitle}>No notifications yet</Text>
          <Text style={styles.emptyDescription}>
            When someone interacts with your projects, you'll see it here
          </Text>
        </View>
      )}

      {/* Notification Settings */}
      <View style={styles.settingsSection}>
        <Text style={styles.settingsTitle}>Notification Settings</Text>
        <TouchableOpacity style={styles.settingsItem}>
          <Icon name="email" size={20} color="#6b7280" />
          <Text style={styles.settingsText}>Email notifications</Text>
          <Icon name="chevron-right" size={20} color="#6b7280" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingsItem}>
          <Icon name="phone-android" size={20} color="#6b7280" />
          <Text style={styles.settingsText}>Push notifications</Text>
          <Icon name="chevron-right" size={20} color="#6b7280" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0e1525',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#1c2333',
    borderRadius: 16,
  },
  markAllText: {
    color: '#0079F2',
    fontSize: 12,
    fontWeight: '600',
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c2333',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 8,
  },
  unreadCard: {
    backgroundColor: '#1c2333',
    borderLeftWidth: 3,
    borderLeftColor: '#0079F2',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  textContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  username: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  message: {
    color: '#9ca3af',
    fontSize: 14,
  },
  time: {
    color: '#6b7280',
    fontSize: 12,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0079F2',
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    color: '#6b7280',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  settingsSection: {
    marginTop: 32,
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  settingsTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c2333',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  settingsText: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    marginLeft: 12,
  },
});