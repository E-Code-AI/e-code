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
import { mobileColors, mobileSpacing, mobileTypography, mobileBorderRadius } from '../../../shared/theme/mobile-theme';
import { searchAll, SearchResult } from '../services/api';
import { StorageService } from '../services/storage';

type SearchScreenProps = NativeStackScreenProps<RootStackParamList, 'Search'>;

const RECENT_SEARCHES_KEY = 'recent_searches';
const MAX_RECENT_SEARCHES = 10;

const SearchScreen: React.FC<SearchScreenProps> = ({ navigation, route }) => {
  const { token } = route.params;
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isLoadingRecent, setIsLoadingRecent] = useState(true);

  useEffect(() => {
    loadRecentSearches();
  }, []);

  const loadRecentSearches = async () => {
    try {
      const saved = await StorageService.get<string[]>(RECENT_SEARCHES_KEY);
      if (saved && Array.isArray(saved)) {
        setRecentSearches(saved);
      }
    } catch (error) {
      console.error('Failed to load recent searches:', error);
    } finally {
      setIsLoadingRecent(false);
    }
  };

  const saveRecentSearch = async (searchQuery: string) => {
    try {
      const updatedSearches = [
        searchQuery,
        ...recentSearches.filter(s => s.toLowerCase() !== searchQuery.toLowerCase())
      ].slice(0, MAX_RECENT_SEARCHES);
      
      setRecentSearches(updatedSearches);
      await StorageService.set(RECENT_SEARCHES_KEY, updatedSearches);
    } catch (error) {
      console.error('Failed to save recent search:', error);
    }
  };

  const clearRecentSearches = async () => {
    try {
      setRecentSearches([]);
      await StorageService.remove(RECENT_SEARCHES_KEY);
    } catch (error) {
      console.error('Failed to clear recent searches:', error);
    }
  };

  const handleSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const searchResults = await searchAll(searchQuery, token);
      setResults(searchResults);
      if (searchResults.length > 0) {
        saveRecentSearch(searchQuery.trim());
      }
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [token, recentSearches]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      handleSearch(query);
    }, 300);

    return () => clearTimeout(timeout);
  }, [query, handleSearch]);

  const handleResultPress = useCallback((result: SearchResult) => {
    if (result.type === 'project') {
      navigation.navigate('Project', { projectId: parseInt(result.id), projectName: result.title, token });
    }
  }, [navigation, token]);

  const handleRecentSearch = useCallback((search: string) => {
    setQuery(search);
  }, []);

  const removeRecentSearch = useCallback(async (searchToRemove: string) => {
    try {
      const updatedSearches = recentSearches.filter(s => s !== searchToRemove);
      setRecentSearches(updatedSearches);
      await StorageService.set(RECENT_SEARCHES_KEY, updatedSearches);
    } catch (error) {
      console.error('Failed to remove recent search:', error);
    }
  }, [recentSearches]);

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

      {!query && recentSearches.length > 0 && !isLoadingRecent && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Searches</Text>
            <TouchableOpacity onPress={clearRecentSearches}>
              <Text style={styles.clearAllText}>Clear All</Text>
            </TouchableOpacity>
          </View>
          {recentSearches.map((search, index) => (
            <TouchableOpacity
              key={index}
              style={styles.recentItem}
              onPress={() => handleRecentSearch(search)}
            >
              <Text style={styles.recentIcon}>🕐</Text>
              <Text style={styles.recentText}>{search}</Text>
              <TouchableOpacity 
                onPress={() => removeRecentSearch(search)}
                style={styles.removeRecentButton}
              >
                <Text style={styles.removeRecentText}>✕</Text>
              </TouchableOpacity>
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: mobileSpacing.md
  },
  sectionTitle: {
    fontSize: mobileTypography.fontSize.sm,
    fontWeight: '700',
    color: mobileColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  clearAllText: {
    fontSize: mobileTypography.fontSize.sm,
    color: mobileColors.primary,
    fontWeight: '600'
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
    flex: 1,
    fontSize: mobileTypography.fontSize.base,
    color: mobileColors.text
  },
  removeRecentButton: {
    padding: mobileSpacing.xs
  },
  removeRecentText: {
    fontSize: 16,
    color: mobileColors.textMuted
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
