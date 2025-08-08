import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function ProfileTab({ user }) {
  const [stats] = useState({
    projects: 12,
    followers: 248,
    following: 156,
    reputation: 1420
  });

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.clear();
            // Force app to reload by restarting (in production, navigate to login)
            // For React Native apps, you'd typically use:
            // RNRestart.Restart(); or navigation.reset()
            Alert.alert('Logged Out', 'Please restart the app to log in again');
          }
        }
      ]
    );
  };

  const menuItems = [
    { icon: 'folder', label: 'My Projects', count: stats.projects },
    { icon: 'bookmark', label: 'Saved', count: 8 },
    { icon: 'history', label: 'Recent Activity' },
    { icon: 'code', label: 'Code Snippets', count: 24 },
    { icon: 'school', label: 'Learning Path' },
    { icon: 'emoji-events', label: 'Achievements', count: 15 },
    { icon: 'settings', label: 'Settings' },
    { icon: 'help', label: 'Help & Support' },
  ];

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.profileInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.displayName}>
              {user?.displayName || user?.username || 'User'}
            </Text>
            <Text style={styles.username}>@{user?.username || 'username'}</Text>
            <View style={styles.badgeContainer}>
              <View style={styles.badge}>
                <Icon name="verified" size={12} color="#fff" />
                <Text style={styles.badgeText}>Pro</Text>
              </View>
              <View style={styles.badge}>
                <Icon name="school" size={12} color="#fff" />
                <Text style={styles.badgeText}>Student</Text>
              </View>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.editButton}>
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.projects}</Text>
          <Text style={styles.statLabel}>Projects</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.followers}</Text>
          <Text style={styles.statLabel}>Followers</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.following}</Text>
          <Text style={styles.statLabel}>Following</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.reputation}</Text>
          <Text style={styles.statLabel}>Rep</Text>
        </View>
      </View>

      {/* Bio */}
      <View style={styles.bioSection}>
        <Text style={styles.bio}>
          Full-stack developer | React Native enthusiast | Building amazing mobile apps
        </Text>
        <View style={styles.links}>
          <TouchableOpacity style={styles.linkItem}>
            <Icon name="link" size={16} color="#0079F2" />
            <Text style={styles.linkText}>portfolio.com</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkItem}>
            <Icon name="place" size={16} color="#0079F2" />
            <Text style={styles.linkText}>San Francisco</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Menu Items */}
      <View style={styles.menuSection}>
        {menuItems.map((item, index) => (
          <TouchableOpacity key={index} style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Icon name={item.icon} size={20} color="#6b7280" />
              <Text style={styles.menuItemText}>{item.label}</Text>
            </View>
            <View style={styles.menuItemRight}>
              {item.count && (
                <Text style={styles.menuItemCount}>{item.count}</Text>
              )}
              <Icon name="chevron-right" size={20} color="#6b7280" />
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Subscription Card */}
      <View style={styles.subscriptionCard}>
        <View style={styles.subscriptionIcon}>
          <Icon name="rocket-launch" size={24} color="#fff" />
        </View>
        <View style={styles.subscriptionContent}>
          <Text style={styles.subscriptionTitle}>Upgrade to Pro</Text>
          <Text style={styles.subscriptionDescription}>
            Get unlimited projects, priority support, and more
          </Text>
        </View>
        <TouchableOpacity style={styles.upgradeButton}>
          <Text style={styles.upgradeButtonText}>Upgrade</Text>
        </TouchableOpacity>
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Icon name="logout" size={20} color="#ef4444" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>E-Code Mobile v1.0.0</Text>
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
    padding: 16,
    backgroundColor: '#1c2333',
  },
  profileInfo: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#0079F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  userDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  displayName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  username: {
    color: '#6b7280',
    fontSize: 14,
    marginBottom: 8,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0079F2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  editButton: {
    backgroundColor: '#0e1525',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2d3748',
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#1c2333',
    marginTop: 1,
    paddingVertical: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    color: '#6b7280',
    fontSize: 12,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#2d3748',
    marginVertical: 8,
  },
  bioSection: {
    padding: 16,
    backgroundColor: '#1c2333',
    marginTop: 1,
  },
  bio: {
    color: '#e5e7eb',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  links: {
    flexDirection: 'row',
    gap: 16,
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  linkText: {
    color: '#0079F2',
    fontSize: 13,
  },
  menuSection: {
    marginTop: 16,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1c2333',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 1,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemText: {
    color: '#fff',
    fontSize: 14,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuItemCount: {
    color: '#6b7280',
    fontSize: 14,
  },
  subscriptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    backgroundColor: '#1c2333',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#0079F2',
  },
  subscriptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0079F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  subscriptionContent: {
    flex: 1,
  },
  subscriptionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  subscriptionDescription: {
    color: '#9ca3af',
    fontSize: 12,
  },
  upgradeButton: {
    backgroundColor: '#0079F2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1c2333',
    marginHorizontal: 16,
    padding: 14,
    borderRadius: 8,
    marginBottom: 16,
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 32,
  },
  footerText: {
    color: '#6b7280',
    fontSize: 12,
  },
});