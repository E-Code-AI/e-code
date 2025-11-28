/**
 * E-Code Desktop - Electron Preload Script
 * Fortune 500 Quality - Secure IPC Bridge
 * 
 * Exposes safe APIs to the renderer process using contextBridge
 * All APIs use invoke/handle pattern for security
 */

const { contextBridge, ipcRenderer } = require('electron');

// Allowed channels for one-way communication (renderer -> main)
const validSendChannels = [
  'menu-new-project',
  'menu-open-project',
  'menu-save',
  'menu-save-all',
  'menu-preferences',
  'menu-find',
  'menu-find-replace',
  'menu-new-terminal',
  'menu-clear-terminal',
  'menu-toggle-sidebar',
  'menu-toggle-terminal',
  'menu-toggle-ai',
  'menu-quick-open',
  'menu-go-to-line',
  'menu-go-to-symbol',
  'menu-go-to-definition',
  'menu-run-code',
  'menu-stop-execution',
  'menu-show-shortcuts',
];

// Allowed channels for receiving messages (main -> renderer)
const validReceiveChannels = [
  'menu-new-project',
  'menu-open-project',
  'menu-save',
  'menu-save-all',
  'menu-preferences',
  'menu-find',
  'menu-find-replace',
  'menu-new-terminal',
  'menu-clear-terminal',
  'menu-toggle-sidebar',
  'menu-toggle-terminal',
  'menu-toggle-ai',
  'menu-quick-open',
  'menu-go-to-line',
  'menu-go-to-symbol',
  'menu-go-to-definition',
  'menu-run-code',
  'menu-stop-execution',
  'menu-show-shortcuts',
  'update-available',
  'update-downloaded',
  'deep-link',
];

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // ==========================================
  // Platform Detection
  // ==========================================
  isElectron: true,
  isDesktop: true,
  
  // ==========================================
  // App Information
  // ==========================================
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  getAppPath: (name) => ipcRenderer.invoke('get-app-path', name),
  isDev: () => ipcRenderer.invoke('is-dev'),
  isPackaged: () => ipcRenderer.invoke('is-packaged'),

  // ==========================================
  // Theme Management
  // ==========================================
  getSystemTheme: () => ipcRenderer.invoke('get-system-theme'),
  setThemeSource: (source) => ipcRenderer.invoke('set-theme-source', source),
  onThemeChange: (callback) => {
    const handler = (event, theme) => callback(theme);
    ipcRenderer.on('theme-changed', handler);
    return () => ipcRenderer.removeListener('theme-changed', handler);
  },

  // ==========================================
  // Dialog APIs
  // ==========================================
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  showMessageBox: (options) => ipcRenderer.invoke('show-message-box', options),

  // ==========================================
  // File System APIs
  // ==========================================
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('write-file', filePath, content),
  fileExists: (filePath) => ipcRenderer.invoke('file-exists', filePath),
  readDirectory: (dirPath) => ipcRenderer.invoke('read-directory', dirPath),

  // ==========================================
  // Shell APIs
  // ==========================================
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  openPath: (path) => ipcRenderer.invoke('open-path', path),
  showItemInFolder: (path) => ipcRenderer.invoke('show-item-in-folder', path),

  // ==========================================
  // Window APIs
  // ==========================================
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  isMaximized: () => ipcRenderer.invoke('is-maximized'),
  isFullscreen: () => ipcRenderer.invoke('is-fullscreen'),
  setFullscreen: (flag) => ipcRenderer.invoke('set-fullscreen', flag),

  // ==========================================
  // Persistent Storage APIs
  // ==========================================
  storeGet: (key, defaultValue) => ipcRenderer.invoke('store-get', key, defaultValue),
  storeSet: (key, value) => ipcRenderer.invoke('store-set', key, value),
  storeDelete: (key) => ipcRenderer.invoke('store-delete', key),

  // ==========================================
  // Clipboard APIs
  // ==========================================
  clipboardWriteText: (text) => ipcRenderer.invoke('clipboard-write-text', text),
  clipboardReadText: () => ipcRenderer.invoke('clipboard-read-text'),

  // ==========================================
  // Menu Event Listeners
  // ==========================================
  on: (channel, callback) => {
    if (validReceiveChannels.includes(channel)) {
      const handler = (event, ...args) => callback(...args);
      ipcRenderer.on(channel, handler);
      return () => ipcRenderer.removeListener(channel, handler);
    }
    console.warn(`[Electron Preload] Invalid receive channel: ${channel}`);
    return () => {};
  },

  once: (channel, callback) => {
    if (validReceiveChannels.includes(channel)) {
      ipcRenderer.once(channel, (event, ...args) => callback(...args));
    } else {
      console.warn(`[Electron Preload] Invalid receive channel: ${channel}`);
    }
  },

  send: (channel, ...args) => {
    if (validSendChannels.includes(channel)) {
      ipcRenderer.send(channel, ...args);
    } else {
      console.warn(`[Electron Preload] Invalid send channel: ${channel}`);
    }
  },

  removeAllListeners: (channel) => {
    if (validReceiveChannels.includes(channel)) {
      ipcRenderer.removeAllListeners(channel);
    }
  },

  // ==========================================
  // Convenience Menu Listeners
  // ==========================================
  onMenuNewProject: (callback) => {
    ipcRenderer.on('menu-new-project', callback);
    return () => ipcRenderer.removeListener('menu-new-project', callback);
  },
  onMenuOpenProject: (callback) => {
    ipcRenderer.on('menu-open-project', callback);
    return () => ipcRenderer.removeListener('menu-open-project', callback);
  },
  onMenuSave: (callback) => {
    ipcRenderer.on('menu-save', callback);
    return () => ipcRenderer.removeListener('menu-save', callback);
  },
  onMenuSaveAll: (callback) => {
    ipcRenderer.on('menu-save-all', callback);
    return () => ipcRenderer.removeListener('menu-save-all', callback);
  },
  onMenuPreferences: (callback) => {
    ipcRenderer.on('menu-preferences', callback);
    return () => ipcRenderer.removeListener('menu-preferences', callback);
  },
  onMenuFind: (callback) => {
    ipcRenderer.on('menu-find', callback);
    return () => ipcRenderer.removeListener('menu-find', callback);
  },
  onMenuFindReplace: (callback) => {
    ipcRenderer.on('menu-find-replace', callback);
    return () => ipcRenderer.removeListener('menu-find-replace', callback);
  },
  onMenuNewTerminal: (callback) => {
    ipcRenderer.on('menu-new-terminal', callback);
    return () => ipcRenderer.removeListener('menu-new-terminal', callback);
  },
  onMenuClearTerminal: (callback) => {
    ipcRenderer.on('menu-clear-terminal', callback);
    return () => ipcRenderer.removeListener('menu-clear-terminal', callback);
  },
  onMenuToggleSidebar: (callback) => {
    ipcRenderer.on('menu-toggle-sidebar', callback);
    return () => ipcRenderer.removeListener('menu-toggle-sidebar', callback);
  },
  onMenuToggleTerminal: (callback) => {
    ipcRenderer.on('menu-toggle-terminal', callback);
    return () => ipcRenderer.removeListener('menu-toggle-terminal', callback);
  },
  onMenuToggleAI: (callback) => {
    ipcRenderer.on('menu-toggle-ai', callback);
    return () => ipcRenderer.removeListener('menu-toggle-ai', callback);
  },
  onMenuQuickOpen: (callback) => {
    ipcRenderer.on('menu-quick-open', callback);
    return () => ipcRenderer.removeListener('menu-quick-open', callback);
  },
  onMenuGoToLine: (callback) => {
    ipcRenderer.on('menu-go-to-line', callback);
    return () => ipcRenderer.removeListener('menu-go-to-line', callback);
  },
  onMenuGoToSymbol: (callback) => {
    ipcRenderer.on('menu-go-to-symbol', callback);
    return () => ipcRenderer.removeListener('menu-go-to-symbol', callback);
  },
  onMenuGoToDefinition: (callback) => {
    ipcRenderer.on('menu-go-to-definition', callback);
    return () => ipcRenderer.removeListener('menu-go-to-definition', callback);
  },
  onMenuRunCode: (callback) => {
    ipcRenderer.on('menu-run-code', callback);
    return () => ipcRenderer.removeListener('menu-run-code', callback);
  },
  onMenuStopExecution: (callback) => {
    ipcRenderer.on('menu-stop-execution', callback);
    return () => ipcRenderer.removeListener('menu-stop-execution', callback);
  },
  onMenuShowShortcuts: (callback) => {
    ipcRenderer.on('menu-show-shortcuts', callback);
    return () => ipcRenderer.removeListener('menu-show-shortcuts', callback);
  },
});

console.log('[E-Code Desktop] Preload script loaded');
console.log('[E-Code Desktop] electronAPI exposed to window');
