/**
 * E-Code Desktop - Electron Main Process
 * Fortune 500 Quality Desktop Application
 * 
 * Features:
 * - Offline bundle support (loads from dist/public)
 * - Production URL fallback
 * - Auto-updates with electron-updater
 * - Native file system integration
 * - Secure IPC communication
 * - Multi-window support
 * - Deep linking support
 */

const { app, BrowserWindow, Menu, Tray, shell, ipcMain, dialog, nativeTheme, session } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');
const { autoUpdater } = require('electron-updater');

// Initialize electron-store for persistent settings
const store = new Store({
  name: 'e-code-settings',
  defaults: {
    windowBounds: { width: 1400, height: 900 },
    windowMaximized: false,
    theme: 'system',
    autoUpdate: true,
    devTools: false,
  }
});

// Keep a global reference of the window object
let mainWindow = null;
let splashWindow = null;
let tray = null;

// File watchers and WebSocket connections for cleanup
let fileWatchers = new Map();
let wsConnections = [];

// ============================================
// Multi-Window Manager (Fortune 500-Grade)
// ============================================
class WindowManager {
  constructor() {
    this.windows = new Map();
    this.mainWindowId = null;
  }
  
  createWindow(type, options = {}) {
    const win = new BrowserWindow(options);
    const id = `${type}-${Date.now()}`;
    
    this.windows.set(id, { window: win, type, createdAt: Date.now() });
    
    win.on('closed', () => {
      this.windows.delete(id);
    });
    
    if (type === 'main' && !this.mainWindowId) {
      this.mainWindowId = id;
    }
    
    return { id, window: win };
  }
  
  getWindow(id) {
    return this.windows.get(id)?.window || null;
  }
  
  getMainWindow() {
    return this.mainWindowId ? this.getWindow(this.mainWindowId) : null;
  }
  
  getAllWindows() {
    return Array.from(this.windows.entries()).map(([id, data]) => ({
      id,
      type: data.type,
      window: data.window
    }));
  }
  
  closeAll() {
    for (const [id, data] of this.windows) {
      if (!data.window.isDestroyed()) {
        data.window.close();
      }
    }
    this.windows.clear();
  }
  
  broadcastToAll(channel, data) {
    for (const [id, entry] of this.windows) {
      if (!entry.window.isDestroyed()) {
        entry.window.webContents.send(channel, data);
      }
    }
  }
}

const windowManager = new WindowManager();

// Development mode detection
const isDev = process.argv.includes('--dev') || 
              process.env.NODE_ENV === 'development' ||
              !app.isPackaged;

// Determine the correct URL/path to load
function getLoadPath() {
  // Development: Connect to Vite dev server
  if (isDev) {
    return { type: 'url', path: process.env.DEV_SERVER_URL || 'http://localhost:5000' };
  }
  
  // Production: Check for bundled renderer files
  const rendererPath = path.join(__dirname, 'renderer', 'index.html');
  const distPath = path.join(__dirname, '..', 'dist', 'public', 'index.html');
  
  if (fs.existsSync(rendererPath)) {
    return { type: 'file', path: rendererPath };
  }
  
  if (fs.existsSync(distPath)) {
    return { type: 'file', path: distPath };
  }
  
  // Fallback to production URL
  const prodUrl = process.env.PRODUCTION_URL || 'https://e-code.ai';
  return { type: 'url', path: prodUrl };
}

// Create splash screen for loading
function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    transparent: true,
    resizable: false,
    center: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  // Load inline splash HTML
  const splashHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: white;
          -webkit-app-region: drag;
          border-radius: 16px;
          overflow: hidden;
        }
        .container {
          text-align: center;
        }
        .logo {
          font-size: 48px;
          font-weight: 700;
          background: linear-gradient(135deg, #F26207 0%, #FF8534 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 16px;
        }
        .tagline {
          font-size: 14px;
          color: #6B7280;
          margin-bottom: 24px;
        }
        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(242, 98, 7, 0.2);
          border-top: 3px solid #F26207;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .version {
          position: absolute;
          bottom: 16px;
          left: 0;
          right: 0;
          text-align: center;
          font-size: 11px;
          color: #4B5563;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">E-Code</div>
        <div class="tagline">AI-Powered Development Platform</div>
        <div class="spinner"></div>
      </div>
      <div class="version">Version ${app.getVersion()}</div>
    </body>
    </html>
  `;

  splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(splashHtml)}`);
}

