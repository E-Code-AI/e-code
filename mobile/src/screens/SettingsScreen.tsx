import React, { useState, useCallback, useEffect } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Switch,
  Alert,
  Platform,
  ActivityIndicator,
  useColorScheme,
  Appearance
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { mobileColors, mobileSpacing, mobileTypography, mobileBorderRadius } from '../../../shared/theme/mobile-theme';
import { logout, clearCache } from '../services/api';
import { StorageService } from '../services/storage';

type SettingsScreenProps = NativeStackScreenProps<RootStackParamList, 'Settings'>;

const SETTINGS_STORAGE_KEY = 'app_settings';

interface AppSettings {
  notifications: boolean;
  autoSave: boolean;
  darkMode: boolean;
  offlineMode: boolean;
  biometric: boolean;
  analytics: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  notifications: true,
  autoSave: true,
  darkMode: true,
  offlineMode: false,
  biometric: false,
  analytics: true
};

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation, route }) => {
  const { token } = route.params;
  const systemColorScheme = useColorScheme();
  
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [clearingCache, setClearingCache] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await StorageService.get<AppSettings>(SETTINGS_STORAGE_KEY);
      if (savedSettings) {
        setSettings(savedSettings);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setIsLoadingSettings(false);
    }
  };

  const saveSettings = async (newSettings: AppSettings) => {
    try {
      await StorageService.set(SETTINGS_STORAGE_KEY, newSettings);
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  const updateSetting = useCallback(<K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(prev => {
      const newSettings = { ...prev, [key]: value };
      saveSettings(newSettings);
      return newSettings;
    });
  }, []);

  const handleDarkModeToggle = useCallback((value: boolean) => {
    updateSetting('darkMode', value);
    Alert.alert(
      'Theme Updated',
      `${value ? 'Dark' : 'Light'} mode will be applied on next app restart.`,
      [{ text: 'OK' }]
    );
  }, [updateSetting]);

  const handleClearCache = useCallback(() => {
    Alert.alert(
      'Clear Cache',
      'Are you sure you want to clear all cached data?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            setClearingCache(true);
            try {
              const result = await clearCache(token);
              Alert.alert('Success', `Cache cleared successfully (${formatBytes(result.clearedBytes)} freed)`);
            } catch (error) {
              Alert.alert('Error', error instanceof Error ? error.message : 'Failed to clear cache');
            } finally {
              setClearingCache(false);
            }
          }
        }
      ]
    );
  }, [token]);

  const handleResetSettings = useCallback(() => {
    Alert.alert(
      'Reset Settings',
      'This will reset all settings to default values.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            setSettings(DEFAULT_SETTINGS);
            await saveSettings(DEFAULT_SETTINGS);
            Alert.alert('Success', 'Settings reset to defaults');
          }
        }
      ]
    );
  }, []);

  if (isLoadingSettings) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={mobileColors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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
            value={settings.notifications}
            onValueChange={(value) => updateSetting('notifications', value)}
            trackColor={{ false: '#334155', true: '#3b82f6' }}
            thumbColor={settings.notifications ? '#60a5fa' : '#94a3b8'}
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
            value={settings.autoSave}
            onValueChange={(value) => updateSetting('autoSave', value)}
            trackColor={{ false: '#334155', true: '#3b82f6' }}
            thumbColor={settings.autoSave ? '#60a5fa' : '#94a3b8'}
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
            value={settings.darkMode}
            onValueChange={handleDarkModeToggle}
            trackColor={{ false: '#334155', true: '#3b82f6' }}
            thumbColor={settings.darkMode ? '#60a5fa' : '#94a3b8'}
          />
        </View>
      </View>

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
            value={settings.offlineMode}
            onValueChange={(value) => updateSetting('offlineMode', value)}
            trackColor={{ false: '#334155', true: '#3b82f6' }}
            thumbColor={settings.offlineMode ? '#60a5fa' : '#94a3b8'}
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
            value={settings.biometric}
            onValueChange={(value) => updateSetting('biometric', value)}
            trackColor={{ false: '#334155', true: '#3b82f6' }}
            thumbColor={settings.biometric ? '#60a5fa' : '#94a3b8'}
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
            value={settings.analytics}
            onValueChange={(value) => updateSetting('analytics', value)}
            trackColor={{ false: '#334155', true: '#3b82f6' }}
            thumbColor={settings.analytics ? '#60a5fa' : '#94a3b8'}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>

        <TouchableOpacity
          style={styles.actionItem}
          onPress={() => Alert.alert('Coming Soon', 'Edit Profile from settings coming soon')}
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

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Storage</Text>

        <TouchableOpacity
          style={styles.actionItem}
          onPress={handleClearCache}
          disabled={clearingCache}
        >
          <Text style={styles.actionLabel}>Clear Cache</Text>
          {clearingCache ? (
            <ActivityIndicator size="small" color={mobileColors.primary} />
          ) : (
            <Text style={styles.actionValue}>128 MB</Text>
          )}
        </TouchableOpacity>

        <View style={styles.actionItem}>
          <Text style={styles.actionLabel}>Storage Used</Text>
          <Text style={styles.actionValue}>2.4 GB</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>

        <TouchableOpacity
          style={styles.actionItem}
          onPress={() => Alert.alert('E-Code', 'Version 1.0.0\nBuild 2025.11.24')}
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
          disabled={signingOut}
          onPress={() => {
            Alert.alert(
              'Sign Out',
              'Are you sure you want to sign out?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Sign Out',
                  style: 'destructive',
                  onPress: async () => {
                    setSigningOut(true);
                    try {
                      await logout(token);
                      navigation.reset({
                        index: 0,
                        routes: [{ name: 'Login' }]
                      });
                    } catch (error) {
                      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to sign out');
                      setSigningOut(false);
                    }
                  }
                }
              ]
            );
          }}
        >
          {signingOut ? (
            <ActivityIndicator size="small" color="#ef4444" />
          ) : (
            <Text style={styles.dangerLabel}>Sign Out</Text>
          )}
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
    backgroundColor: mobileColors.background
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  content: {
    padding: mobileSpacing.md
  },
  section: {
    marginBottom: mobileSpacing.lg,
    backgroundColor: mobileColors.surfaceSecondary,
    borderRadius: mobileBorderRadius.lg,
    borderWidth: 1,
    borderColor: mobileColors.border,
    overflow: 'hidden'
  },
  sectionTitle: {
    fontSize: mobileTypography.fontSize.sm,
    fontWeight: '700',
    color: mobileColors.textSecondary,
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
    borderTopColor: mobileColors.border
  },
  settingInfo: {
    flex: 1,
    marginRight: mobileSpacing.md
  },
  settingLabel: {
    fontSize: mobileTypography.fontSize.base,
    fontWeight: '600',
    color: mobileColors.text,
    marginBottom: 4
  },
  settingDescription: {
    fontSize: mobileTypography.fontSize.sm,
    color: mobileColors.textSecondary,
    lineHeight: 18
  },
  actionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: mobileSpacing.md,
    paddingVertical: mobileSpacing.md,
    borderTopWidth: 1,
    borderTopColor: mobileColors.border
  },
  actionLabel: {
    fontSize: mobileTypography.fontSize.base,
    fontWeight: '600',
    color: mobileColors.text
  },
  actionValue: {
    fontSize: mobileTypography.fontSize.base,
    color: mobileColors.textSecondary
  },
  actionArrow: {
    fontSize: 24,
    color: mobileColors.textSecondary,
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
    color: mobileColors.textSecondary,
    marginBottom: 4
  },
  footerSubtext: {
    fontSize: mobileTypography.fontSize.xs,
    color: mobileColors.textMuted
  }
});

export default SettingsScreen;
