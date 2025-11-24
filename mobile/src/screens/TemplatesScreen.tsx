import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { mobileColors, mobileSpacing, mobileTypography, mobileBorderRadius } from '../../../shared/theme/mobile-theme';

type TemplatesScreenProps = NativeStackScreenProps<RootStackParamList, 'Templates'> & {
  token: string;
};

type Template = {
  id: string;
  name: string;
  description: string;
  language: string;
  category: string;
  downloads: number;
  icon: string;
};

const TemplatesScreen: React.FC<TemplatesScreenProps> = ({ navigation, token }) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = ['all', 'web', 'mobile', 'api', 'ml', 'game'];

  useEffect(() => {
    fetchTemplates();
  }, [selectedCategory]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const mockTemplates: Template[] = [
        {
          id: '1',
          name: 'React Starter',
          description: 'Basic React app with TypeScript',
          language: 'TypeScript',
          category: 'web',
          downloads: 15420,
          icon: '⚛️'
        },
        {
          id: '2',
          name: 'Express API',
          description: 'RESTful API with Express.js',
          language: 'JavaScript',
          category: 'api',
          downloads: 8750,
          icon: '🚀'
        },
        {
          id: '3',
          name: 'React Native App',
          description: 'Mobile app template',
          language: 'TypeScript',
          category: 'mobile',
          downloads: 6200,
          icon: '📱'
        },
        {
          id: '4',
          name: 'Python ML',
          description: 'Machine Learning starter',
          language: 'Python',
          category: 'ml',
          downloads: 4580,
          icon: '🤖'
        }
      ];

      const filtered =
        selectedCategory === 'all'
          ? mockTemplates
          : mockTemplates.filter(t => t.category === selectedCategory);

      setTemplates(filtered);
    } finally {
      setLoading(false);
    }
  };

  const handleUseTemplate = useCallback((template: Template) => {
    Alert.alert(
      'Use Template',
      `Create a new project from "${template.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Create',
          onPress: () => {
            Alert.alert('Success', 'Project created from template!');
          }
        }
      ]
    );
  }, []);

  const renderCategory = useCallback(
    (category: string) => (
      <TouchableOpacity
        key={category}
        style={[
          styles.categoryChip,
          selectedCategory === category && styles.categoryChipActive
        ]}
        onPress={() => setSelectedCategory(category)}
      >
        <Text
          style={[
            styles.categoryText,
            selectedCategory === category && styles.categoryTextActive
          ]}
        >
          {category}
        </Text>
      </TouchableOpacity>
    ),
    [selectedCategory]
  );

  const renderTemplate = useCallback(
    ({ item }: { item: Template }) => (
      <TouchableOpacity
        style={styles.templateItem}
        onPress={() => handleUseTemplate(item)}
      >
        <Text style={styles.templateIcon}>{item.icon}</Text>
        <View style={styles.templateInfo}>
          <View style={styles.templateHeader}>
            <Text style={styles.templateName}>{item.name}</Text>
            <View style={styles.languageBadge}>
              <Text style={styles.languageText}>{item.language}</Text>
            </View>
          </View>
          <Text style={styles.templateDescription}>{item.description}</Text>
          <Text style={styles.templateDownloads}>
            ⬇ {item.downloads.toLocaleString()} downloads
          </Text>
        </View>
      </TouchableOpacity>
    ),
    [handleUseTemplate]
  );

  return (
    <View style={styles.container}>
      <View style={styles.categoriesBar}>
        <FlatList
          horizontal
          data={categories}
          keyExtractor={(item) => item}
          renderItem={({ item }) => renderCategory(item)}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesList}
        />
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={mobileColors.primary.default} />
        </View>
      ) : (
        <FlatList
          data={templates}
          keyExtractor={(item) => item.id}
          renderItem={renderTemplate}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: mobileColors.background.primary
  },
  categoriesBar: {
    paddingVertical: mobileSpacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: mobileColors.border.default,
    backgroundColor: mobileColors.background.secondary
  },
  categoriesList: {
    paddingHorizontal: mobileSpacing.md,
    gap: mobileSpacing.sm
  },
  categoryChip: {
    paddingHorizontal: mobileSpacing.md,
    paddingVertical: mobileSpacing.sm,
    borderRadius: mobileBorderRadius.full,
    backgroundColor: mobileColors.background.primary,
    borderWidth: 1,
    borderColor: mobileColors.border.default
  },
  categoryChipActive: {
    backgroundColor: mobileColors.primary.default,
    borderColor: mobileColors.primary.default
  },
  categoryText: {
    fontSize: mobileTypography.fontSize.sm,
    fontWeight: '600',
    color: mobileColors.text.primary,
    textTransform: 'capitalize'
  },
  categoryTextActive: {
    color: '#fff'
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  list: {
    padding: mobileSpacing.md
  },
  templateItem: {
    flexDirection: 'row',
    backgroundColor: mobileColors.background.secondary,
    borderRadius: mobileBorderRadius.lg,
    padding: mobileSpacing.md,
    marginBottom: mobileSpacing.sm,
    borderWidth: 1,
    borderColor: mobileColors.border.default
  },
  templateIcon: {
    fontSize: 48,
    marginRight: mobileSpacing.md
  },
  templateInfo: {
    flex: 1
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  templateName: {
    fontSize: mobileTypography.fontSize.base,
    fontWeight: '600',
    color: mobileColors.text.primary,
    flex: 1
  },
  languageBadge: {
    paddingHorizontal: mobileSpacing.sm,
    paddingVertical: 2,
    backgroundColor: mobileColors.primary.default + '20',
    borderRadius: mobileBorderRadius.full
  },
  languageText: {
    fontSize: mobileTypography.fontSize.xs,
    fontWeight: '600',
    color: mobileColors.primary.default
  },
  templateDescription: {
    fontSize: mobileTypography.fontSize.sm,
    color: mobileColors.text.secondary,
    marginBottom: 4
  },
  templateDownloads: {
    fontSize: mobileTypography.fontSize.xs,
    color: mobileColors.text.tertiary
  }
});

export default TemplatesScreen;
