import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  StatusBar,
  FlatList,
  Modal,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width, height } = Dimensions.get('window');
const API_BASE = 'http://localhost:5000/api';

// Main App Component - Exact Replit Mobile Clone
export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [projects, setProjects] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    checkAuthentication();
    if (isAuthenticated) {
      loadProjects();
    }
  }, [isAuthenticated]);

  const checkAuthentication = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const userData = await AsyncStorage.getItem('userData');
      if (token && userData) {
        setIsAuthenticated(true);
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    }
  };

  const loadProjects = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_BASE}/mobile/projects`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      setProjects(data);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return <LoginScreen onLogin={(userData) => {
      setIsAuthenticated(true);
      setUser(userData);
    }} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0e1525" />
      
      {/* Header - Exact Replit Style */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setActiveTab('home')}>
          <Image 
            source={{uri: 'https://replit.com/public/images/logo-small.png'}} 
            style={styles.logo}
          />
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerIcon} onPress={() => setActiveTab('search')}>
            <Icon name="search" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIcon} onPress={() => setActiveTab('notifications')}>
            <Icon name="notifications" size={24} color="#fff" />
            <View style={styles.notificationBadge}>
              <Text style={styles.badgeText}>3</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab('profile')}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.username?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar - Replit Style */}
      {activeTab === 'search' && (
        <View style={styles.searchBar}>
          <Icon name="search" size={20} color="#6b7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search projects, templates, users..."
            placeholderTextColor="#6b7280"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      )}

      {/* Main Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'home' && (
          <HomeTab 
            projects={projects} 
            loading={loading}
            onCreateNew={() => setShowCreateModal(true)}
            onRefresh={loadProjects}
          />
        )}
        {activeTab === 'explore' && <ExploreTab />}
        {activeTab === 'create' && <CreateTab onClose={() => setActiveTab('home')} />}
        {activeTab === 'notifications' && <NotificationsTab />}
        {activeTab === 'profile' && <ProfileTab user={user} />}
      </ScrollView>

      {/* Bottom Navigation - Exact Replit Mobile Style */}
      <View style={styles.bottomNav}>
        <TouchableOpacity 
          style={styles.navItem} 
          onPress={() => setActiveTab('home')}
        >
          <Icon 
            name="home" 
            size={24} 
            color={activeTab === 'home' ? '#0079F2' : '#6b7280'} 
          />
          <Text style={[styles.navText, activeTab === 'home' && styles.navTextActive]}>
            Home
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => setActiveTab('explore')}
        >
          <Icon 
            name="explore" 
            size={24} 
            color={activeTab === 'explore' ? '#0079F2' : '#6b7280'} 
          />
          <Text style={[styles.navText, activeTab === 'explore' && styles.navTextActive]}>
            Explore
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.navItem, styles.createButton]}
          onPress={() => setShowCreateModal(true)}
        >
          <View style={styles.createButtonInner}>
            <Icon name="add" size={28} color="#fff" />
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => setActiveTab('notifications')}
        >
          <Icon 
            name="notifications" 
            size={24} 
            color={activeTab === 'notifications' ? '#0079F2' : '#6b7280'} 
          />
          <Text style={[styles.navText, activeTab === 'notifications' && styles.navTextActive]}>
            Activity
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => setActiveTab('profile')}
        >
          <Icon 
            name="person" 
            size={24} 
            color={activeTab === 'profile' ? '#0079F2' : '#6b7280'} 
          />
          <Text style={[styles.navText, activeTab === 'profile' && styles.navTextActive]}>
            Profile
          </Text>
        </TouchableOpacity>
      </View>

      {/* Create Project Modal */}
      <CreateProjectModal 
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={() => {
          setShowCreateModal(false);
          loadProjects();
        }}
      />
    </SafeAreaView>
  );
}

// Home Tab Component
function HomeTab({ projects, loading, onCreateNew, onRefresh }) {
  const templates = [
    { id: 1, name: 'Python', icon: '🐍', color: '#3776AB' },
    { id: 2, name: 'Node.js', icon: '📗', color: '#68A063' },
    { id: 3, name: 'React', icon: '⚛️', color: '#61DAFB' },
    { id: 4, name: 'HTML/CSS', icon: '🌐', color: '#E34C26' },
  ];

  return (
    <View style={styles.homeContainer}>
      {/* Quick Start Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Start coding instantly</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {templates.map(template => (
            <TouchableOpacity 
              key={template.id} 
              style={styles.templateCard}
              onPress={() => {
                Alert.alert(
                  'Create Project',
                  `Create a new ${template.name} project?`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { 
                      text: 'Create', 
                      onPress: () => onCreateNew(template.name.toLowerCase())
                    }
                  ]
                );
              }}
            >
              <View style={[styles.templateIcon, { backgroundColor: template.color + '20' }]}>
                <Text style={styles.templateEmoji}>{template.icon}</Text>
              </View>
              <Text style={styles.templateName}>{template.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Recent Projects */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent</Text>
          <TouchableOpacity onPress={onRefresh}>
            <Icon name="refresh" size={20} color="#6b7280" />
          </TouchableOpacity>
        </View>
        
        {loading ? (
          <ActivityIndicator size="large" color="#0079F2" style={styles.loader} />
        ) : projects.length > 0 ? (
          <FlatList
            data={projects}
            keyExtractor={item => item.id.toString()}
            renderItem={({ item }) => <ProjectCard project={item} />}
            scrollEnabled={false}
          />
        ) : (
          <View style={styles.emptyState}>
            <Icon name="folder-open" size={48} color="#6b7280" />
            <Text style={styles.emptyText}>No projects yet</Text>
            <TouchableOpacity style={styles.createFirstButton} onPress={onCreateNew}>
              <Text style={styles.createFirstText}>Create your first project</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Continue Learning Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Continue Learning</Text>
        <View style={styles.courseCard}>
          <View style={styles.courseIcon}>
            <Icon name="school" size={24} color="#0079F2" />
          </View>
          <View style={styles.courseContent}>
            <Text style={styles.courseTitle}>100 Days of Code</Text>
            <Text style={styles.courseProgress}>Day 7 of 100</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '7%' }]} />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

// Project Card Component
function ProjectCard({ project }) {
  const [showProjectScreen, setShowProjectScreen] = useState(false);
  
  const getLanguageIcon = (language) => {
    const icons = {
      javascript: '📗',
      python: '🐍',
      html: '🌐',
      react: '⚛️',
      typescript: '🔷',
    };
    return icons[language?.toLowerCase()] || '📁';
  };

  if (showProjectScreen) {
    // Import would be at top: import { ProjectScreen } from './screens/ProjectScreen';
    return (
      <Modal visible={true} animationType="slide">
        <ProjectScreen 
          project={project} 
          onClose={() => setShowProjectScreen(false)}
        />
      </Modal>
    );
  }

  return (
    <TouchableOpacity 
      style={styles.projectCard}
      onPress={() => setShowProjectScreen(true)}
    >
      <View style={styles.projectIcon}>
        <Text style={styles.projectEmoji}>{getLanguageIcon(project.language)}</Text>
      </View>
      <View style={styles.projectInfo}>
        <Text style={styles.projectName}>{project.name}</Text>
        <Text style={styles.projectMeta}>
          {project.language} • Updated {formatDate(project.updatedAt)}
        </Text>
      </View>
      <TouchableOpacity 
        style={styles.projectMenu}
        onPress={(e) => {
          e.stopPropagation();
          Alert.alert(
            'Project Options',
            'What would you like to do?',
            [
              { text: 'Rename', onPress: () => Alert.alert('Rename', 'Feature coming soon') },
              { text: 'Delete', style: 'destructive', onPress: () => Alert.alert('Delete', 'Are you sure?') },
              { text: 'Cancel', style: 'cancel' }
            ]
          );
        }}
      >
        <Icon name="more-vert" size={20} color="#6b7280" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

// Login Screen Component
function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Please enter username and password');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/mobile/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();
      if (response.ok) {
        await AsyncStorage.setItem('authToken', data.tokens.access);
        await AsyncStorage.setItem('userData', JSON.stringify(data));
        onLogin(data);
      } else {
        Alert.alert('Login Failed', data.message || 'Invalid credentials');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.loginContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.loginContent}>
        <Image 
          source={{uri: 'https://replit.com/public/images/logo.png'}} 
          style={styles.loginLogo}
        />
        <Text style={styles.loginTitle}>E-Code Mobile</Text>
        <Text style={styles.loginSubtitle}>Code from anywhere</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Username"
          placeholderTextColor="#6b7280"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />
        
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#6b7280"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        
        <TouchableOpacity 
          style={styles.loginButton}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.loginButtonText}>Log In</Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.signupLink}>
          <Text style={styles.signupText}>Don't have an account? Sign up</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// Create Project Modal
function CreateProjectModal({ visible, onClose, onCreated }) {
  const [projectName, setProjectName] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [loading, setLoading] = useState(false);

  const languages = [
    { id: 'javascript', name: 'JavaScript', icon: '📗' },
    { id: 'python', name: 'Python', icon: '🐍' },
    { id: 'html', name: 'HTML/CSS', icon: '🌐' },
    { id: 'typescript', name: 'TypeScript', icon: '🔷' },
    { id: 'react', name: 'React', icon: '⚛️' },
  ];

  const createProject = async () => {
    if (!projectName) {
      Alert.alert('Error', 'Please enter a project name');
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_BASE}/projects`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: projectName,
          language,
          description: `Mobile project created with ${language}`
        })
      });

      if (response.ok) {
        Alert.alert('Success', 'Project created successfully');
        setProjectName('');
        onCreated();
      } else {
        Alert.alert('Error', 'Failed to create project');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create New Project</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.modalInput}
            placeholder="Project name"
            placeholderTextColor="#6b7280"
            value={projectName}
            onChangeText={setProjectName}
          />

          <Text style={styles.modalLabel}>Choose Language</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {languages.map(lang => (
              <TouchableOpacity
                key={lang.id}
                style={[
                  styles.languageOption,
                  language === lang.id && styles.languageOptionActive
                ]}
                onPress={() => setLanguage(lang.id)}
              >
                <Text style={styles.languageIcon}>{lang.icon}</Text>
                <Text style={[
                  styles.languageName,
                  language === lang.id && styles.languageNameActive
                ]}>
                  {lang.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={styles.createProjectButton}
            onPress={createProject}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.createProjectButtonText}>Create Project</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// Utility function
function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// Styles - Exact Replit Mobile Design
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
    paddingVertical: 12,
    backgroundColor: '#0e1525',
    borderBottomWidth: 1,
    borderBottomColor: '#1c2333',
  },
  logo: {
    width: 32,
    height: 32,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerIcon: {
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0079F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c2333',
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    height: 40,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    marginLeft: 8,
    fontSize: 14,
  },
  content: {
    flex: 1,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#0e1525',
    borderTopWidth: 1,
    borderTopColor: '#1c2333',
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  navText: {
    color: '#6b7280',
    fontSize: 10,
    marginTop: 4,
  },
  navTextActive: {
    color: '#0079F2',
  },
  createButton: {
    flex: 0,
  },
  createButtonInner: {
    backgroundColor: '#0079F2',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  homeContainer: {
    flex: 1,
  },
  section: {
    marginVertical: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  templateCard: {
    marginLeft: 16,
    alignItems: 'center',
  },
  templateIcon: {
    width: 64,
    height: 64,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  templateEmoji: {
    fontSize: 28,
  },
  templateName: {
    color: '#fff',
    fontSize: 12,
  },
  projectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c2333',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 8,
  },
  projectIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#0e1525',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  projectEmoji: {
    fontSize: 20,
  },
  projectInfo: {
    flex: 1,
  },
  projectName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  projectMeta: {
    color: '#6b7280',
    fontSize: 12,
  },
  projectMenu: {
    padding: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 14,
    marginTop: 8,
    marginBottom: 16,
  },
  createFirstButton: {
    backgroundColor: '#0079F2',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  createFirstText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  courseCard: {
    flexDirection: 'row',
    backgroundColor: '#1c2333',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 8,
  },
  courseIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#0079F220',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  courseContent: {
    flex: 1,
  },
  courseTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  courseProgress: {
    color: '#6b7280',
    fontSize: 12,
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#0e1525',
    borderRadius: 2,
  },
  progressFill: {
    height: 4,
    backgroundColor: '#0079F2',
    borderRadius: 2,
  },
  loader: {
    marginVertical: 32,
  },
  loginContainer: {
    flex: 1,
    backgroundColor: '#0e1525',
  },
  loginContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  loginLogo: {
    width: 80,
    height: 80,
    alignSelf: 'center',
    marginBottom: 24,
  },
  loginTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  loginSubtitle: {
    color: '#6b7280',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
  },
  input: {
    backgroundColor: '#1c2333',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 14,
    marginBottom: 16,
  },
  loginButton: {
    backgroundColor: '#0079F2',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  signupLink: {
    marginTop: 24,
    alignItems: 'center',
  },
  signupText: {
    color: '#0079F2',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1c2333',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalInput: {
    backgroundColor: '#0e1525',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 14,
    marginBottom: 20,
  },
  modalLabel: {
    color: '#6b7280',
    fontSize: 14,
    marginBottom: 12,
  },
  languageOption: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    borderRadius: 8,
    backgroundColor: '#0e1525',
  },
  languageOptionActive: {
    backgroundColor: '#0079F220',
    borderWidth: 1,
    borderColor: '#0079F2',
  },
  languageIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  languageName: {
    color: '#6b7280',
    fontSize: 12,
  },
  languageNameActive: {
    color: '#0079F2',
  },
  createProjectButton: {
    backgroundColor: '#0079F2',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  createProjectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});