/**
 * E-Code Desktop - Electron Preload Script
 * Exposes safe APIs to the renderer process
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),

  // Dialog APIs
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),

  // Menu event listeners
  onMenuNewProject: (callback) => ipcRenderer.on('menu-new-project', callback),
  onMenuOpenProject: (callback) => ipcRenderer.on('menu-open-project', callback),
  onMenuSave: (callback) => ipcRenderer.on('menu-save', callback),
  onMenuPreferences: (callback) => ipcRenderer.on('menu-preferences', callback),
  onMenuNewTerminal: (callback) => ipcRenderer.on('menu-new-terminal', callback),
  onMenuClearTerminal: (callback) => ipcRenderer.on('menu-clear-terminal', callback),

  // Remove listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),

  // Platform detection
  isElectron: true,
});

console.log('[E-Code Desktop] Preload script loaded');
