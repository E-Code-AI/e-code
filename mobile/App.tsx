import 'react-native-gesture-handler';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, View, StyleSheet, Alert, TouchableOpacity, Text, Platform, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Notifications from 'expo-notifications';
import { SecureStorage, TOKEN_STORAGE_KEY, USER_STORAGE_KEY } from './src/services/secure-storage';

import { RootStackParamList } from './src/navigation/types';
import { AuthResponse, User } from './src/types';
import { login as loginRequest } from './src/services/api';
import { validateConfig, getConfig } from './src/services/config';
import { notificationService } from './src/services/notifications';
import { offlineCacheService } from './src/services/offline-cache';
import { OAuthService, OAuthCallbackParams } from './src/services/oauth';
import { registerBackgroundSync } from './src/services/background-sync';
import { otaUpdateService } from './src/services/ota-updates';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import AgentScreen from './src/screens/AgentScreen';
import ProjectScreen from './src/screens/ProjectScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import SearchScreen from './src/screens/SearchScreen';
import TerminalScreen from './src/screens/TerminalScreen';
import FileManagerScreen from './src/screens/FileManagerScreen';
import CollaborationScreen from './src/screens/CollaborationScreen';
import DeploymentsScreen from './src/screens/DeploymentsScreen';
import TemplatesScreen from './src/screens/TemplatesScreen';
import EditorScreen from './src/screens/EditorScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import HelpScreen from './src/screens/HelpScreen';
import { CommandPalette } from './src/components/CommandPalette';
import { CommandPaletteGestureWrapper } from './src/components/CommandPaletteGestureWrapper';
import { useCommandPalette } from './src/hooks/useCommandPalette';

/**
 * Configure notification behavior when app is in foreground
 * This determines how notifications appear when the user is actively using the app
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Validate configuration at app startup
 * This will throw an error immediately if misconfigured in production
 * Ensures the app fails fast rather than silently using localhost
 */
try {
  validateConfig();
} catch (error) {
  console.error('[App Startup Error]', error);
  // In production, this will prevent the app from starting with invalid config
  throw error;
}

const Stack = createNativeStackNavigator<RootStackParamList>();