// Create the main browser window
function createWindow() {
  const bounds = store.get('windowBounds');

  mainWindow = new BrowserWindow({
    ...bounds,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#1e1e1e' : '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      sandbox: true,
      spellcheck: true,
    },
    icon: getIconPath(),
    show: false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 16, y: 16 },
    frame: true,
  });

  // Initialize application menu with stored recent files
  const storedRecentFiles = store.get('recentFiles', []);
  createMenuWithRecentFiles(storedRecentFiles);

  // Load the application
  const loadPath = getLoadPath();
  console.log(`[E-Code Desktop] Loading: ${loadPath.type} - ${loadPath.path}`);
  
  if (loadPath.type === 'file') {
    mainWindow.loadFile(loadPath.path);
  } else {
    mainWindow.loadURL(loadPath.path);
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    if (splashWindow) {
      splashWindow.destroy();
      splashWindow = null;
    }
    
    mainWindow.show();

    if (store.get('windowMaximized')) {
      mainWindow.maximize();
    }

    // Focus the window
    mainWindow.focus();
  });

  // Handle load errors
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error(`[E-Code Desktop] Failed to load: ${errorDescription} (${errorCode})`);
    
    // Show error page
    const errorHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            background: #1e1e1e;
            color: white;
            font-family: -apple-system, system-ui, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
          }
          .error-container {
            text-align: center;
            padding: 40px;
          }
          h1 { color: #F26207; margin-bottom: 16px; }
          p { color: #9CA3AF; margin-bottom: 24px; }
          button {
            background: #F26207;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
          }
          button:hover { background: #E55A06; }
        </style>
      </head>
      <body>
        <div class="error-container">
          <h1>Connection Error</h1>
          <p>Unable to connect to E-Code. Please check your internet connection.</p>
          <button onclick="location.reload()">Retry</button>
        </div>
      </body>
      </html>
    `;
    mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(errorHtml)}`);
  });

  // Save window bounds on resize/move
  const saveBounds = () => {
    if (!mainWindow.isMaximized()) {
      store.set('windowBounds', mainWindow.getBounds());
    }
  };

  mainWindow.on('resize', saveBounds);
  mainWindow.on('move', saveBounds);
  mainWindow.on('maximize', () => store.set('windowMaximized', true));
  mainWindow.on('unmaximize', () => store.set('windowMaximized', false));

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Development tools
  if (isDev || store.get('devTools')) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  // Cleanup
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Create application menu
  createMenu();
}

// Get icon path based on platform
function getIconPath() {
  const resourcesPath = path.join(__dirname, 'resources');
  const iconsPath = path.join(resourcesPath, 'icons');
  
  // Platform-specific icon paths with fallbacks
  const iconCandidates = [];
  
  switch (process.platform) {
    case 'darwin':
      iconCandidates.push(
        path.join(resourcesPath, 'icon.icns'),
        path.join(resourcesPath, 'icon.png'),
        path.join(iconsPath, '512x512.png'),
        path.join(iconsPath, '256x256.png')
      );
      break;
    case 'win32':
      iconCandidates.push(
        path.join(resourcesPath, 'icon.ico'),
        path.join(resourcesPath, 'icon.png'),
        path.join(iconsPath, '256x256.png')
      );
      break;
    default:
      iconCandidates.push(
        path.join(resourcesPath, 'icon.png'),
        path.join(iconsPath, '512x512.png'),
        path.join(iconsPath, '256x256.png')
      );
  }
  
  // Return first existing icon or last fallback
  for (const iconPath of iconCandidates) {
    if (fs.existsSync(iconPath)) {
      return iconPath;
    }
  }
  
  return iconCandidates[iconCandidates.length - 1];
}

