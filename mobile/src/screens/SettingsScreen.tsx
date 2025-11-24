import React, { useState, useCallback } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Switch,
  Alert,
  Platform
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { mobileColors, mobileSpacing, mobileTypography, mobileBorderRadius } from '../../../shared/theme/mobile-theme';

type SettingsScreenProps = NativeStackScreenProps<RootStackParamList, 'Settings'>;

const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  // Settings state
  const [notifications, setNotifications] = useState(true);
  const [autoSave, setAutoSave] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [offlineMode, setOfflineMode] = useState(false);
  const [biometric, setBiometric] = useState(false);
  const [analytics, setAnalytics] = useState(true);

  const handleClearCache = useCallback(() => {
    Alert.alert(
      'Clear Cache',
      'Are you sure you want to clear all cached data?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            // TODO: Implement cache clearing
            Alert.alert('Success', 'Cache cleared successfully');
          }
        }
      ]
    );
  }, []);

  const handleResetSettings = useCallback(() => {
    Alert.alert(
      'Reset Settings',
      'This will reset all settings to default values.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            setNotifications(true);
            setAutoSave(true);
            setDarkMode(true);
            setOfflineMode(false);
            setBiometric(false);
            setAnalytics(true);
            Alert.alert('Success', 'Settings reset to defaults');
          }
        }
      ]
    );
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* General Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>General</Text>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Notifications</Text>
            <Text style={styles.settingDescription}>
              Receive push notifications for important events
            </Text>
          </View>
          <Switch
            value={notifications}
            onValueChange={setNotifications}
            trackColor={{ false: '#334155', true: '#3b82f6' }}
            thumbColor={notifications ? '#60a5fa' : '#94a3b8'}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Auto-save</Text>
            <Text style={styles.settingDescription}>
              Automatically save changes while editing
            </Text>
          </View>
          <Switch
            value={autoSave}
            onValueChange={setAutoSave}
            trackColor={{ false: '#334155', true: '#3b82f6' }}
            thumbColor={autoSave ? '#60a5fa' : '#94a3b8'}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Dark Mode</Text>
            <Text style={styles.settingDescription}>
              Use dark theme throughout the app
            </Text>
          </View>
          <Switch
            value={darkMode}
            onValueChange={setDarkMode}
            trackColor={{ false: '#334155', true: '#3b82f6' }}
            thumbColor={darkMode ? '#60a5fa' : '#94a3b8'}
          />
        </View>
      </View>

      {/* Advanced Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Advanced</Text>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Offline Mode</Text>
            <Text style={styles.settingDescription}>
              Work without internet connection (beta)
            </Text>
          </View>
          <Switch
            value={offlineMode}
            onValueChange={setOfflineMode}
            trackColor={{ false: '#334155', true: '#3b82f6' }}
            thumbColor={offlineMode ? '#60a5fa' : '#94a3b8'}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Biometric Authentication</Text>
            <Text style={styles.settingDescription}>
              Use Face ID or Touch ID to unlock
            </Text>
          </View>
          <Switch
            value={biometric}
            onValueChange={setBiometric}
            trackColor={{ false: '#334155', true: '#3b82f6' }}
            thumbColor={biometric ? '#60a5fa' : '#94a3b8'}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Analytics</Text>
            <Text style={styles.settingDescription}>
              Help improve the app by sharing usage data
            </Text>
          </View>
          <Switch
            value={analytics}
            onValueChange={setAnalytics}
            trackColor={{ false: '#334155', true: '#3b82f6' }}
            thumbColor={analytics ? '#60a5fa' : '#94a3b8'}
          />
        </View>
      </View>

      {/* Account Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>

        <TouchableOpacity
          style={styles.actionItem}
          onPress={() => navigation.navigate('Profile')}
        >
          <Text style={styles.actionLabel}>Edit Profile</Text>
          <Text style={styles.actionArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionItem}
          onPress={() => Alert.alert('Coming Soon', 'Change password feature coming soon')}
        >
          <Text style={styles.actionLabel}>Change Password</Text>
          <Text style={styles.actionArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionItem}
          onPress={() => Alert.alert('Coming Soon', 'Connected accounts feature coming soon')}
        >
          <Text style={styles.actionLabel}>Connected Accounts</Text>
          <Text style={styles.actionArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Storage Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Storage</Text>

        <TouchableOpacity
          style={styles.actionItem}
          onPress={handleClearCache}
        >
          <Text style={styles.actionLabel}>Clear Cache</Text>
          <Text style={styles.actionValue}>128 MB</Text>
        </TouchableOpacity>

        <View style={styles.actionItem}>
          <Text style={styles.actionLabel}>Storage Used</Text>
          <Text style={styles.actionValue}>2.4 GB</Text>
        </View>
      </View>

      {/* About Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>

        <TouchableOpacity
          style={styles.actionItem}
          onPress={() => Alert.alert('E-Code', 'Version 1.0.0\\nBuild 2025.11.24')}
        >
          <Text style={styles.actionLabel}>Version</Text>
          <Text style={styles.actionValue}>1.0.0</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionItem}
          onPress={() => Alert.alert('Coming Soon', 'Help & Support coming soon')}
        >
          <Text style={styles.actionLabel}>Help & Support</Text>
          <Text style={styles.actionArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionItem}
          onPress={() => Alert.alert('Coming Soon', 'Privacy Policy coming soon')}
        >
          <Text style={styles.actionLabel}>Privacy Policy</Text>
          <Text style={styles.actionArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionItem}
          onPress={() => Alert.alert('Coming Soon', 'Terms of Service coming soon')}
        >
          <Text style={styles.actionLabel}>Terms of Service</Text>
          <Text style={styles.actionArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Danger Zone */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, styles.dangerTitle]}>Danger Zone</Text>

        <TouchableOpacity
          style={[styles.actionItem, styles.dangerItem]}
          onPress={handleResetSettings}
        >
          <Text style={styles.dangerLabel}>Reset Settings</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionItem, styles.dangerItem]}
          onPress={() => {
            Alert.alert(
              'Sign Out',
              'Are you sure you want to sign out?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Sign Out',
                  style: 'destructive',
                  onPress: () => {
                    // TODO: Implement logout
                    Alert.alert('Signed Out', 'You have been signed out');
                  }
                }
              ]
            );
          }}
        >
          <Text style={styles.dangerLabel}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>E-Code Platform</Text>
        <Text style={styles.footerSubtext}>© 2025 E-Code Team</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: mobileColors.background.primary
  },
  content: {
    padding: mobileSpacing.md
  },
  section: {
    marginBottom: mobileSpacing.lg,
    backgroundColor: mobileColors.background.secondary,
    borderRadius: mobileBorderRadius.lg,
    borderWidth: 1,
    borderColor: mobileColors.border.default,
    overflow: 'hidden'
  },
  sectionTitle: {
    fontSize: mobileTypography.fontSize.sm,
    fontWeight: '700',
    color: mobileColors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: mobileSpacing.md,
    paddingTop: mobileSpacing.md,
    paddingBottom: mobileSpacing.sm
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: mobileSpacing.md,
    paddingVertical: mobileSpacing.md,
    borderTopWidth: 1,
    borderTopColor: mobileColors.border.default
  },
  settingInfo: {
    flex: 1,
    marginRight: mobileSpacing.md
  },
  settingLabel: {
    fontSize: mobileTypography.fontSize.base,
    fontWeight: '600',
    color: mobileColors.text.primary,
    marginBottom: 4
  },
  settingDescription: {
    fontSize: mobileTypography.fontSize.sm,
    color: mobileColors.text.secondary,
    lineHeight: 18
  },
  actionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: mobileSpacing.md,
    paddingVertical: mobileSpacing.md,
    borderTopWidth: 1,
    borderTopColor: mobileColors.border.default
  },
  actionLabel: {
    fontSize: mobileTypography.fontSize.base,
    fontWeight: '600',
    color: mobileColors.text.primary
  },
  actionValue: {
    fontSize: mobileTypography.fontSize.base,
    color: mobileColors.text.secondary
  },
  actionArrow: {
    fontSize: 24,
    color: mobileColors.text.secondary,
    fontWeight: '300'
  },
  dangerTitle: {
    color: '#ef4444'
  },
  dangerItem: {
    backgroundColor: 'rgba(239, 68, 68, 0.05)'
  },
  dangerLabel: {
    fontSize: mobileTypography.fontSize.base,
    fontWeight: '600',
    color: '#ef4444'
  },
  footer: {
    alignItems: 'center',
    paddingVertical: mobileSpacing.xl,
    marginTop: mobileSpacing.lg
  },
  footerText: {
    fontSize: mobileTypography.fontSize.sm,
    fontWeight: '600',
    color: mobileColors.text.secondary,
    marginBottom: 4
  },
  footerSubtext: {
    fontSize: mobileTypography.fontSize.xs,
    color: mobileColors.text.tertiary
  }
});

export default SettingsScreen;
