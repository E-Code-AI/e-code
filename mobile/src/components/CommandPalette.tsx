import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  Keyboard,
  Platform,
} from 'react-native';
import { Command, CommandCategory, categoryLabels, categoryIcons } from '../services/command-registry';

interface CommandPaletteProps {
  visible: boolean;
  onClose: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  recentCommands: Command[];
  commandsByCategory: Record<CommandCategory, Command[]>;
  onExecuteCommand: (commandId: string) => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const CommandItem: React.FC<{
  command: Command;
  onPress: () => void;
  isSelected: boolean;
}> = React.memo(({ command, onPress, isSelected }) => (
  <TouchableOpacity
    style={[styles.commandItem, isSelected && styles.commandItemSelected]}
    onPress={onPress}
    activeOpacity={0.7}
    testID={`command-item-${command.id}`}
  >
    <Text style={styles.commandIcon}>{command.icon}</Text>
    <View style={styles.commandContent}>
      <Text style={styles.commandLabel}>{command.label}</Text>
      {command.description && (
        <Text style={styles.commandDescription}>{command.description}</Text>
      )}
    </View>
    {command.shortcutHint && (
      <View style={styles.shortcutBadge}>
        <Text style={styles.shortcutText}>{command.shortcutHint}</Text>
      </View>
    )}
  </TouchableOpacity>
));

const CategorySection: React.FC<{
  category: CommandCategory;
  commands: Command[];
  onExecuteCommand: (commandId: string) => void;
  selectedId?: string;
}> = React.memo(({ category, commands, onExecuteCommand, selectedId }) => {
  if (commands.length === 0) return null;

  return (
    <View style={styles.categorySection}>
      <View style={styles.categoryHeader}>
        <Text style={styles.categoryIcon}>{categoryIcons[category]}</Text>
        <Text style={styles.categoryLabel}>{categoryLabels[category]}</Text>
      </View>
      {commands.map((command) => (
        <CommandItem
          key={command.id}
          command={command}
          onPress={() => onExecuteCommand(command.id)}
          isSelected={command.id === selectedId}
        />
      ))}
    </View>
  );
});

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  visible,
  onClose,
  searchQuery,
  onSearchChange,
  recentCommands,
  commandsByCategory,
  onExecuteCommand,
}) => {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const allCommands = [
    ...commandsByCategory.files,
    ...commandsByCategory.actions,
    ...commandsByCategory.navigation,
    ...commandsByCategory.ai,
  ];

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        inputRef.current?.focus();
      });
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, fadeAnim]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  const handleClose = useCallback(() => {
    Keyboard.dismiss();
    onClose();
  }, [onClose]);

  const handleExecute = useCallback((commandId: string) => {
    Keyboard.dismiss();
    onExecuteCommand(commandId);
  }, [onExecuteCommand]);

  const hasResults = allCommands.length > 0 || recentCommands.length > 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.container,
                { transform: [{ translateY: slideAnim }] },
              ]}
            >
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.searchContainer}>
                  <Text style={styles.searchIcon}>🔍</Text>
                  <TextInput
                    ref={inputRef}
                    style={styles.searchInput}
                    placeholder="Search commands..."
                    placeholderTextColor="#64748b"
                    value={searchQuery}
                    onChangeText={onSearchChange}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="go"
                    testID="input-command-search"
                    onSubmitEditing={() => {
                      if (allCommands[selectedIndex]) {
                        handleExecute(allCommands[selectedIndex].id);
                      }
                    }}
                  />
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={handleClose}
                    testID="button-close-palette"
                  >
                    <Text style={styles.closeButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.hintContainer}>
                  <Text style={styles.hintText}>
                    Three-finger tap or shake to toggle
                  </Text>
                </View>
              </View>

              {/* Content */}
              <View style={styles.content}>
                {!hasResults ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyIcon}>🔎</Text>
                    <Text style={styles.emptyText}>No commands found</Text>
                    <Text style={styles.emptySubtext}>Try a different search term</Text>
                  </View>
                ) : (
                  <FlatList
                    data={[]}
                    renderItem={() => null}
                    ListHeaderComponent={
                      <>
                        {/* Recent commands */}
                        {recentCommands.length > 0 && !searchQuery && (
                          <View style={styles.categorySection}>
                            <View style={styles.categoryHeader}>
                              <Text style={styles.categoryIcon}>🕐</Text>
                              <Text style={styles.categoryLabel}>Recent</Text>
                            </View>
                            {recentCommands.map((command) => (
                              <CommandItem
                                key={`recent-${command.id}`}
                                command={command}
                                onPress={() => handleExecute(command.id)}
                                isSelected={false}
                              />
                            ))}
                          </View>
                        )}

                        {/* Categorized commands */}
                        {(['files', 'actions', 'navigation', 'ai'] as CommandCategory[]).map(
                          (category) => (
                            <CategorySection
                              key={category}
                              category={category}
                              commands={commandsByCategory[category]}
                              onExecuteCommand={handleExecute}
                            />
                          )
                        )}
                      </>
                    }
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.listContent}
                  />
                )}
              </View>

              {/* Footer hint */}
              <View style={styles.footer}>
                <View style={styles.footerHint}>
                  <Text style={styles.footerHintIcon}>⌨️</Text>
                  <Text style={styles.footerHintText}>
                    Type to search • Tap to select
                  </Text>
                </View>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.85,
    minHeight: SCREEN_HEIGHT * 0.5,
  },
  header: {
    paddingTop: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#e2e8f0',
    paddingVertical: 8,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: '600',
  },
  hintContainer: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  hintText: {
    color: '#64748b',
    fontSize: 12,
  },
  content: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 8,
  },
  categorySection: {
    marginBottom: 8,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  categoryIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  commandItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 8,
    borderRadius: 8,
  },
  commandItemSelected: {
    backgroundColor: '#1e293b',
  },
  commandIcon: {
    fontSize: 20,
    marginRight: 12,
    width: 28,
    textAlign: 'center',
  },
  commandContent: {
    flex: 1,
  },
  commandLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#e2e8f0',
  },
  commandDescription: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  shortcutBadge: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  shortcutText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748b',
  },
  footer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  footerHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerHintIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  footerHintText: {
    fontSize: 12,
    color: '#64748b',
  },
});

export default CommandPalette;
