import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const API_BASE = 'http://localhost:5000/api';

export function ExploreTab() {
  const [templates, setTemplates] = useState([]);
  const [trending, setTrending] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadExploreContent();
  }, []);

  const loadExploreContent = async () => {
    try {
      const [templatesRes, projectsRes] = await Promise.all([
        fetch(`${API_BASE}/templates`),
        fetch(`${API_BASE}/projects/explore`)
      ]);

      const templatesData = await templatesRes.json();
      const projectsData = await projectsRes.json();

      setTemplates(templatesData.slice(0, 6));
      setTrending(projectsData.trending || projectsData.slice(0, 5));
      setFeatured(projectsData.featured || projectsData.slice(5, 10));
    } catch (error) {
      console.error('Failed to load explore content:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadExploreContent();
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#0079F2" />
      </View>
    );
  }

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
      {/* Featured Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Featured</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {featured.map((project, index) => (
            <TouchableOpacity key={index} style={styles.featuredCard}>
              <View style={styles.featuredImage}>
                <Icon name="code" size={32} color="#0079F2" />
              </View>
              <Text style={styles.featuredTitle}>{project.name}</Text>
              <Text style={styles.featuredDescription}>
                {project.description || 'Amazing project to explore'}
              </Text>
              <View style={styles.featuredStats}>
                <View style={styles.stat}>
                  <Icon name="visibility" size={14} color="#6b7280" />
                  <Text style={styles.statText}>{project.views || 0}</Text>
                </View>
                <View style={styles.stat}>
                  <Icon name="favorite" size={14} color="#6b7280" />
                  <Text style={styles.statText}>{project.likes || 0}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Templates Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Popular Templates</Text>
        <View style={styles.templatesGrid}>
          {templates.map((template, index) => (
            <TouchableOpacity key={index} style={styles.templateCard}>
              <View style={styles.templateIcon}>
                <Icon name="description" size={24} color="#0079F2" />
              </View>
              <Text style={styles.templateName}>{template.name}</Text>
              <Text style={styles.templateLang}>{template.language}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Trending Projects */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Trending</Text>
        {trending.map((project, index) => (
          <TouchableOpacity key={index} style={styles.trendingCard}>
            <Text style={styles.trendingNumber}>#{index + 1}</Text>
            <View style={styles.trendingContent}>
              <Text style={styles.trendingTitle}>{project.name}</Text>
              <Text style={styles.trendingAuthor}>by @{project.owner?.username || 'user'}</Text>
              <View style={styles.trendingStats}>
                <View style={styles.stat}>
                  <Icon name="code" size={12} color="#6b7280" />
                  <Text style={styles.statText}>{project.language}</Text>
                </View>
                <View style={styles.stat}>
                  <Icon name="star" size={12} color="#6b7280" />
                  <Text style={styles.statText}>{project.stars || 0}</Text>
                </View>
              </View>
            </View>
            <Icon name="chevron-right" size={20} color="#6b7280" />
          </TouchableOpacity>
        ))}
      </View>

      {/* Community Showcase */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Community Showcase</Text>
        <View style={styles.showcaseCard}>
          <Icon name="groups" size={48} color="#0079F2" />
          <Text style={styles.showcaseTitle}>Join the Community</Text>
          <Text style={styles.showcaseDescription}>
            Share your projects, get feedback, and collaborate with developers worldwide
          </Text>
          <TouchableOpacity style={styles.showcaseButton}>
            <Text style={styles.showcaseButtonText}>Explore Community</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0e1525',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0e1525',
  },
  section: {
    marginVertical: 16,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  featuredCard: {
    backgroundColor: '#1c2333',
    borderRadius: 12,
    padding: 16,
    marginLeft: 16,
    width: 200,
  },
  featuredImage: {
    height: 100,
    backgroundColor: '#0e1525',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  featuredTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  featuredDescription: {
    color: '#6b7280',
    fontSize: 12,
    marginBottom: 8,
    numberOfLines: 2,
  },
  featuredStats: {
    flexDirection: 'row',
    gap: 12,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    color: '#6b7280',
    fontSize: 12,
  },
  templatesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  templateCard: {
    backgroundColor: '#1c2333',
    borderRadius: 8,
    padding: 12,
    width: '47%',
    alignItems: 'center',
  },
  templateIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#0079F220',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  templateName: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  templateLang: {
    color: '#6b7280',
    fontSize: 11,
  },
  trendingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c2333',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 8,
  },
  trendingNumber: {
    color: '#0079F2',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 12,
    width: 30,
  },
  trendingContent: {
    flex: 1,
  },
  trendingTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  trendingAuthor: {
    color: '#6b7280',
    fontSize: 12,
    marginBottom: 4,
  },
  trendingStats: {
    flexDirection: 'row',
    gap: 12,
  },
  showcaseCard: {
    backgroundColor: '#1c2333',
    marginHorizontal: 16,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  showcaseTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 8,
  },
  showcaseDescription: {
    color: '#6b7280',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  showcaseButton: {
    backgroundColor: '#0079F2',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  showcaseButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});