// Create application menu
function createMenu() {
  const isMac = process.platform === 'darwin';

  const template = [
    // App menu (macOS only)
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        {
          label: 'Preferences...',
          accelerator: 'Cmd+,',
          click: () => mainWindow.webContents.send('menu-preferences'),
        },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    }] : []),

    // File menu
    {
      label: 'File',
      submenu: [
        {
          label: 'New Project',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow.webContents.send('menu-new-project'),
        },
        {
          label: 'Open Project...',
          accelerator: 'CmdOrCtrl+O',
          click: () => mainWindow.webContents.send('menu-open-project'),
        },
        {
          label: 'Open Recent',
          role: 'recentDocuments',
          submenu: [
            { role: 'clearRecentDocuments' }
          ]
        },
        { type: 'separator' },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow.webContents.send('menu-save'),
        },
        {
          label: 'Save All',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => mainWindow.webContents.send('menu-save-all'),
        },
        { type: 'separator' },
        ...(!isMac ? [
          {
            label: 'Preferences',
            accelerator: 'Ctrl+,',
            click: () => mainWindow.webContents.send('menu-preferences'),
          },
          { type: 'separator' },
        ] : []),
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },

    // Edit menu
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'pasteAndMatchStyle' },
        { role: 'delete' },
        { role: 'selectAll' },
        { type: 'separator' },
        {
          label: 'Find',
          accelerator: 'CmdOrCtrl+F',
          click: () => mainWindow.webContents.send('menu-find'),
        },
        {
          label: 'Find and Replace',
          accelerator: 'CmdOrCtrl+H',
          click: () => mainWindow.webContents.send('menu-find-replace'),
        },
      ],
    },

    // View menu
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        {
          label: 'Toggle File Explorer',
          accelerator: 'CmdOrCtrl+B',
          click: () => mainWindow.webContents.send('menu-toggle-sidebar'),
        },
        {
          label: 'Toggle Terminal',
          accelerator: 'CmdOrCtrl+J',
          click: () => mainWindow.webContents.send('menu-toggle-terminal'),
        },
        {
          label: 'Toggle AI Assistant',
          accelerator: 'CmdOrCtrl+Shift+A',
          click: () => mainWindow.webContents.send('menu-toggle-ai'),
        },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },

    // Go menu
    {
      label: 'Go',
      submenu: [
        {
          label: 'Go to File...',
          accelerator: 'CmdOrCtrl+P',
          click: () => mainWindow.webContents.send('menu-quick-open'),
        },
        {
          label: 'Go to Line...',
          accelerator: 'CmdOrCtrl+G',
          click: () => mainWindow.webContents.send('menu-go-to-line'),
        },
        {
          label: 'Go to Symbol...',
          accelerator: 'CmdOrCtrl+Shift+O',
          click: () => mainWindow.webContents.send('menu-go-to-symbol'),
        },
        { type: 'separator' },
        {
          label: 'Go to Definition',
          accelerator: 'F12',
          click: () => mainWindow.webContents.send('menu-go-to-definition'),
        },
      ],
    },

    // Terminal menu
    {
      label: 'Terminal',
      submenu: [
        {
          label: 'New Terminal',
          accelerator: 'CmdOrCtrl+Shift+`',
          click: () => mainWindow.webContents.send('menu-new-terminal'),
        },
        {
          label: 'Clear Terminal',
          accelerator: 'CmdOrCtrl+K',
          click: () => mainWindow.webContents.send('menu-clear-terminal'),
        },
        { type: 'separator' },
        {
          label: 'Run Code',
          accelerator: 'CmdOrCtrl+Enter',
          click: () => mainWindow.webContents.send('menu-run-code'),
        },
        {
          label: 'Stop Execution',
          accelerator: 'CmdOrCtrl+Shift+C',
          click: () => mainWindow.webContents.send('menu-stop-execution'),
        },
      ],
    },

    // Window menu
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        ...(isMac ? [
          { type: 'separator' },
          { role: 'front' },
          { type: 'separator' },
          { role: 'window' },
        ] : [
          { role: 'close' },
        ]),
      ],
    },

    // Help menu
    {
      label: 'Help',
      submenu: [
        {
          label: 'Documentation',
          click: () => shell.openExternal('https://docs.e-code.ai'),
        },
        {
          label: 'Keyboard Shortcuts',
          accelerator: 'CmdOrCtrl+/',
          click: () => mainWindow.webContents.send('menu-show-shortcuts'),
        },
        { type: 'separator' },
        {
          label: 'Report Issue',
          click: () => shell.openExternal('https://github.com/e-code/issues'),
        },
        {
          label: 'Community Forum',
          click: () => shell.openExternal('https://community.e-code.ai'),
        },
        { type: 'separator' },
        {
          label: 'Check for Updates...',
          click: checkForUpdates,
        },
        { type: 'separator' },
        {
          label: 'About E-Code',
          click: showAboutDialog,
        },
      ],
    },
  ];

  // Add Developer menu in dev mode
  if (isDev) {
    template.push({
      label: 'Developer',
      submenu: [
        { role: 'toggleDevTools' },
        { type: 'separator' },
        {
          label: 'Reload Window',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => mainWindow.reload(),
        },
        {
          label: 'Clear App Data',
          click: () => {
            store.clear();
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              message: 'App data cleared. Restarting...',
            }).then(() => {
              app.relaunch();
              app.exit();
            });
          },
        },
        { type: 'separator' },
        {
          label: 'Show App Data Folder',
          click: () => shell.openPath(app.getPath('userData')),
        },
      ],
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Create system tray
function createTray() {
  const iconPath = getIconPath();
  
  // Use a smaller icon for tray on some platforms
  const trayIconPath = process.platform === 'darwin' 
    ? path.join(__dirname, 'resources', 'icon-tray.png')
    : iconPath;
  
  // Check if tray icon exists, fallback to main icon
  const finalTrayIcon = fs.existsSync(trayIconPath) ? trayIconPath : iconPath;
  
  tray = new Tray(finalTrayIcon);
  tray.setToolTip('E-Code Desktop');
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show/Hide Window',
      click: () => {
        if (mainWindow) {
          if (mainWindow.isVisible()) {
            mainWindow.hide();
          } else {
            mainWindow.show();
            mainWindow.focus();
          }
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Check for Updates',
      click: checkForUpdates
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      }
    }
  ]);
  
  tray.setContextMenu(contextMenu);
  
  // Click behavior to show/hide window
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });
  
  // Double-click to show window (Windows)
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// Handle deep link URL with proper parsing
function handleDeepLink(url) {
  console.log('[E-Code Desktop] Deep link received:', url);
  
  // Parse the ecode:// URL
  if (url && url.startsWith('ecode://')) {
    try {
      const parsed = new URL(url);
      const pathParts = parsed.pathname.split('/').filter(Boolean);
      
      const data = {
        raw: url,
        action: pathParts[0] || null,  // 'project', 'file', 'workspace', etc.
        resourceId: pathParts[1] || null,
        params: Object.fromEntries(parsed.searchParams),
        path: parsed.pathname,
        host: parsed.host,
      };
      
      console.log('[E-Code Desktop] Parsed deep link:', data);
      
      // Send structured data to renderer process
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('deep-link', data);
        
        // Make sure window is visible and focused
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
      }
      
      // Also broadcast to all windows
      windowManager.broadcastToAll('deep-link', data);
    } catch (error) {
      console.error('[E-Code Desktop] Failed to parse deep link:', error);
      // Fallback: send raw URL
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('deep-link', { raw: url, error: error.message });
      }
    }
  }
}

