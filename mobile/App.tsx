import 'react-native-gesture-handler';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, View, StyleSheet, Alert, TouchableOpacity, Text, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Notifications from 'expo-notifications';

import { RootStackParamList } from './src/navigation/types';
import { AuthResponse, User } from './src/types';
import { login as loginRequest } from './src/services/api';
import { validateConfig, getConfig } from './src/services/config';
import { notificationService } from './src/services/notifications';
import { offlineCacheService } from './src/services/offline-cache';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import AgentScreen from './src/screens/AgentScreen';
import ProjectScreen from './src/screens/ProjectScreen';
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

const TOKEN_STORAGE_KEY = 'ecode.mobile.token';
const USER_STORAGE_KEY = 'ecode.mobile.user';

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
        Alert.alert('New File', 'Create new file action triggered');
        break;
      case 'openFile':
        handleNavigate('FileManager', params);
        break;
      case 'saveFile':
        Alert.alert('Save', 'File saved successfully');
        break;
      case 'run':
        Alert.alert('Run', 'Running project...');
        break;
      case 'askAgent':
        handleNavigate('Agent', params);
        break;
      case 'explainCode':
        Alert.alert('AI', 'Explain code feature triggered');
        break;
      case 'fixBug':
        Alert.alert('AI', 'Fix bug feature triggered');
        break;
      case 'generateCode':
        Alert.alert('AI', 'Generate code feature triggered');
        break;
      case 'refactor':
        Alert.alert('AI', 'Refactor feature triggered');
        break;
      case 'goToFile':
        handleNavigate('FileManager', params);
        break;
      case 'goToLine':
        Alert.alert('Navigation', 'Go to line feature triggered');
        break;
      default:
        console.log('Action not implemented:', actionId);
    }
  }, [handleNavigate]);

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

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const storedToken = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
        const storedUser = await AsyncStorage.getItem(USER_STORAGE_KEY);

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
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

      await AsyncStorage.setItem(TOKEN_STORAGE_KEY, response.tokens.access);
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(response.user));

      setToken(response.tokens.access);
      setUser(response.user);
    } catch (error: any) {
      Alert.alert('Login failed', error.message ?? 'Unable to sign in');
      throw error;
    }
  }, []);

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
