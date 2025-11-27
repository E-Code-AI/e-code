import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Project } from '../types';
import { mobileColors, mobileSpacing, mobileTypography, mobileBorderRadius } from '../../../shared/theme/mobile-theme';

type SearchScreenProps = NativeStackScreenProps<RootStackParamList, 'Search'> & {
  token: string;
};

type SearchResult = {
  type: 'project' | 'file' | 'user';
  id: string;
  title: string;
  subtitle?: string;
  icon?: string;
};

const SearchScreen: React.FC<SearchScreenProps> = ({ navigation, token }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([
    'React hooks',
    'TypeScript tutorial',
    'API integration'
  ]);

  const handleSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      // TODO: Implement real search API
      await new Promise(resolve => setTimeout(resolve, 500));

      const mockResults: SearchResult[] = [
        {
          type: 'project',
          id: '1',
          title: 'My React Project',
          subtitle: 'React • 2 days ago',
          icon: '📁'
        },
        {
          type: 'file',
          id: '2',
          title: 'App.tsx',
          subtitle: 'My React Project',
          icon: '📄'
        },
        {
          type: 'user',
          id: '3',
          title: 'John Doe',
          subtitle: '@johndoe',
          icon: '👤'
        }
      ];

      setResults(mockResults);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      handleSearch(query);
    }, 300);

    return () => clearTimeout(timeout);
  }, [query, handleSearch]);

  const handleResultPress = useCallback((result: SearchResult) => {
    if (result.type === 'project') {
      navigation.navigate('Project', { projectId: parseInt(result.id), projectName: result.title });
    }
  }, [navigation]);

  const handleRecentSearch = useCallback((search: string) => {
    setQuery(search);
  }, []);

  const renderResult = useCallback(({ item }: { item: SearchResult }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => handleResultPress(item)}
    >
      <Text style={styles.resultIcon}>{item.icon}</Text>
      <View style={styles.resultContent}>
        <Text style={styles.resultTitle}>{item.title}</Text>
        {item.subtitle && (
          <Text style={styles.resultSubtitle}>{item.subtitle}</Text>
        )}
      </View>
      <Text style={styles.resultArrow}>›</Text>
    </TouchableOpacity>
  ), [handleResultPress]);

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search projects, files, users..."
          placeholderTextColor={mobileColors.textMuted}
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Text style={styles.clearButton}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading && (
        <View style={styles.loader}>
          <ActivityIndicator size="small" color={mobileColors.primary} />
        </View>
      )}

      {!query && recentSearches.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Searches</Text>
          {recentSearches.map((search, index) => (
            <TouchableOpacity
              key={index}
              style={styles.recentItem}
              onPress={() => handleRecentSearch(search)}
            >
              <Text style={styles.recentIcon}>🕐</Text>
              <Text style={styles.recentText}>{search}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {query && results.length > 0 && (
        <FlatList
          data={results}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          renderItem={renderResult}
          contentContainerStyle={styles.results}
        />
      )}

      {query && !loading && results.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyTitle}>No results found</Text>
          <Text style={styles.emptySubtitle}>
            Try searching with different keywords
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: mobileColors.background
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: mobileColors.surfaceSecondary,
    borderRadius: mobileBorderRadius.lg,
    margin: mobileSpacing.md,
    paddingHorizontal: mobileSpacing.md,
    paddingVertical: mobileSpacing.sm,
    borderWidth: 1,
    borderColor: mobileColors.border
  },
  searchIcon: {
    fontSize: 20,
    marginRight: mobileSpacing.sm
  },
  searchInput: {
    flex: 1,
    fontSize: mobileTypography.fontSize.base,
    color: mobileColors.text,
    paddingVertical: mobileSpacing.xs
  },
  clearButton: {
    fontSize: 20,
    color: mobileColors.textMuted,
    paddingHorizontal: mobileSpacing.sm
  },
  loader: {
    paddingVertical: mobileSpacing.md,
    alignItems: 'center'
  },
  section: {
    padding: mobileSpacing.md
  },
  sectionTitle: {
    fontSize: mobileTypography.fontSize.sm,
    fontWeight: '700',
    color: mobileColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: mobileSpacing.md
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: mobileSpacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: mobileColors.border
  },
  recentIcon: {
    fontSize: 18,
    marginRight: mobileSpacing.sm
  },
  recentText: {
    fontSize: mobileTypography.fontSize.base,
    color: mobileColors.text
  },
  results: {
    padding: mobileSpacing.md
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: mobileColors.surfaceSecondary,
    borderRadius: mobileBorderRadius.md,
    padding: mobileSpacing.md,
    marginBottom: mobileSpacing.sm,
    borderWidth: 1,
    borderColor: mobileColors.border
  },
  resultIcon: {
    fontSize: 24,
    marginRight: mobileSpacing.md
  },
  resultContent: {
    flex: 1
  },
  resultTitle: {
    fontSize: mobileTypography.fontSize.base,
    fontWeight: '600',
    color: mobileColors.text,
    marginBottom: 2
  },
  resultSubtitle: {
    fontSize: mobileTypography.fontSize.sm,
    color: mobileColors.textSecondary
  },
  resultArrow: {
    fontSize: 24,
    color: mobileColors.textMuted,
    fontWeight: '300'
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: mobileSpacing.xl
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: mobileSpacing.md
  },
  emptyTitle: {
    fontSize: mobileTypography.fontSize.lg,
    fontWeight: '600',
    color: mobileColors.text,
    marginBottom: mobileSpacing.xs
  },
  emptySubtitle: {
    fontSize: mobileTypography.fontSize.base,
    color: mobileColors.textSecondary,
    textAlign: 'center'
  }
});

export default SearchScreen;
