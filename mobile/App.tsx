import 'react-native-gesture-handler';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { RootStackParamList } from './src/navigation/types';
import { AuthResponse, User } from './src/types';
import { login as loginRequest } from './src/services/api';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import ProjectScreen from './src/screens/ProjectScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const TOKEN_STORAGE_KEY = 'ecode.mobile.token';
const USER_STORAGE_KEY = 'ecode.mobile.user';

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

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
      contentStyle: { backgroundColor: '#020617' }
    }),
    []
  );

  if (initializing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#38bdf8" />
      </View>
    );
  }

  return (
    <NavigationContainer>
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
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#020617'
  }
});