// Show about dialog
function showAboutDialog() {
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'About E-Code',
    message: 'E-Code Desktop',
    detail: `Version: ${app.getVersion()}
Electron: ${process.versions.electron}
Chrome: ${process.versions.chrome}
Node.js: ${process.versions.node}
V8: ${process.versions.v8}

AI-powered development platform for building and deploying applications.

© 2025 E-Code Team. All rights reserved.`,
    buttons: ['OK'],
    icon: getIconPath(),
  });
}

// Check for updates
function checkForUpdates() {
  if (isDev) {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Updates',
      message: 'Updates are disabled in development mode.',
    });
    return;
  }

  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Checking for Updates',
    message: 'Checking for updates...',
    buttons: ['OK'],
  });

  autoUpdater.checkForUpdatesAndNotify();
}

// Auto updater configuration with environment-specific channels
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.allowDowngrade = false;

// Configure update channel based on environment
const updateChannel = process.env.UPDATE_CHANNEL || 'latest';
autoUpdater.channel = updateChannel;

// ============================================
// Auto-Update Retry Logic (Fortune 500-Grade)
// ============================================
let updateRetries = 0;
const MAX_UPDATE_RETRIES = 3;
const RETRY_DELAY_BASE = 5000; // 5 seconds base delay

function retryUpdateCheck() {
  if (updateRetries < MAX_UPDATE_RETRIES) {
    updateRetries++;
    const delay = RETRY_DELAY_BASE * updateRetries; // Exponential backoff: 5s, 10s, 15s
    console.log(`[E-Code Desktop] Retrying update check (${updateRetries}/${MAX_UPDATE_RETRIES}) in ${delay}ms`);
    
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch(err => {
        console.error('[E-Code Desktop] Retry update check failed:', err.message);
      });
    }, delay);
  } else {
    console.error('[E-Code Desktop] Max update retries reached');
    dialog.showErrorBox(
      'Update Error',
      'Failed to check for updates after multiple attempts. Please check your internet connection and try again later.'
    );
    updateRetries = 0; // Reset for next manual check
  }
}

function resetUpdateRetries() {
  updateRetries = 0;
}

// Configure custom update server if specified
if (process.env.UPDATE_SERVER_URL) {
  autoUpdater.setFeedURL({
    provider: 'generic',
    url: process.env.UPDATE_SERVER_URL,
    channel: updateChannel
  });
  console.log(`[E-Code Desktop] Using custom update server: ${process.env.UPDATE_SERVER_URL}`);
} else {
  // Uses default GitHub releases from package.json publish config
  console.log(`[E-Code Desktop] Using GitHub releases for updates (channel: ${updateChannel})`);
}

// Check for updates on startup (non-dev only)
if (!isDev) {
  app.whenReady().then(() => {
    setTimeout(() => {
      autoUpdater.checkForUpdatesAndNotify().catch(err => {
        console.log('[E-Code Desktop] Update check failed:', err.message);
      });
    }, 5000); // Delay 5s to let app fully initialize
  });
}