// Token keys are now imported from secure-storage.ts

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

  const handleNavigate = useCallback((screen: string, params?: any) => {
    if (navigationRef.current) {
      navigationRef.current.navigate(screen as any, params);
    }
  }, []);

  const handleAction = useCallback((actionId: string, params?: any) => {
    switch (actionId) {
      case 'newFile':
        handleNavigate('FileManager', { ...params, action: 'create' });
        break;
      case 'openFile':
        handleNavigate('FileManager', params);
        break;
      case 'saveFile':
        Alert.alert('Saved', 'File saved successfully');
        break;
      case 'run':
        handleNavigate('Terminal', params);
        break;
      case 'askAgent':
        if (params?.projectId) {
          handleNavigate('Agent', params);
        } else {
          Alert.alert('Select Project', 'Please select a project first to use the AI Agent');
        }
        break;
      case 'explainCode':
      case 'fixBug':
      case 'generateCode':
      case 'refactor':
        if (params?.projectId) {
          handleNavigate('Agent', { ...params, action: actionId });
        } else {
          Alert.alert('Select Project', 'Please select a project first to use AI features');
        }
        break;
      case 'goToFile':
        handleNavigate('Search', params);
        break;
      case 'goToLine':
        handleNavigate('Search', { ...params, searchType: 'line' });
        break;
      case 'notifications':
        handleNavigate('Notifications', params);
        break;
      case 'profile':
        if (user) {
          handleNavigate('Profile', { token, user });
        }
        break;
      case 'help':
        handleNavigate('Help');
        break;
      default:
        console.log('Action not implemented:', actionId);
    }
  }, [handleNavigate, token, user]);

  const {
    isOpen: commandPaletteOpen,
    open: openCommandPalette,
    close: closeCommandPalette,
    toggle: toggleCommandPalette,
    searchQuery,
    setSearchQuery,
    recentCommands,
    commandsByCategory,
    executeCommand,
  } = useCommandPalette({
    onNavigate: handleNavigate,
    onAction: handleAction,
    enableShakeToOpen: true,
  });

  // Initialize push notifications when user is authenticated
  useEffect(() => {
    if (token && user) {
      const config = getConfig();
      notificationService.initialize({
        serverUrl: config.API_BASE_URL,
        userId: user.id?.toString(),
        token: token,
      }).then((success) => {
        if (success) {
          console.log('[App] Push notifications initialized');
        }
      });

      // Set up notification listeners
      let receivedCleanup: (() => void) | null = null;
      let responseCleanup: (() => void) | null = null;

      const setupListeners = async () => {
        // Foreground notification handler
        receivedCleanup = await notificationService.addNotificationReceivedListener(
          (notification) => {
            console.log('[App] Notification received:', notification);
          }
        );

        // Notification tap handler - navigate to appropriate screen
        responseCleanup = await notificationService.addNotificationResponseListener(
          (response) => {
            const data = response.notification?.request?.content?.data;
            console.log('[App] Notification tapped:', data);

            if (data?.projectId && navigationRef.current) {
              navigationRef.current.navigate('Project', {
                projectId: data.projectId,
                projectName: data.projectName || 'Project',
              });
            }
          }
        );
      };

      setupListeners();

      return () => {
        receivedCleanup?.();
        responseCleanup?.();
      };
    }
  }, [token, user]);

  // Initialize offline cache service on app startup
  useEffect(() => {
    offlineCacheService.initialize().then(() => {
      console.log('[App] Offline cache service initialized');
    }).catch(err => {
      console.warn('[App] Offline cache initialization failed:', err);
    });

    return () => {
      offlineCacheService.destroy();
    };
  }, []);

  // Register background sync task on app startup
  useEffect(() => {
    registerBackgroundSync()
      .then(() => {
        console.log('[App] Background sync registered');
      })
      .catch(err => {
        console.warn('[App] Background sync registration failed:', err);
      });
  }, []);

  // Check for OTA updates on app startup
  useEffect(() => {
    otaUpdateService.checkAndApplyUpdate(true)
      .then(() => {
        console.log('[App] OTA update check completed');
      })
      .catch(err => {
        console.warn('[App] OTA update check failed:', err);
      });
  }, []);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        // SECURITY: Use SecureStorage for token retrieval
        const storedToken = await SecureStorage.getItem(TOKEN_STORAGE_KEY);
        const storedUser = await AsyncStorage.getItem(USER_STORAGE_KEY);

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
        
        // Migrate tokens from AsyncStorage to SecureStorage if needed
        await SecureStorage.migrateFromAsyncStorage(TOKEN_STORAGE_KEY);
      } catch (error) {
        console.warn('Failed to restore session', error);
      } finally {
        setInitializing(false);
      }
    };

    restoreSession();
  }, []);

  const handleLogin = useCallback(async (username: string, password: string) => {
    try {
      const response: AuthResponse = await loginRequest(username, password);

      // SECURITY: Use SecureStorage for sensitive tokens
      await SecureStorage.setItem(TOKEN_STORAGE_KEY, response.tokens.access);
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(response.user));

      setToken(response.tokens.access);
      setUser(response.user);
    } catch (error: any) {
      Alert.alert('Login failed', error.message ?? 'Unable to sign in');
      throw error;
    }
  }, []);

  const handleOAuthCallback = useCallback(async (params: OAuthCallbackParams) => {
    if (params.error) {
      Alert.alert('Authentication Failed', params.error);
      return;
    }
    
    if (params.token && params.userId && params.username) {
      try {
        // SECURITY: Use SecureStorage for sensitive tokens
        await SecureStorage.setItem(TOKEN_STORAGE_KEY, params.token);
        if (params.refreshToken) {
          await SecureStorage.setItem('ecode.mobile.refreshToken', params.refreshToken);
        }
        
        const oauthUser: User = {
          id: parseInt(params.userId, 10) || 0,
          username: params.username,
          displayName: params.displayName || params.username,
          email: '',
          avatarUrl: null
        };
        
        await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(oauthUser));
        setToken(params.token);
        setUser(oauthUser);
        
        Alert.alert('Success', `Welcome, ${oauthUser.displayName}!`);
      } catch (error) {
        console.error('[OAuth] Failed to store credentials:', error);
        Alert.alert('Error', 'Failed to complete authentication');
      }
    }
  }, []);

  const handleDeepLink = useCallback((event: { url: string }) => {
    const url = event.url;
    console.log('[DeepLink] Received:', url);
    
    if (OAuthService.isOAuthCallback(url)) {
      const params = OAuthService.parseCallbackUrl(url);
      handleOAuthCallback(params);
    }
  }, [handleOAuthCallback]);

  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      if (url && OAuthService.isOAuthCallback(url)) {
        const params = OAuthService.parseCallbackUrl(url);
        handleOAuthCallback(params);
      }
    });
    
    const subscription = Linking.addEventListener('url', handleDeepLink);
    
    return () => {
      subscription.remove();
    };
  }, [handleDeepLink, handleOAuthCallback]);

  const handleLogout = useCallback(async () => {
    try {
      // Clear push notification token on logout
      await notificationService.clearToken();
      await AsyncStorage.multiRemove([TOKEN_STORAGE_KEY, USER_STORAGE_KEY]);
    } catch (error) {
      console.warn('Failed to clear session', error);
    } finally {
      setToken(null);
      setUser(null);
    }
  }, []);

  const screenOptions = useMemo(
    () => ({
      headerStyle: { backgroundColor: '#0f172a' },
      headerTintColor: '#f8fafc',
      contentStyle: { backgroundColor: '#020617' },
      headerRight: () => (
        <TouchableOpacity
          onPress={openCommandPalette}
          style={styles.commandButton}
          testID="button-open-command-palette"
        >
          <Text style={styles.commandButtonText}>⌘</Text>
        </TouchableOpacity>
      ),
    }),
    [openCommandPalette]
  );

  if (initializing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#38bdf8" />
      </View>
    );
  }

  return (
    <CommandPaletteGestureWrapper onTripleTap={toggleCommandPalette} enabled={!!token}>
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator screenOptions={screenOptions}>
          {token && user ? (
            <>
              <Stack.Screen
                name="Home"
                options={{ title: 'Projects' }}
              >
                {(props) => (
                  <HomeScreen
                    {...props}
                    token={token}
                    user={user}
                    onLogout={handleLogout}
                  />
                )}
              </Stack.Screen>
              <Stack.Screen
                name="Agent"
                options={({ route }) => ({ title: route.params.projectName })}
              >
                {(props) => (
                  <AgentScreen
                    {...props}
                    token={token}
                  />
                )}
              </Stack.Screen>
              <Stack.Screen
                name="Project"
                options={({ route }) => ({ title: route.params.projectName })}
              >
                {(props) => (
                  <ProjectScreen
                    {...props}
                    token={token}
                  />
                )}
              </Stack.Screen>
              <Stack.Screen
                name="Settings"
                options={{ title: 'Settings' }}
              >
                {(props) => (
                  <SettingsScreen
                    {...props}
                    route={{ ...props.route, params: { token } }}
                  />
                )}
              </Stack.Screen>
              <Stack.Screen
                name="Profile"
                options={{ title: 'Profile' }}
                component={ProfileScreen}
              />
              <Stack.Screen
                name="Search"
                options={{ title: 'Search' }}
              >
                {(props) => (
                  <SearchScreen
                    {...props}
                    route={{ ...props.route, params: { token } }}
                  />
                )}
              </Stack.Screen>
              <Stack.Screen
                name="Terminal"
                options={{ title: 'Terminal' }}
                component={TerminalScreen}
              />
              <Stack.Screen
                name="FileManager"
                options={{ title: 'Files' }}
                component={FileManagerScreen}
              />
              <Stack.Screen
                name="Collaboration"
                options={{ title: 'Collaboration' }}
                component={CollaborationScreen}
              />
              <Stack.Screen
                name="Deployments"
                options={{ title: 'Deployments' }}
                component={DeploymentsScreen}
              />
              <Stack.Screen
                name="Templates"
                options={{ title: 'Templates' }}
                component={TemplatesScreen}
              />
              <Stack.Screen
                name="Editor"
                options={({ route }) => ({ title: route.params.fileName })}
                component={EditorScreen}
              />
              <Stack.Screen
                name="Notifications"
                options={{ title: 'Notifications' }}
                component={NotificationsScreen}
              />
              <Stack.Screen
                name="Help"
                options={{ title: 'Help & Support' }}
                component={HelpScreen}
              />
            </>
          ) : (
            <Stack.Screen name="Login" options={{ headerShown: false }}>
              {(props) => (
                <LoginScreen
                  {...props}
                  onLogin={handleLogin}
                />
              )}
            </Stack.Screen>
          )}
        </Stack.Navigator>
      </NavigationContainer>

      <CommandPalette
        visible={commandPaletteOpen}
        onClose={closeCommandPalette}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        recentCommands={recentCommands}
        commandsByCategory={commandsByCategory}
        onExecuteCommand={executeCommand}
      />
    </CommandPaletteGestureWrapper>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#020617'
  },
  commandButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  commandButtonText: {
    color: '#94a3b8',
    fontSize: 18,
    fontWeight: '600',
  },
});
