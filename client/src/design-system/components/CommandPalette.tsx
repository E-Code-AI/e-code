/**
 * Command Palette
 * Cmd+K style command palette with fuzzy search
 */

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDesignSystem } from '../hooks/useDesignSystem';
import { triggerHaptic } from '../hooks/useGestures';

// ============================================================================
// TYPES
// ============================================================================

export interface Command {
  id: string;
  label: string;
  description?: string;
  icon?: string | React.ReactNode;
  keywords?: string[];
  category?: string;
  shortcut?: string;
  onExecute: () => void | Promise<void>;
}

export interface CommandPaletteProps {
  commands: Command[];
  placeholder?: string;
  onClose?: () => void;
}

// ============================================================================
// FUZZY SEARCH
// ============================================================================

const fuzzyMatch = (text: string, query: string): boolean => {
  const textLower = text.toLowerCase();
  const queryLower = query.toLowerCase();

  let queryIndex = 0;
  for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIndex]) {
      queryIndex++;
    }
  }

  return queryIndex === queryLower.length;
};

const fuzzyScore = (text: string, query: string): number => {
  const textLower = text.toLowerCase();
  const queryLower = query.toLowerCase();

  if (!fuzzyMatch(textLower, queryLower)) return 0;
  if (textLower === queryLower) return 1000;
  if (textLower.startsWith(queryLower)) return 900;

  let score = 0;
  let queryIndex = 0;
  let consecutiveMatches = 0;

  for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIndex]) {
      score += 100 + consecutiveMatches * 10;
      consecutiveMatches++;
      queryIndex++;
    } else {
      consecutiveMatches = 0;
    }
  }

  return score;
};