autoUpdater.on('checking-for-update', () => {
  console.log('[E-Code Desktop] Checking for updates...');
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-status', { status: 'checking' });
  }
});

autoUpdater.on('update-available', (info) => {
  console.log('[E-Code Desktop] Update available:', info.version);
  resetUpdateRetries(); // Success - reset retry counter
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-available', { 
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: info.releaseNotes
    });
    mainWindow.webContents.send('update-status', { status: 'available', version: info.version });
  }
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Update Available',
    message: `A new version (${info.version}) is available.`,
    detail: 'It will be downloaded in the background.',
    buttons: ['OK'],
  });
});

autoUpdater.on('update-not-available', () => {
  console.log('[E-Code Desktop] No updates available');
  resetUpdateRetries(); // Success - reset retry counter
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-status', { status: 'up-to-date' });
  }
});

autoUpdater.on('download-progress', (progress) => {
  console.log(`[E-Code Desktop] Download progress: ${Math.round(progress.percent)}%`);
  mainWindow?.setProgressBar(progress.percent / 100);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-progress', {
      percent: progress.percent,
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total
    });
    mainWindow.webContents.send('update-status', { 
      status: 'downloading', 
      percent: Math.round(progress.percent) 
    });
  }
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('[E-Code Desktop] Update downloaded:', info.version);
  mainWindow?.setProgressBar(-1);
  
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Update Ready',
    message: `Version ${info.version} has been downloaded.`,
    detail: 'The update will be installed when you restart the application.',
    buttons: ['Restart Now', 'Later'],
  }).then((result) => {
    if (result.response === 0) {
      autoUpdater.quitAndInstall(false, true);
    }
  });
});

autoUpdater.on('error', (error) => {
  console.error('[E-Code Desktop] Auto-updater error:', error);
  mainWindow?.setProgressBar(-1);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-status', { 
      status: 'error', 
      error: error.message,
      retrying: updateRetries < MAX_UPDATE_RETRIES
    });
  }
  
  // Retry update check with exponential backoff
  retryUpdateCheck();
});

// Periodic update checks (every 4 hours in production)
if (!isDev) {
  setInterval(() => {
    autoUpdater.checkForUpdatesAndNotify().catch(err => {
      console.log('[E-Code Desktop] Periodic update check failed:', err.message);
    });
  }, 4 * 60 * 60 * 1000);
}

// ============================================
// IPC Handlers - Native Desktop Features
// ============================================

// App info
ipcMain.handle('get-app-version', () => app.getVersion());
ipcMain.handle('get-platform', () => process.platform);
ipcMain.handle('get-app-path', (event, name) => app.getPath(name));
ipcMain.handle('is-dev', () => isDev);
ipcMain.handle('is-packaged', () => app.isPackaged);

// Theme
ipcMain.handle('get-system-theme', () => nativeTheme.shouldUseDarkColors ? 'dark' : 'light');
ipcMain.handle('set-theme-source', (event, source) => {
  nativeTheme.themeSource = source; // 'light', 'dark', 'system'
  store.set('theme', source);
});

// Listen for native theme changes and notify renderer
nativeTheme.on('updated', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('theme-changed', nativeTheme.shouldUseDarkColors ? 'dark' : 'light');
  }
});

// File dialogs
ipcMain.handle('show-save-dialog', async (event, options) => {
  return await dialog.showSaveDialog(mainWindow, options);
});

ipcMain.handle('show-open-dialog', async (event, options) => {
  return await dialog.showOpenDialog(mainWindow, options);
});

ipcMain.handle('show-message-box', async (event, options) => {
  return await dialog.showMessageBox(mainWindow, options);
});

