import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { mobileColors, mobileSpacing, mobileTypography, mobileBorderRadius } from '../../../shared/theme/mobile-theme';
import { getTemplates, createProjectFromTemplate, Template } from '../services/api';

type TemplatesScreenProps = NativeStackScreenProps<RootStackParamList, 'Templates'>;

const TemplatesScreen: React.FC<TemplatesScreenProps> = ({ navigation, route }) => {
  const { token } = route.params;
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = ['all', 'web', 'mobile', 'api', 'ml', 'game'];

  useEffect(() => {
    fetchTemplates();
  }, [selectedCategory]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const data = await getTemplates(selectedCategory, token);
      setTemplates(data);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleUseTemplate = useCallback((template: Template) => {
    Alert.prompt(
      'Create Project',
      `Enter a name for your new project from "${template.name}":`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Create',
          onPress: async (projectName?: string) => {
            if (!projectName?.trim()) {
              Alert.alert('Error', 'Please enter a project name');
              return;
            }
            setCreating(true);
            try {
              await createProjectFromTemplate(template.id, projectName.trim(), token);
              Alert.alert('Success', `Project "${projectName}" created from template!`);
            } catch (error) {
              Alert.alert('Error', error instanceof Error ? error.message : 'Failed to create project');
            } finally {
              setCreating(false);
            }
          }
        }
      ],
      'plain-text',
      template.name
    );
  }, [token]);

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
          <ActivityIndicator size="large" color={mobileColors.primary} />
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
    backgroundColor: mobileColors.background
  },
  categoriesBar: {
    paddingVertical: mobileSpacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: mobileColors.border,
    backgroundColor: mobileColors.surfaceSecondary
  },
  categoriesList: {
    paddingHorizontal: mobileSpacing.md,
    gap: mobileSpacing.sm
  },
  categoryChip: {
    paddingHorizontal: mobileSpacing.md,
    paddingVertical: mobileSpacing.sm,
    borderRadius: mobileBorderRadius.full,
    backgroundColor: mobileColors.background,
    borderWidth: 1,
    borderColor: mobileColors.border
  },
  categoryChipActive: {
    backgroundColor: mobileColors.primary,
    borderColor: mobileColors.primary
  },
  categoryText: {
    fontSize: mobileTypography.fontSize.sm,
    fontWeight: '600',
    color: mobileColors.text,
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
    backgroundColor: mobileColors.surfaceSecondary,
    borderRadius: mobileBorderRadius.lg,
    padding: mobileSpacing.md,
    marginBottom: mobileSpacing.sm,
    borderWidth: 1,
    borderColor: mobileColors.border
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
    color: mobileColors.text,
    flex: 1
  },
  languageBadge: {
    paddingHorizontal: mobileSpacing.sm,
    paddingVertical: 2,
    backgroundColor: mobileColors.primary + '20',
    borderRadius: mobileBorderRadius.full
  },
  languageText: {
    fontSize: mobileTypography.fontSize.xs,
    fontWeight: '600',
    color: mobileColors.primary
  },
  templateDescription: {
    fontSize: mobileTypography.fontSize.sm,
    color: mobileColors.textSecondary,
    marginBottom: 4
  },
  templateDownloads: {
    fontSize: mobileTypography.fontSize.xs,
    color: mobileColors.textMuted
  }
});

export default TemplatesScreen;
