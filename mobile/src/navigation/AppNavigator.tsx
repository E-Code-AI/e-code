import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';

// Screens
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import ProjectScreen from '../screens/ProjectScreen';
import AgentScreen from '../screens/AgentScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SearchScreen from '../screens/SearchScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import FileManagerScreen from '../screens/FileManagerScreen';
import EditorScreen from '../screens/EditorScreen';
import TerminalScreen from '../screens/TerminalScreen';
import DeploymentsScreen from '../screens/DeploymentsScreen';
import CollaborationScreen from '../screens/CollaborationScreen';
import TemplatesScreen from '../screens/TemplatesScreen';
import HelpScreen from '../screens/HelpScreen';

import { RootStackParamList, MainTabParamList } from './types';
import { User } from '../types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

type AppNavigatorProps = {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  onLogout: () => void;
};

function MainTabs({ user, token, onLogout }: { user: User; token: string; onLogout: () => void }) {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0f172a',
          borderTopColor: '#1e293b',
          borderTopWidth: 1
        },
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#64748b'
      }}
    >
      <Tab.Screen
        name="Home"
        options={{
          tabBarLabel: 'Projects',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24, color }}>📁</Text>
        }}
      >
        {(props) => <HomeScreen {...props} token={token} user={user} onLogout={onLogout} />}
      </Tab.Screen>

      <Tab.Screen
        name="Search"
        options={{
          tabBarLabel: 'Search',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24, color }}>🔍</Text>
        }}
      >
        {(props) => <SearchScreen {...props} token={token} />}
      </Tab.Screen>

      <Tab.Screen
        name="Notifications"
        options={{
          tabBarLabel: 'Alerts',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24, color }}>🔔</Text>
        }}
      >
        {(props) => <NotificationsScreen {...props} token={token} />}
      </Tab.Screen>

      <Tab.Screen
        name="Settings"
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24, color }}>⚙️</Text>
        }}
      >
        {(props) => <SettingsScreen {...props} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export function AppNavigator({ isAuthenticated, user, token, onLogout }: AppNavigatorProps) {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#0f172a' },
          headerTintColor: '#e2e8f0',
          headerTitleStyle: { fontWeight: '600' },
          contentStyle: { backgroundColor: '#020617' }
        }}
      >
        {!isAuthenticated || !user || !token ? (
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
        ) : (
          <>
            <Stack.Screen
              name="Main"
              options={{ headerShown: false }}
            >
              {(props) => <MainTabs {...props} user={user} token={token} onLogout={onLogout} />}
            </Stack.Screen>

            <Stack.Screen
              name="Project"
              options={({ route }) => ({
                title: route.params.projectName || 'Project'
              })}
            >
              {(props) => <ProjectScreen {...props} token={token} />}
            </Stack.Screen>

            <Stack.Screen name="Agent" component={AgentScreen} />

            <Stack.Screen
              name="Profile"
              options={{ title: 'Edit Profile' }}
            >
              {(props) => <ProfileScreen {...props} user={user} token={token} />}
            </Stack.Screen>

            <Stack.Screen
              name="FileManager"
              options={{ title: 'File Manager' }}
            >
              {(props) => <FileManagerScreen {...props} token={token} />}
            </Stack.Screen>

            <Stack.Screen
              name="Editor"
              options={{ title: 'Editor' }}
            >
              {(props) => <EditorScreen {...props} token={token} />}
            </Stack.Screen>

            <Stack.Screen
              name="Terminal"
              options={{ title: 'Terminal' }}
            >
              {(props) => <TerminalScreen {...props} token={token} />}
            </Stack.Screen>

            <Stack.Screen
              name="Deployments"
              options={{ title: 'Deployments' }}
            >
              {(props) => <DeploymentsScreen {...props} token={token} />}
            </Stack.Screen>

            <Stack.Screen
              name="Collaboration"
              options={{ title: 'Team' }}
            >
              {(props) => <CollaborationScreen {...props} token={token} />}
            </Stack.Screen>

            <Stack.Screen
              name="Templates"
              options={{ title: 'Templates' }}
            >
              {(props) => <TemplatesScreen {...props} token={token} />}
            </Stack.Screen>

            <Stack.Screen
              name="Help"
              options={{ title: 'Help & Support' }}
              component={HelpScreen}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default AppNavigator;