// File system operations
ipcMain.handle('read-file', async (event, filePath) => {
  try {
    return await fs.promises.readFile(filePath, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to read file: ${error.message}`);
  }
});

ipcMain.handle('write-file', async (event, filePath, content) => {
  try {
    await fs.promises.writeFile(filePath, content, 'utf-8');
    return true;
  } catch (error) {
    throw new Error(`Failed to write file: ${error.message}`);
  }
});

ipcMain.handle('file-exists', async (event, filePath) => {
  try {
    await fs.promises.access(filePath);
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle('read-directory', async (event, dirPath) => {
  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    return entries.map(entry => ({
      name: entry.name,
      isDirectory: entry.isDirectory(),
      isFile: entry.isFile(),
    }));
  } catch (error) {
    throw new Error(`Failed to read directory: ${error.message}`);
  }
});

// Additional file system operations
ipcMain.handle('delete-file', async (event, filePath) => {
  try {
    await fs.promises.unlink(filePath);
    return true;
  } catch (error) {
    throw new Error(`Failed to delete file: ${error.message}`);
  }
});

ipcMain.handle('mkdir', async (event, dirPath) => {
  try {
    await fs.promises.mkdir(dirPath, { recursive: true });
    return true;
  } catch (error) {
    throw new Error(`Failed to create directory: ${error.message}`);
  }
});

ipcMain.handle('stat', async (event, filePath) => {
  try {
    const stats = await fs.promises.stat(filePath);
    return {
      size: stats.size,
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
      mtime: stats.mtime.toISOString(),
      ctime: stats.ctime.toISOString(),
    };
  } catch (error) {
    throw new Error(`Failed to get file stats: ${error.message}`);
  }
});

ipcMain.handle('rename', async (event, oldPath, newPath) => {
  try {
    await fs.promises.rename(oldPath, newPath);
    return true;
  } catch (error) {
    throw new Error(`Failed to rename file: ${error.message}`);
  }
});

ipcMain.handle('copy', async (event, src, dest) => {
  try {
    fs.copyFileSync(src, dest);
    return true;
  } catch (error) {
    throw new Error(`Failed to copy file: ${error.message}`);
  }
});

ipcMain.handle('append-file', async (event, filePath, content) => {
  try {
    await fs.promises.appendFile(filePath, content, 'utf-8');
    return true;
  } catch (error) {
    throw new Error(`Failed to append to file: ${error.message}`);
  }
});

// File watchers registry
const fileWatchers = new Map();
let watcherId = 0;

ipcMain.handle('watch-file', (event, filePath) => {
  try {
    const id = ++watcherId;
    const watcher = fs.watch(filePath, (eventType, filename) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('file-changed', { id, eventType, filename, path: filePath });
      }
    });
    fileWatchers.set(id, watcher);
    return id;
  } catch (error) {
    throw new Error(`Failed to watch file: ${error.message}`);
  }
});

ipcMain.handle('unwatch-file', (event, id) => {
  const watcher = fileWatchers.get(id);
  if (watcher) {
    watcher.close();
    fileWatchers.delete(id);
    return true;
  }
  return false;
});

// Shell operations
ipcMain.handle('open-external', async (event, url) => {
  await shell.openExternal(url);
});

ipcMain.handle('open-path', async (event, path) => {
  await shell.openPath(path);
});

ipcMain.handle('show-item-in-folder', (event, path) => {
  shell.showItemInFolder(path);
});

// Window operations
ipcMain.handle('minimize-window', () => mainWindow?.minimize());
ipcMain.handle('maximize-window', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
ipcMain.handle('close-window', () => mainWindow?.close());
ipcMain.handle('is-maximized', () => mainWindow?.isMaximized() ?? false);
ipcMain.handle('is-fullscreen', () => mainWindow?.isFullScreen() ?? false);
ipcMain.handle('set-fullscreen', (event, flag) => mainWindow?.setFullScreen(flag));

// Store operations
ipcMain.handle('store-get', (event, key, defaultValue) => store.get(key, defaultValue));
ipcMain.handle('store-set', (event, key, value) => store.set(key, value));
ipcMain.handle('store-delete', (event, key) => store.delete(key));

// Clipboard
ipcMain.handle('clipboard-write-text', (event, text) => {
  require('electron').clipboard.writeText(text);
});
ipcMain.handle('clipboard-read-text', () => {
  return require('electron').clipboard.readText();
});

// ============================================
// Recent Files Management
// ============================================
const MAX_RECENT_FILES = 10;

ipcMain.handle('get-recent-files', () => {
  return store.get('recentFiles', []);
});

ipcMain.handle('add-recent-file', (event, filePath) => {
  const recentFiles = store.get('recentFiles', []);
  
  // Remove if already exists
  const filtered = recentFiles.filter(f => f.path !== filePath);
  
  // Add to beginning with timestamp
  filtered.unshift({
    path: filePath,
    name: path.basename(filePath),
    directory: path.dirname(filePath),
    timestamp: Date.now()
  });
  
  // Keep only MAX_RECENT_FILES
  const trimmed = filtered.slice(0, MAX_RECENT_FILES);
  store.set('recentFiles', trimmed);
  
  // Update application menu with recent files
  updateRecentFilesMenu(trimmed);
  
  return trimmed;
});

ipcMain.handle('remove-recent-file', (event, filePath) => {
  const recentFiles = store.get('recentFiles', []);
  const filtered = recentFiles.filter(f => f.path !== filePath);
  store.set('recentFiles', filtered);
  updateRecentFilesMenu(filtered);
  return filtered;
});

ipcMain.handle('clear-recent-files', () => {
  store.set('recentFiles', []);
  updateRecentFilesMenu([]);
  return [];
});

// Update File > Open Recent submenu - rebuilds entire application menu
// (Electron's Menu API doesn't support dynamic submenu updates)
function updateRecentFilesMenu(recentFiles) {
  // Store recent files for menu rebuilding
  store.set('recentFiles', recentFiles);
  
  // Rebuild entire application menu with updated recent files
  createMenuWithRecentFiles(recentFiles);
}

// Build application menu with dynamic recent files
function createMenuWithRecentFiles(recentFiles = []) {
  const isMac = process.platform === 'darwin';
  
  // Build recent files submenu items
  const recentFilesSubmenu = recentFiles.length > 0 
    ? [
        ...recentFiles.map(file => ({
          label: file.name,
          sublabel: file.directory,
          toolTip: file.path,
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('open-recent-file', file.path);
            }
          }
        })),
        { type: 'separator' },
        {
          label: 'Clear Recent Files',
          click: () => {
            store.set('recentFiles', []);
            createMenuWithRecentFiles([]);
          }
        }
      ]
    : [
        {
          label: 'No Recent Files',
          enabled: false
        }
      ];

  const template = [
    // App menu (macOS only)
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        {
          label: 'Preferences...',
          accelerator: 'Cmd+,',
          click: () => mainWindow?.webContents.send('menu-preferences'),
        },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    }] : []),

    // File menu with dynamic recent files
    {
      label: 'File',
      submenu: [
        {
          label: 'New Project',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow?.webContents.send('menu-new-project'),
        },
        {
          label: 'Open Project...',
          accelerator: 'CmdOrCtrl+O',
          click: () => mainWindow?.webContents.send('menu-open-project'),
        },
        {
          label: 'Open Recent',
          submenu: recentFilesSubmenu
        },
        { type: 'separator' },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow?.webContents.send('menu-save'),
        },
        {
          label: 'Save All',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => mainWindow?.webContents.send('menu-save-all'),
        },
        { type: 'separator' },
        ...(!isMac ? [
          {
            label: 'Preferences',
            accelerator: 'Ctrl+,',
            click: () => mainWindow?.webContents.send('menu-preferences'),
          },
          { type: 'separator' },
        ] : []),
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },

    // Edit menu
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'pasteAndMatchStyle' },
        { role: 'delete' },
        { role: 'selectAll' },
        { type: 'separator' },
        {
          label: 'Find',
          accelerator: 'CmdOrCtrl+F',
          click: () => mainWindow?.webContents.send('menu-find'),
        },
        {
          label: 'Find and Replace',
          accelerator: 'CmdOrCtrl+H',
          click: () => mainWindow?.webContents.send('menu-find-replace'),
        },
      ],
    },

    // View menu
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        {
          label: 'Toggle File Explorer',
          accelerator: 'CmdOrCtrl+B',
          click: () => mainWindow?.webContents.send('menu-toggle-sidebar'),
        },
        {
          label: 'Toggle Terminal',
          accelerator: 'CmdOrCtrl+J',
          click: () => mainWindow?.webContents.send('menu-toggle-terminal'),
        },
        {
          label: 'Toggle AI Assistant',
          accelerator: 'CmdOrCtrl+Shift+A',
          click: () => mainWindow?.webContents.send('menu-toggle-ai'),
        },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        { type: 'separator' },
        { role: 'toggleDevTools', visible: isDev },
      ],
    },

    // Window menu
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac ? [
          { type: 'separator' },
          { role: 'front' },
          { type: 'separator' },
          { role: 'window' },
        ] : [
          { role: 'close' },
        ]),
      ],
    },

    // Help menu
    {
      label: 'Help',
      submenu: [
        {
          label: 'Documentation',
          click: () => shell.openExternal('https://docs.e-code.ai'),
        },
        {
          label: 'Report Issue',
          click: () => shell.openExternal('https://github.com/e-code/issues'),
        },
        { type: 'separator' },
        {
          label: 'Check for Updates...',
          click: () => checkForUpdates(),
        },
        { type: 'separator' },
        {
          label: 'About E-Code',
          click: () => showAboutDialog(),
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// ============================================
// Update Management IPC
// ============================================
ipcMain.handle('check-for-updates', () => {
  if (isDev) {
    return { status: 'dev-mode', message: 'Updates disabled in development' };
  }
  autoUpdater.checkForUpdatesAndNotify();
  return { status: 'checking' };
});

ipcMain.handle('install-update', () => {
  autoUpdater.quitAndInstall(false, true);
});

ipcMain.handle('get-update-info', () => {
  return {
    currentVersion: app.getVersion(),
    autoUpdate: store.get('autoUpdate', true),
    channel: autoUpdater.channel
  };
});

ipcMain.handle('set-auto-update', (event, enabled) => {
  store.set('autoUpdate', enabled);
  autoUpdater.autoDownload = enabled;
});

// ============================================
// App Lifecycle
// ============================================

// Register ecode:// protocol for deep linking
app.setAsDefaultProtocolClient('ecode');

// Handle deep link on macOS (open-url event)
app.on('open-url', (event, url) => {
  event.preventDefault();
  handleDeepLink(url);
});

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Focus existing window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
    
    // Handle deep link on Windows/Linux (protocol in command line)
    const url = commandLine.find(arg => arg.startsWith('ecode://'));
    if (url) {
      handleDeepLink(url);
    }
  });

  app.whenReady().then(() => {
    // Show splash screen
    createSplashWindow();
    
    // Create main window after a short delay
    setTimeout(() => {
      createWindow();
      
      // Create system tray
      createTray();
      
      // Check for updates in production
      if (!isDev && store.get('autoUpdate', true)) {
        setTimeout(() => {
          autoUpdater.checkForUpdatesAndNotify();
        }, 5000);
      }
      
      // Handle deep link if app was started with a URL (Windows/Linux)
      const url = process.argv.find(arg => arg.startsWith('ecode://'));
      if (url) {
        // Delay to ensure window is ready
        setTimeout(() => handleDeepLink(url), 1000);
      }
    }, 500);

    app.on('activate', () => {
      // On macOS, re-create window when dock icon is clicked
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });
}

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Before quit - comprehensive cleanup (Fortune 500-Grade)
app.on('before-quit', async () => {
  console.log('[E-Code Desktop] Before quit - starting cleanup');
  
  try {
    // 1. Close all file watchers
    for (const [id, watcher] of fileWatchers) {
      try {
        watcher?.close?.();
        console.log(`[E-Code Desktop] Closed file watcher: ${id}`);
      } catch (e) {
        console.warn(`[E-Code Desktop] Failed to close watcher ${id}:`, e.message);
      }
    }
    fileWatchers.clear();
    
    // 2. Close all WebSocket connections
    for (const ws of wsConnections) {
      try {
        if (ws && ws.readyState === 1) { // OPEN state
          ws.close(1000, 'Application closing');
        }
      } catch (e) {
        console.warn('[E-Code Desktop] Failed to close WebSocket:', e.message);
      }
    }
    wsConnections.length = 0;
    
    // 3. Save window state
    if (mainWindow && !mainWindow.isDestroyed()) {
      const bounds = mainWindow.getBounds();
      const isMaximized = mainWindow.isMaximized();
      store.set('windowBounds', bounds);
      store.set('windowMaximized', isMaximized);
      console.log('[E-Code Desktop] Window state saved:', { bounds, isMaximized });
    }
    
    // 4. Clean up temporary files
    const tempDir = path.join(app.getPath('temp'), 'e-code');
    try {
      if (fs.existsSync(tempDir)) {
        await fs.promises.rm(tempDir, { recursive: true, force: true });
        console.log('[E-Code Desktop] Cleaned up temp directory');
      }
    } catch (e) {
      console.warn('[E-Code Desktop] Failed to clean temp dir:', e.message);
    }
    
    // 5. Close all managed windows
    windowManager.closeAll();
    
    // 6. Destroy tray
    if (tray && !tray.isDestroyed()) {
      tray.destroy();
      tray = null;
    }
    
    console.log('[E-Code Desktop] Cleanup completed successfully');
  } catch (error) {
    console.error('[E-Code Desktop] Cleanup error:', error);
  }
});

// Security: Prevent navigation to unknown URLs
app.on('web-contents-created', (event, contents) => {
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    const loadPath = getLoadPath();
    
    // Allow navigation to our app URLs
    if (loadPath.type === 'url') {
      const appUrl = new URL(loadPath.path);
      if (parsedUrl.origin === appUrl.origin) {
        return; // Allow
      }
    }
    
    // Allow localhost in dev mode
    if (isDev && parsedUrl.hostname === 'localhost') {
      return;
    }
    
    // Block other navigations and open in external browser
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });

  // Disable webview
  contents.on('will-attach-webview', (event, webPreferences, params) => {
    event.preventDefault();
  });
});

// Handle certificate errors (allow in dev mode only)
if (isDev) {
  app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
    if (url.startsWith('https://localhost')) {
      event.preventDefault();
      callback(true);
    } else {
      callback(false);
    }
  });
}

console.log('[E-Code Desktop] Application initialized');
console.log(`[E-Code Desktop] Mode: ${isDev ? 'Development' : 'Production'}`);
console.log(`[E-Code Desktop] Platform: ${process.platform}`);
console.log(`[E-Code Desktop] Version: ${app.getVersion()}`);
