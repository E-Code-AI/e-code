/**
 * IDE Provider
 * Global provider that wraps the mobile IDE with design system and features
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  ToastProvider,
  CommandPalette,
  useCommandPalette,
  KeyboardShortcuts,
  useKeyboardShortcuts,
  Settings,
  defaultIDEShortcuts,
  useDesignSystem,
  useToast,
  type Command,
  type SettingsSection,
  type Shortcut,
} from '@/design-system';

// ============================================================================
// TYPES
// ============================================================================

export interface IDEProviderProps {
  children: React.ReactNode;
  projectId?: string;
  onThemeChange?: (theme: 'light' | 'dark' | 'auto') => void;
}

// ============================================================================
// IDE PROVIDER INNER (has access to toast and hooks)
// ============================================================================

const IDEProviderInner: React.FC<IDEProviderProps> = ({
  children,
  projectId,
  onThemeChange,
}) => {
  const ds = useDesignSystem();
  const toast = useToast();
  const commandPalette = useCommandPalette();
  const keyboardShortcuts = useKeyboardShortcuts();

  const [showSettings, setShowSettings] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>(() => {
    if (typeof window === 'undefined') return 'auto';
    return (localStorage.getItem('ide-theme') as any) || 'auto';
  });

  const [shortcuts, setShortcuts] = useState<Shortcut[]>(() => {
    if (typeof window === 'undefined') return defaultIDEShortcuts;
    const saved = localStorage.getItem('ide-shortcuts');
    return saved ? JSON.parse(saved) : defaultIDEShortcuts;
  });

  // Save theme to localStorage
  useEffect(() => {
    localStorage.setItem('ide-theme', theme);
    onThemeChange?.(theme);
  }, [theme, onThemeChange]);

  // Save shortcuts to localStorage
  useEffect(() => {
    localStorage.setItem('ide-shortcuts', JSON.stringify(shortcuts));
  }, [shortcuts]);

  // Define IDE commands
  const ideCommands: Command[] = [
    // File operations
    {
      id: 'file:new',
      label: 'New File',
      description: 'Create a new file in the current directory',
      icon: '📄',
      category: 'File',
      shortcut: '⌘N',
      keywords: ['new', 'create', 'file'],
      onExecute: async () => {
        toast.info('File creation', 'Opening file creator...');
        // Emit custom event
        window.dispatchEvent(new CustomEvent('ide:new-file'));
      },
    },
    {
      id: 'file:save',
      label: 'Save File',
      description: 'Save the current file',
      icon: '💾',
      category: 'File',
      shortcut: '⌘S',
      keywords: ['save', 'write'],
      onExecute: async () => {
        window.dispatchEvent(new CustomEvent('ide:save-file'));
        toast.success('File saved');
      },
    },
    {
      id: 'file:save-all',
      label: 'Save All Files',
      description: 'Save all modified files',
      icon: '💾',
      category: 'File',
      shortcut: '⌘⇧S',
      keywords: ['save', 'all'],
      onExecute: async () => {
        window.dispatchEvent(new CustomEvent('ide:save-all'));
        toast.success('All files saved');
      },
    },

    // Editor
    {
      id: 'editor:find',
      label: 'Find',
      description: 'Search in current file',
      icon: '🔍',
      category: 'Editor',
      shortcut: '⌘F',
      keywords: ['find', 'search'],
      onExecute: async () => {
        window.dispatchEvent(new CustomEvent('ide:find'));
      },
    },
    {
      id: 'editor:replace',
      label: 'Replace',
      description: 'Search and replace in current file',
      icon: '🔄',
      category: 'Editor',
      shortcut: '⌘H',
      keywords: ['replace', 'find'],
      onExecute: async () => {
        window.dispatchEvent(new CustomEvent('ide:replace'));
      },
    },
    {
      id: 'editor:format',
      label: 'Format Document',
      description: 'Format the current file',
      icon: '✨',
      category: 'Editor',
      shortcut: '⌘⇧F',
      keywords: ['format', 'prettier', 'beautify'],
      onExecute: async () => {
        window.dispatchEvent(new CustomEvent('ide:format'));
        toast.success('Document formatted');
      },
    },

    // View
    {
      id: 'view:toggle-sidebar',
      label: 'Toggle Sidebar',
      description: 'Show or hide the file explorer sidebar',
      icon: '📁',
      category: 'View',
      shortcut: '⌘B',
      keywords: ['sidebar', 'toggle', 'files'],
      onExecute: async () => {
        window.dispatchEvent(new CustomEvent('ide:toggle-sidebar'));
      },
    },
    {
      id: 'view:toggle-terminal',
      label: 'Toggle Terminal',
      description: 'Show or hide the terminal panel',
      icon: '💻',
      category: 'View',
      shortcut: '⌘`',
      keywords: ['terminal', 'toggle', 'console'],
      onExecute: async () => {
        window.dispatchEvent(new CustomEvent('ide:toggle-terminal'));
      },
    },

    // Settings
    {
      id: 'settings:open',
      label: 'Open Settings',
      description: 'Open IDE settings',
      icon: '⚙️',
      category: 'Settings',
      shortcut: '⌘,',
      keywords: ['settings', 'preferences', 'config'],
      onExecute: async () => {
        setShowSettings(true);
      },
    },
    {
      id: 'settings:shortcuts',
      label: 'Keyboard Shortcuts',
      description: 'View and edit keyboard shortcuts',
      icon: '⌨️',
      category: 'Settings',
      shortcut: '?',
      keywords: ['shortcuts', 'keyboard', 'hotkeys'],
      onExecute: async () => {
        keyboardShortcuts.open();
      },
    },

    // Help
    {
      id: 'help:docs',
      label: 'Documentation',
      description: 'Open E-Code documentation',
      icon: '📚',
      category: 'Help',
      keywords: ['help', 'docs', 'documentation'],
      onExecute: async () => {
        window.open('https://docs.e-code.dev', '_blank');
      },
    },
  ];

  // Settings sections
  const settingsSections: SettingsSection[] = [
    {
      id: 'appearance',
      title: 'Appearance',
      icon: '🎨',
      items: [
        {
          type: 'select',
          id: 'theme',
          label: 'Theme',
          description: 'Choose your color theme',
          value: theme,
          options: [
            { label: 'Light', value: 'light' },
            { label: 'Dark', value: 'dark' },
            { label: 'Auto (System)', value: 'auto' },
          ],
          onChange: (value: string) => setTheme(value as any),
        },
      ],
    },
    {
      id: 'editor',
      title: 'Editor',
      icon: '✏️',
      items: [
        {
          type: 'toggle',
          id: 'line-numbers',
          label: 'Line Numbers',
          description: 'Show line numbers in editor',
          value: true,
          onChange: (value: boolean) => {
            localStorage.setItem('editor-line-numbers', String(value));
            window.dispatchEvent(
              new CustomEvent('ide:setting-changed', {
                detail: { key: 'lineNumbers', value },
              })
            );
          },
        },
        {
          type: 'toggle',
          id: 'minimap',
          label: 'Minimap',
          description: 'Show minimap on the right side',
          value: false,
          onChange: (value: boolean) => {
            localStorage.setItem('editor-minimap', String(value));
            window.dispatchEvent(
              new CustomEvent('ide:setting-changed', {
                detail: { key: 'minimap', value },
              })
            );
          },
        },
        {
          type: 'slider',
          id: 'font-size',
          label: 'Font Size',
          description: 'Editor font size',
          value: 14,
          min: 10,
          max: 24,
          step: 1,
          unit: 'px',
          onChange: (value: number) => {
            localStorage.setItem('editor-font-size', String(value));
            window.dispatchEvent(
              new CustomEvent('ide:setting-changed', {
                detail: { key: 'fontSize', value },
              })
            );
          },
        },
      ],
    },
    {
      id: 'terminal',
      title: 'Terminal',
      icon: '💻',
      items: [
        {
          type: 'slider',
          id: 'terminal-font-size',
          label: 'Font Size',
          value: 13,
          min: 10,
          max: 20,
          step: 1,
          unit: 'px',
          onChange: (value: number) => {
            localStorage.setItem('terminal-font-size', String(value));
          },
        },
      ],
    },
    {
      id: 'about',
      title: 'About',
      icon: 'ℹ️',
      items: [
        {
          type: 'info',
          id: 'version',
          label: 'Version',
          value: '1.0.0',
        },
        {
          type: 'info',
          id: 'project-id',
          label: 'Project ID',
          value: projectId || 'N/A',
        },
      ],
    },
  ];

  const handleShortcutChange = useCallback((id: string, newKeys: string[]) => {
    setShortcuts((prev) =>
      prev.map((shortcut) =>
        shortcut.id === id ? { ...shortcut, keys: newKeys } : shortcut
      )
    );
    toast.success('Shortcut updated');
  }, [toast]);

  return (
    <>
      {children}

      {/* Command Palette */}
      {commandPalette.isOpen && (
        <CommandPalette
          commands={ideCommands}
          onClose={commandPalette.close}
          placeholder="Type a command or search..."
        />
      )}

      {/* Keyboard Shortcuts */}
      {keyboardShortcuts.isOpen && (
        <KeyboardShortcuts
          shortcuts={shortcuts}
          isOpen={keyboardShortcuts.isOpen}
          onClose={keyboardShortcuts.close}
          onShortcutChange={handleShortcutChange}
        />
      )}

      {/* Settings */}
      {showSettings && (
        <Settings sections={settingsSections} onClose={() => setShowSettings(false)} />
      )}
    </>
  );
};

// ============================================================================
// IDE PROVIDER (wraps with ToastProvider)
// ============================================================================

export const IDEProvider: React.FC<IDEProviderProps> = (props) => {
  return (
    <ToastProvider>
      <IDEProviderInner {...props} />
    </ToastProvider>
  );
};

export default IDEProvider;
