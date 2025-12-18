import Fuse from 'fuse.js';
import { StorageService } from './storage';

export type CommandCategory = 'files' | 'actions' | 'navigation' | 'ai';

export interface Command {
  id: string;
  label: string;
  description?: string;
  icon: string;
  category: CommandCategory;
  shortcutHint?: string;
  action: () => void;
}

export interface CommandRegistryOptions {
  onNavigate?: (screen: string, params?: any) => void;
  onAction?: (actionId: string, params?: any) => void;
}

const RECENT_COMMANDS_KEY = 'commandPalette.recentCommands';
const MAX_RECENT_COMMANDS = 5;

class CommandRegistry {
  private commands: Map<string, Command> = new Map();
  private recentCommandIds: string[] = [];
  private fuse: Fuse<Command> | null = null;
  private options: CommandRegistryOptions = {};
  private initialized: boolean = false;

  constructor() {
    this.loadRecentCommands();
  }

  setOptions(options: CommandRegistryOptions) {
    this.options = options;
    this.registerDefaultCommands();
  }

  private async loadRecentCommands() {
    try {
      const stored = await StorageService.get<string[]>(RECENT_COMMANDS_KEY);
      if (stored && Array.isArray(stored)) {
        this.recentCommandIds = stored;
      }
      this.initialized = true;
    } catch {
      this.recentCommandIds = [];
      this.initialized = true;
    }
  }

  private async saveRecentCommands() {
    try {
      await StorageService.set(RECENT_COMMANDS_KEY, this.recentCommandIds);
    } catch {
      // Ignore storage errors
    }
  }

  register(command: Command) {
    this.commands.set(command.id, command);
    this.updateFuseIndex();
  }

  unregister(commandId: string) {
    this.commands.delete(commandId);
    this.updateFuseIndex();
  }

  private updateFuseIndex() {
    const commandsArray = Array.from(this.commands.values());
    this.fuse = new Fuse(commandsArray, {
      keys: ['label', 'description', 'category'],
      threshold: 0.4,
      includeScore: true,
    });
  }

  search(query: string): Command[] {
    if (!query.trim()) {
      return this.getAllCommands();
    }

    if (!this.fuse) {
      this.updateFuseIndex();
    }

    const results = this.fuse?.search(query) ?? [];
    return results.map(r => r.item);
  }

  getAllCommands(): Command[] {
    return Array.from(this.commands.values());
  }

  getCommandsByCategory(category: CommandCategory): Command[] {
    return Array.from(this.commands.values()).filter(c => c.category === category);
  }

  getRecentCommands(): Command[] {
    return this.recentCommandIds
      .map(id => this.commands.get(id))
      .filter((cmd): cmd is Command => cmd !== undefined);
  }

  executeCommand(commandId: string) {
    const command = this.commands.get(commandId);
    if (command) {
      command.action();
      this.addToRecent(commandId);
    }
  }

  private addToRecent(commandId: string) {
    this.recentCommandIds = [
      commandId,
      ...this.recentCommandIds.filter(id => id !== commandId),
    ].slice(0, MAX_RECENT_COMMANDS);
    this.saveRecentCommands();
  }

  private registerDefaultCommands() {
    const { onNavigate, onAction } = this.options;

    // Files category
    this.register({
      id: 'new-file',
      label: 'New File',
      description: 'Create a new file',
      icon: '📄',
      category: 'files',
      shortcutHint: 'N',
      action: () => onAction?.('newFile'),
    });

    this.register({
      id: 'open-file',
      label: 'Open File',
      description: 'Open file picker',
      icon: '📂',
      category: 'files',
      shortcutHint: 'O',
      action: () => onAction?.('openFile'),
    });

    this.register({
      id: 'save-file',
      label: 'Save File',
      description: 'Save current file',
      icon: '💾',
      category: 'files',
      shortcutHint: 'S',
      action: () => onAction?.('saveFile'),
    });

    // Actions category
    this.register({
      id: 'search',
      label: 'Search',
      description: 'Search in project',
      icon: '🔍',
      category: 'actions',
      shortcutHint: 'F',
      action: () => onNavigate?.('Search'),
    });

    this.register({
      id: 'run-project',
      label: 'Run',
      description: 'Run the project',
      icon: '▶️',
      category: 'actions',
      shortcutHint: 'R',
      action: () => onAction?.('run'),
    });

    this.register({
      id: 'deploy',
      label: 'Deploy',
      description: 'Deploy to production',
      icon: '🚀',
      category: 'actions',
      action: () => onNavigate?.('Deployments'),
    });

    this.register({
      id: 'settings',
      label: 'Settings',
      description: 'Open settings',
      icon: '⚙️',
      category: 'actions',
      action: () => onNavigate?.('Settings'),
    });

    this.register({
      id: 'terminal',
      label: 'Terminal',
      description: 'Open terminal',
      icon: '💻',
      category: 'actions',
      shortcutHint: 'T',
      action: () => onNavigate?.('Terminal'),
    });

    // Navigation category
    this.register({
      id: 'go-to-file',
      label: 'Go to File',
      description: 'Quick file navigation',
      icon: '📁',
      category: 'navigation',
      shortcutHint: 'P',
      action: () => onAction?.('goToFile'),
    });

    this.register({
      id: 'go-to-line',
      label: 'Go to Line',
      description: 'Jump to a specific line',
      icon: '↕️',
      category: 'navigation',
      shortcutHint: 'G',
      action: () => onAction?.('goToLine'),
    });

    this.register({
      id: 'go-home',
      label: 'Home',
      description: 'Go to projects list',
      icon: '🏠',
      category: 'navigation',
      action: () => onNavigate?.('Home'),
    });

    this.register({
      id: 'go-templates',
      label: 'Templates',
      description: 'Browse templates',
      icon: '📋',
      category: 'navigation',
      action: () => onNavigate?.('Templates'),
    });

    // AI category
    this.register({
      id: 'ask-agent',
      label: 'Ask Agent',
      description: 'Chat with AI assistant',
      icon: '🤖',
      category: 'ai',
      shortcutHint: 'A',
      action: () => onAction?.('askAgent'),
    });

    this.register({
      id: 'explain-code',
      label: 'Explain Code',
      description: 'Get AI explanation of selected code',
      icon: '💡',
      category: 'ai',
      shortcutHint: 'E',
      action: () => onAction?.('explainCode'),
    });

    this.register({
      id: 'fix-bug',
      label: 'Fix Bug',
      description: 'AI-powered bug fix',
      icon: '🐛',
      category: 'ai',
      action: () => onAction?.('fixBug'),
    });

    this.register({
      id: 'generate-code',
      label: 'Generate Code',
      description: 'Generate code with AI',
      icon: '✨',
      category: 'ai',
      action: () => onAction?.('generateCode'),
    });

    this.register({
      id: 'refactor',
      label: 'Refactor',
      description: 'AI-assisted refactoring',
      icon: '🔄',
      category: 'ai',
      action: () => onAction?.('refactor'),
    });
  }

  clear() {
    this.commands.clear();
    this.fuse = null;
  }
}

export const commandRegistry = new CommandRegistry();

export const categoryLabels: Record<CommandCategory, string> = {
  files: 'Files',
  actions: 'Actions',
  navigation: 'Navigation',
  ai: 'AI',
};

export const categoryIcons: Record<CommandCategory, string> = {
  files: '📁',
  actions: '⚡',
  navigation: '🧭',
  ai: '🤖',
};
