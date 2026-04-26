import { contextBridge, ipcRenderer } from 'electron';

const allowedReceiveChannels = new Set([
  'desktop:cli-args',
  'desktop:deep-link',
  'desktop:update-status',
  'desktop:update-error',
  'menu:new-project',
  'menu:open-project',
  'menu:open-local-folder',
  'menu:save',
  'menu:save-all',
  'menu:preferences',
  'menu:find',
  'menu:find-replace',
  'menu:new-terminal',
  'menu:clear-terminal',
  'menu:toggle-sidebar',
  'menu:toggle-terminal',
  'menu:toggle-ai',
  'menu:quick-open',
  'menu:command-palette',
  'menu:go-to-line',
  'menu:go-to-symbol',
  'menu:go-to-definition',
  'menu:run-code',
  'menu:stop-execution',
  'menu:show-shortcuts',
  'menu:detect-docker',
  'theme:changed',
]);

function subscribe(channel, callback) {
  if (!allowedReceiveChannels.has(channel)) {
    throw new Error(`Blocked Electron subscription channel: ${channel}`);
  }
  const listener = (_event, ...args) => callback(...args);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

function invoke(channel, ...args) {
  return ipcRenderer.invoke(channel, ...args);
}

const electronAPI = {
  isElectron: true,
  isDesktop: true,

  getAppVersion: () => invoke('app:get-version'),
  getPlatform: () => invoke('app:get-platform'),
  getAppPath: (name) => invoke('app:get-path', name),
  isDev: () => invoke('app:is-dev'),
  isPackaged: () => invoke('app:is-packaged'),

  getSystemTheme: () => invoke('theme:get-system'),
  setThemeSource: (source) => invoke('theme:set-source', source),
  onThemeChange: (callback) => subscribe('theme:changed', callback),

  showSaveDialog: (options) => invoke('dialog:save', options),
  showOpenDialog: (options) => invoke('dialog:open', options),
  showMessageBox: (options) => invoke('dialog:message', options),

  readFile: (filePath) => invoke('fs:read-file', filePath),
  writeFile: (filePath, content) => invoke('fs:write-file', filePath, content),
  fileExists: (filePath) => invoke('fs:file-exists', filePath),
  readDirectory: (dirPath) => invoke('fs:read-directory', dirPath),

  openLocalProjectDialog: () => invoke('local-project:open-dialog'),
  openLocalProjectPath: (folderPath) => invoke('local-project:open-path', folderPath),
  listLocalProjects: () => invoke('local-project:list'),

  openExternal: (url) => invoke('shell:open-external', url),
  openPath: (targetPath) => invoke('shell:open-path', targetPath),
  showItemInFolder: (targetPath) => invoke('shell:show-item-in-folder', targetPath),

  minimizeWindow: () => invoke('window:minimize'),
  maximizeWindow: () => invoke('window:maximize'),
  closeWindow: () => invoke('window:close'),
  isMaximized: () => invoke('window:is-maximized'),
  isFullscreen: () => invoke('window:is-fullscreen'),
  setFullscreen: (flag) => invoke('window:set-fullscreen', flag),

  storeGet: (key, defaultValue) => invoke('store:get', key, defaultValue),
  storeSet: (key, value) => invoke('store:set', key, value),
  storeDelete: (key) => invoke('store:delete', key),

  secretSet: (key, value) => invoke('secrets:set', key, value),
  secretGet: (key) => invoke('secrets:get', key),
  secretDelete: (key) => invoke('secrets:delete', key),

  clipboardWriteText: (text) => invoke('clipboard:write-text', text),
  clipboardReadText: () => invoke('clipboard:read-text'),
  showNativeNotification: (options) => invoke('notification:show', options),

  detectDockerRuntime: () => invoke('runtime:detect-docker'),
  getCloudSyncStatus: () => invoke('sync:cloud-status'),

  checkForUpdates: () => invoke('updater:check'),
  downloadUpdate: () => invoke('updater:download'),
  installUpdate: () => invoke('updater:install'),

  onDesktopCliArgs: (callback) => subscribe('desktop:cli-args', callback),
  onDeepLink: (callback) => subscribe('desktop:deep-link', callback),
  onUpdateStatus: (callback) => subscribe('desktop:update-status', callback),
  onUpdateError: (callback) => subscribe('desktop:update-error', callback),

  on: subscribe,
  once: (channel, callback) => {
    if (!allowedReceiveChannels.has(channel)) {
      throw new Error(`Blocked Electron subscription channel: ${channel}`);
    }
    ipcRenderer.once(channel, (_event, ...args) => callback(...args));
  },
  send: () => {
    throw new Error('Renderer-to-main fire-and-forget IPC is disabled; use explicit methods.');
  },
  removeAllListeners: (channel) => {
    if (allowedReceiveChannels.has(channel)) ipcRenderer.removeAllListeners(channel);
  },

  onMenuNewProject: (callback) => subscribe('menu:new-project', callback),
  onMenuOpenProject: (callback) => subscribe('menu:open-project', callback),
  onMenuOpenLocalFolder: (callback) => subscribe('menu:open-local-folder', callback),
  onMenuSave: (callback) => subscribe('menu:save', callback),
  onMenuSaveAll: (callback) => subscribe('menu:save-all', callback),
  onMenuPreferences: (callback) => subscribe('menu:preferences', callback),
  onMenuFind: (callback) => subscribe('menu:find', callback),
  onMenuFindReplace: (callback) => subscribe('menu:find-replace', callback),
  onMenuNewTerminal: (callback) => subscribe('menu:new-terminal', callback),
  onMenuClearTerminal: (callback) => subscribe('menu:clear-terminal', callback),
  onMenuToggleSidebar: (callback) => subscribe('menu:toggle-sidebar', callback),
  onMenuToggleTerminal: (callback) => subscribe('menu:toggle-terminal', callback),
  onMenuToggleAI: (callback) => subscribe('menu:toggle-ai', callback),
  onMenuQuickOpen: (callback) => subscribe('menu:quick-open', callback),
  onMenuCommandPalette: (callback) => subscribe('menu:command-palette', callback),
  onMenuGoToLine: (callback) => subscribe('menu:go-to-line', callback),
  onMenuGoToSymbol: (callback) => subscribe('menu:go-to-symbol', callback),
  onMenuGoToDefinition: (callback) => subscribe('menu:go-to-definition', callback),
  onMenuRunCode: (callback) => subscribe('menu:run-code', callback),
  onMenuStopExecution: (callback) => subscribe('menu:stop-execution', callback),
  onMenuShowShortcuts: (callback) => subscribe('menu:show-shortcuts', callback),
  onMenuDetectDocker: (callback) => subscribe('menu:detect-docker', callback),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