// ============================================================================
// COMMAND PALETTE COMPONENT
// ============================================================================

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  commands,
  placeholder = 'Type a command or search...',
  onClose,
}) => {
  const ds = useDesignSystem();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedRef = useRef<HTMLDivElement>(null);

  // Filter and sort commands
  const filteredCommands = useMemo(() => {
    if (!query.trim()) {
      return commands;
    }

    return commands
      .map((cmd) => {
        const labelScore = fuzzyScore(cmd.label, query);
        const descScore = cmd.description ? fuzzyScore(cmd.description, query) : 0;
        const keywordsScore = cmd.keywords
          ? Math.max(...cmd.keywords.map((k) => fuzzyScore(k, query)))
          : 0;
        const categoryScore = cmd.category ? fuzzyScore(cmd.category, query) : 0;

        const totalScore = Math.max(labelScore, descScore, keywordsScore, categoryScore);

        return { ...cmd, score: totalScore };
      })
      .filter((cmd) => cmd.score > 0)
      .sort((a, b) => b.score - a.score);
  }, [commands, query]);

  // Group by category
  const groupedCommands = useMemo(() => {
    const groups = new Map<string, Command[]>();

    filteredCommands.forEach((cmd) => {
      const category = cmd.category || 'Other';
      if (!groups.has(category)) {
        groups.set(category, []);
      }
      groups.get(category)!.push(cmd);
    });

    return Array.from(groups.entries());
  }, [filteredCommands]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          triggerHaptic('selection');
          setSelectedIndex((prev) =>
            prev < filteredCommands.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          triggerHaptic('selection');
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            handleExecute(filteredCommands[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          handleClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [filteredCommands, selectedIndex]);

  // Scroll selected into view
  useEffect(() => {
    selectedRef.current?.scrollIntoView({
      block: 'nearest',
      behavior: 'smooth',
    });
  }, [selectedIndex]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleExecute = useCallback(
    async (command: Command) => {
      triggerHaptic('medium');
      await command.onExecute();
      handleClose();
    },
    []
  );

  const handleClose = useCallback(() => {
    triggerHaptic('selection');
    onClose?.();
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onClick={handleClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: ds.zIndex.commandPalette,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '15vh',
        padding: ds.spacing[5],
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -20 }}
        transition={{
          type: 'spring',
          stiffness: 400,
          damping: 30,
        }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '640px',
          backgroundColor: ds.colors.background.elevated,
          borderRadius: ds.borderRadius.xl,
          boxShadow: ds.shadows.xl,
          overflow: 'hidden',
          backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          border: ds.isDark
            ? `0.5px solid ${ds.colors.separator.opaque}`
            : 'none',
        }}
      >
        {/* Search Input */}
        <div
          style={{
            padding: ds.spacing[5],
            borderBottom: `1px solid ${ds.colors.separator.nonOpaque}`,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: ds.spacing[4],
            }}
          >
            <span style={{ fontSize: '20px', opacity: 0.6 }}>🔍</span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              style={{
                ...ds.typography.textStyles.body,
                flex: 1,
                border: 'none',
                outline: 'none',
                backgroundColor: 'transparent',
                color: ds.colors.text.primary,
              }}
            />
            <kbd
              style={{
                ...ds.typography.textStyles.caption1,
                padding: `${ds.spacing[1]} ${ds.spacing[2]}`,
                backgroundColor: ds.colors.fill.tertiary,
                borderRadius: ds.borderRadius.sm,
                color: ds.colors.text.secondary,
              }}
            >
              ESC
            </kbd>
          </div>
        </div>

        {/* Results */}
        <div
          style={{
            maxHeight: '60vh',
            overflowY: 'auto',
            overflowX: 'hidden',
          }}
        >
          {filteredCommands.length === 0 ? (
            <div
              style={{
                padding: ds.spacing[10],
                textAlign: 'center',
                color: ds.colors.text.secondary,
              }}
            >
              <div style={{ fontSize: '48px', marginBottom: ds.spacing[4] }}>
                🔍
              </div>
              <div style={{ ...ds.typography.textStyles.callout }}>
                No commands found
              </div>
            </div>
          ) : (
            <>
              {groupedCommands.map(([category, cmds], categoryIndex) => {
                let globalIndex = 0;
                for (let i = 0; i < categoryIndex; i++) {
                  globalIndex += groupedCommands[i][1].length;
                }

                return (
                  <div key={category}>
                    {/* Category Header */}
                    {query.trim() === '' && (
                      <div
                        style={{
                          ...ds.typography.textStyles.caption1,
                          fontWeight: 600,
                          color: ds.colors.text.tertiary,
                          padding: `${ds.spacing[4]} ${ds.spacing[5]}`,
                          paddingBottom: ds.spacing[2],
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                        }}
                      >
                        {category}
                      </div>
                    )}

                    {/* Commands */}
                    {cmds.map((cmd, cmdIndex) => {
                      const index = globalIndex + cmdIndex;
                      const isSelected = index === selectedIndex;

                      return (
                        <CommandItem
                          key={cmd.id}
                          command={cmd}
                          isSelected={isSelected}
                          ref={isSelected ? selectedRef : null}
                          onClick={() => handleExecute(cmd)}
                          query={query}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: ds.spacing[4],
            borderTop: `1px solid ${ds.colors.separator.nonOpaque}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: ds.spacing[4],
          }}
        >
          <div
            style={{
              ...ds.typography.textStyles.caption1,
              color: ds.colors.text.tertiary,
              display: 'flex',
              alignItems: 'center',
              gap: ds.spacing[3],
            }}
          >
            <Kbd>↑↓</Kbd> Navigate
            <Kbd>⏎</Kbd> Execute
            <Kbd>ESC</Kbd> Close
          </div>
          <div
            style={{
              ...ds.typography.textStyles.caption1,
              color: ds.colors.text.tertiary,
            }}
          >
            {filteredCommands.length} command{filteredCommands.length !== 1 ? 's' : ''}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ============================================================================
// COMMAND ITEM
// ============================================================================

interface CommandItemProps {
  command: Command;
  isSelected: boolean;
  onClick: () => void;
  query: string;
}

const CommandItem = React.forwardRef<HTMLDivElement, CommandItemProps>(
  ({ command, isSelected, onClick, query }, ref) => {
    const ds = useDesignSystem();

    const highlightMatch = (text: string) => {
      if (!query.trim()) return text;

      const parts: React.ReactNode[] = [];
      let lastIndex = 0;
      const queryLower = query.toLowerCase();
      const textLower = text.toLowerCase();

      for (let i = 0; i < textLower.length; i++) {
        if (textLower[i] === queryLower[0]) {
          let match = true;
          let queryIdx = 0;
          let matchEnd = i;

          for (let j = i; j < textLower.length && queryIdx < queryLower.length; j++) {
            if (textLower[j] === queryLower[queryIdx]) {
              queryIdx++;
              matchEnd = j;
            }
          }

          if (queryIdx === queryLower.length) {
            if (i > lastIndex) {
              parts.push(text.substring(lastIndex, i));
            }
            parts.push(
              <mark
                key={i}
                style={{
                  backgroundColor: ds.colors.interactive.primary,
                  color: '#FFFFFF',
                  borderRadius: '2px',
                  padding: '0 2px',
                }}
              >
                {text.substring(i, matchEnd + 1)}
              </mark>
            );
            lastIndex = matchEnd + 1;
            i = matchEnd;
          }
        }
      }

      if (lastIndex < text.length) {
        parts.push(text.substring(lastIndex));
      }

      return parts.length > 1 ? <>{parts}</> : text;
    };

    return (
      <motion.div
        ref={ref}
        onClick={onClick}
        onMouseEnter={() => triggerHaptic('selection')}
        whileTap={{ scale: 0.98 }}
        style={{
          padding: `${ds.spacing[4]} ${ds.spacing[5]}`,
          backgroundColor: isSelected
            ? ds.colors.fill.secondary
            : 'transparent',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: ds.spacing[4],
          transition: 'background-color 0.15s ease',
        }}
      >
        {/* Icon */}
        {command.icon && (
          <div
            style={{
              fontSize: '20px',
              width: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: ds.colors.text.secondary,
            }}
          >
            {typeof command.icon === 'string' ? command.icon : command.icon}
          </div>
        )}

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              ...ds.typography.textStyles.callout,
              color: ds.colors.text.primary,
              marginBottom: command.description ? ds.spacing[1] : 0,
            }}
          >
            {highlightMatch(command.label)}
          </div>
          {command.description && (
            <div
              style={{
                ...ds.typography.textStyles.caption1,
                color: ds.colors.text.secondary,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {command.description}
            </div>
          )}
        </div>

        {/* Shortcut */}
        {command.shortcut && (
          <Kbd>{command.shortcut}</Kbd>
        )}
      </motion.div>
    );
  }
);

// ============================================================================
// KBD COMPONENT
// ============================================================================

const Kbd: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const ds = useDesignSystem();

  return (
    <kbd
      style={{
        ...ds.typography.textStyles.caption1,
        fontFamily: ds.typography.fontFamily.mono,
        padding: `${ds.spacing[1]} ${ds.spacing[2]}`,
        backgroundColor: ds.colors.fill.tertiary,
        borderRadius: ds.borderRadius.sm,
        color: ds.colors.text.secondary,
        border: `1px solid ${ds.colors.separator.nonOpaque}`,
        boxShadow: `0 1px 0 ${ds.colors.separator.nonOpaque}`,
      }}
    >
      {children}
    </kbd>
  );
};

// ============================================================================
// HOOK
// ============================================================================

export const useCommandPalette = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen((prev) => !prev),
  };
};

export default CommandPalette;
