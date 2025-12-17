import { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { AI_PROVIDERS, AIProvider, getModelDisplayName, getProviderConfig, getProviderForModel, type AIProviderConfig } from '../services/ai-provider';
import { StorageService } from '../services/storage';
import { AIModel } from '../../../shared/mobile-types';
import { mobileColors, mobileSpacing, mobileTypography, mobileBorderRadius } from '../../../shared/theme/mobile-theme';

const STORAGE_KEY_MODEL = 'selected_ai_model';
const STORAGE_KEY_PROVIDER = 'selected_ai_provider';
const DEFAULT_MODEL: AIModel = 'gpt-4o-mini';

export interface ModelSelectorProps {
  onModelChange?: (model: AIModel, provider: AIProvider) => void;
  compact?: boolean;
}

export function ModelSelector({ onModelChange, compact = false }: ModelSelectorProps) {
  const [selectedModel, setSelectedModel] = useState<AIModel>(DEFAULT_MODEL);
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>('openai');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSavedSelection();
  }, []);

  const loadSavedSelection = async () => {
    try {
      const savedModel = await StorageService.get<AIModel>(STORAGE_KEY_MODEL);
      const savedProvider = await StorageService.get<AIProvider>(STORAGE_KEY_PROVIDER);
      
      if (savedModel && savedProvider) {
        setSelectedModel(savedModel);
        setSelectedProvider(savedProvider);
      } else if (savedModel) {
        const provider = getProviderForModel(savedModel);
        if (provider) {
          setSelectedModel(savedModel);
          setSelectedProvider(provider);
        }
      }
    } catch (error) {
      console.error('Failed to load saved model selection:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectModel = useCallback(async (model: AIModel, provider: AIProvider) => {
    setSelectedModel(model);
    setSelectedProvider(provider);
    setIsModalVisible(false);
    
    await StorageService.set(STORAGE_KEY_MODEL, model);
    await StorageService.set(STORAGE_KEY_PROVIDER, provider);
    
    onModelChange?.(model, provider);
  }, [onModelChange]);

  const providerConfig = getProviderConfig(selectedProvider);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>...</Text>
      </View>
    );
  }

  return (
    <>
      <TouchableOpacity
        style={[styles.selectorButton, compact && styles.selectorButtonCompact]}
        onPress={() => setIsModalVisible(true)}
        accessibilityLabel="Select AI model"
        accessibilityHint="Opens model selection modal"
      >
        <Text style={styles.providerIcon}>{providerConfig?.icon || '🤖'}</Text>
        {!compact && (
          <View style={styles.selectorTextContainer}>
            <Text style={styles.modelName} numberOfLines={1}>
              {getModelDisplayName(selectedModel)}
            </Text>
            <Text style={styles.providerName} numberOfLines={1}>
              {providerConfig?.name || 'Unknown'}
            </Text>
          </View>
        )}
        <Text style={styles.chevron}>▼</Text>
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setIsModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select AI Model</Text>
              <TouchableOpacity 
                onPress={() => setIsModalVisible(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.providerList}>
              {AI_PROVIDERS.map((provider) => (
                <ProviderSection
                  key={provider.id}
                  provider={provider}
                  selectedModel={selectedModel}
                  onSelectModel={(model) => handleSelectModel(model, provider.id)}
                />
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

interface ProviderSectionProps {
  provider: AIProviderConfig;
  selectedModel: AIModel;
  onSelectModel: (model: AIModel) => void;
}

function ProviderSection({ provider, selectedModel, onSelectModel }: ProviderSectionProps) {
  return (
    <View style={styles.providerSection}>
      <View style={[styles.providerHeader, { borderLeftColor: provider.color }]}>
        <Text style={styles.providerHeaderIcon}>{provider.icon}</Text>
        <Text style={styles.providerHeaderName}>{provider.name}</Text>
      </View>
      
      {provider.models.map((model) => (
        <TouchableOpacity
          key={model}
          style={[
            styles.modelItem,
            selectedModel === model && styles.modelItemSelected,
          ]}
          onPress={() => onSelectModel(model)}
        >
          <Text style={[
            styles.modelItemText,
            selectedModel === model && styles.modelItemTextSelected,
          ]}>
            {getModelDisplayName(model)}
          </Text>
          {selectedModel === model && (
            <Text style={styles.checkmark}>✓</Text>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

export function useModelSelection() {
  const [model, setModel] = useState<AIModel>(DEFAULT_MODEL);
  const [provider, setProvider] = useState<AIProvider>('openai');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadSelection();
  }, []);

  const loadSelection = async () => {
    try {
      const savedModel = await StorageService.get<AIModel>(STORAGE_KEY_MODEL);
      const savedProvider = await StorageService.get<AIProvider>(STORAGE_KEY_PROVIDER);
      
      if (savedModel) {
        setModel(savedModel);
        const detectedProvider = savedProvider || getProviderForModel(savedModel);
        if (detectedProvider) {
          setProvider(detectedProvider);
        }
      }
    } catch (error) {
      console.error('Failed to load model selection:', error);
    } finally {
      setIsLoaded(true);
    }
  };

  const updateSelection = useCallback((newModel: AIModel, newProvider: AIProvider) => {
    setModel(newModel);
    setProvider(newProvider);
  }, []);

  return { model, provider, isLoaded, updateSelection };
}

const styles = StyleSheet.create({
  loadingContainer: {
    paddingHorizontal: mobileSpacing.md,
    paddingVertical: mobileSpacing.sm,
  },
  loadingText: {
    color: mobileColors.textMuted,
    fontSize: mobileTypography.fontSize.sm,
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: mobileColors.surface,
    paddingHorizontal: mobileSpacing.md,
    paddingVertical: mobileSpacing.sm,
    borderRadius: mobileBorderRadius.md,
    borderWidth: 1,
    borderColor: mobileColors.border,
    gap: mobileSpacing.sm,
  },
  selectorButtonCompact: {
    paddingHorizontal: mobileSpacing.sm,
    paddingVertical: mobileSpacing.xs,
  },
  providerIcon: {
    fontSize: mobileTypography.fontSize.lg,
  },
  selectorTextContainer: {
    flex: 1,
  },
  modelName: {
    fontSize: mobileTypography.fontSize.sm,
    fontWeight: mobileTypography.fontWeight.semibold as any,
    color: mobileColors.text,
  },
  providerName: {
    fontSize: mobileTypography.fontSize.xs,
    color: mobileColors.textMuted,
  },
  chevron: {
    fontSize: mobileTypography.fontSize.xs,
    color: mobileColors.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: mobileColors.background,
    borderTopLeftRadius: mobileBorderRadius.xl,
    borderTopRightRadius: mobileBorderRadius.xl,
    maxHeight: '80%',
    paddingBottom: mobileSpacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: mobileSpacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: mobileColors.border,
  },
  modalTitle: {
    fontSize: mobileTypography.fontSize.xl,
    fontWeight: mobileTypography.fontWeight.bold as any,
    color: mobileColors.text,
  },
  closeButton: {
    padding: mobileSpacing.sm,
  },
  closeButtonText: {
    fontSize: mobileTypography.fontSize.lg,
    color: mobileColors.textMuted,
  },
  providerList: {
    flex: 1,
  },
  providerSection: {
    marginTop: mobileSpacing.md,
  },
  providerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: mobileSpacing.lg,
    paddingVertical: mobileSpacing.sm,
    backgroundColor: mobileColors.surfaceSecondary,
    borderLeftWidth: 4,
    gap: mobileSpacing.sm,
  },
  providerHeaderIcon: {
    fontSize: mobileTypography.fontSize.lg,
  },
  providerHeaderName: {
    fontSize: mobileTypography.fontSize.base,
    fontWeight: mobileTypography.fontWeight.semibold as any,
    color: mobileColors.text,
  },
  modelItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: mobileSpacing.lg,
    paddingLeft: mobileSpacing.xl + mobileSpacing.lg,
    paddingVertical: mobileSpacing.md,
    borderBottomWidth: 1,
    borderBottomColor: mobileColors.border,
  },
  modelItemSelected: {
    backgroundColor: mobileColors.primary + '20',
  },
  modelItemText: {
    fontSize: mobileTypography.fontSize.base,
    color: mobileColors.text,
  },
  modelItemTextSelected: {
    color: mobileColors.primary,
    fontWeight: mobileTypography.fontWeight.semibold as any,
  },
  checkmark: {
    fontSize: mobileTypography.fontSize.lg,
    color: mobileColors.primary,
  },
});

export default ModelSelector;
