import {
  app,
  BrowserWindow,
  clipboard,
  dialog,
  ipcMain,
  Menu,
  nativeImage,
  nativeTheme,
  Notification,
  protocol,
  safeStorage,
  shell,
  Tray,
} from 'electron';
import updater from 'electron-updater';
import { execFile } from 'child_process';
import fs from 'fs/promises';
import fsSync from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { promisify } from 'util';

const { autoUpdater } = updater;
const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const APP_PROTOCOL = 'ecode';
const CLOUD_URL = process.env.ECODE_CLOUD_URL || 'https://e-code.ai';

let mainWindow = null;
let tray = null;
const pendingDeepLinks = [];
const pendingCliArgs = [];

const appPaths = {
  preload: path.join(__dirname, 'preload.js'),
  icon512: path.join(__dirname, '../client/public/icons/icon-512x512.png'),
  icon128: path.join(__dirname, '../client/public/icons/icon-128x128.png'),
  localIndex: path.join(__dirname, '../dist/public/index.html'),
  offline: path.join(__dirname, 'offline.html'),
};

const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
}

function sendToRenderer(channel, payload) {
  if (!mainWindow || mainWindow.webContents.isDestroyed()) {
    if (channel === 'desktop:deep-link') pendingDeepLinks.push(payload);
    if (channel === 'desktop:cli-args') pendingCliArgs.push(payload);
    return;
  }
  mainWindow.webContents.send(channel, payload);
}

function parseStartupArgs(argv) {
  const args = argv.slice(1);
  const deepLinks = args.filter((arg) => arg.startsWith(`${APP_PROTOCOL}://`));
  const folders = args
    .filter((arg) => !arg.startsWith('-') && !arg.startsWith(`${APP_PROTOCOL}://`))
    .filter((arg) => fsSync.existsSync(arg))
    .map((arg) => path.resolve(arg));
  return { raw: args, deepLinks, folders };
}

function normalizeDeepLink(rawUrl) {
  try {
    const url = new URL(rawUrl);
    const [, projectId] = url.pathname.split('/');
    return {
      url: rawUrl,
      action: url.hostname,
      projectId: projectId || url.searchParams.get('projectId') || null,
      params: Object.fromEntries(url.searchParams.entries()),
    };
  } catch {
    return { url: rawUrl, action: 'invalid', projectId: null, params: {} };
  }
}

function ensureProtocolRegistration() {
  if (process.defaultApp) {
    app.setAsDefaultProtocolClient(APP_PROTOCOL, process.execPath, [path.resolve(process.argv[1])]);
  } else {
    app.setAsDefaultProtocolClient(APP_PROTOCOL);
  }
}

function getStorePath(name) {
  return path.join(app.getPath('userData'), `${name}.json`);
}

async function readJsonStore(name, fallback = {}) {
  try {
    const raw = await fs.readFile(getStorePath(name), 'utf8');
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function writeJsonStore(name, data) {
  await fs.mkdir(app.getPath('userData'), { recursive: true });
  await fs.writeFile(getStorePath(name), JSON.stringify(data, null, 2), 'utf8');
}

async function readDirectoryTree(rootPath, depth = 4) {
  const stat = await fs.stat(rootPath);
  const node = {
    name: path.basename(rootPath),
    path: rootPath,
    isDirectory: stat.isDirectory(),
    isFile: stat.isFile(),
    size: stat.size,
    modifiedAt: stat.mtime.toISOString(),
    children: [],
  };

  if (!stat.isDirectory() || depth <= 0) return node;

  const entries = await fs.readdir(rootPath, { withFileTypes: true });
  const visibleEntries = entries
    .filter((entry) => !['node_modules', '.git', 'dist', 'build'].includes(entry.name))
    .sort((a, b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name))
    .slice(0, 500);

  node.children = await Promise.all(
    visibleEntries.map((entry) => readDirectoryTree(path.join(rootPath, entry.name), depth - 1))
  );
  return node;
}

async function openLocalProject(folderPath) {
  const resolvedPath = path.resolve(folderPath);
  const stat = await fs.stat(resolvedPath);
  if (!stat.isDirectory()) {
    throw new Error('Selected path is not a directory');
  }

  const projects = await readJsonStore('local-projects', { projects: [] });
  const existing = projects.projects.find((project) => project.path === resolvedPath);
  const project = {
    id: existing?.id || `local-${Buffer.from(resolvedPath).toString('base64url')}`,
    name: path.basename(resolvedPath),
    path: resolvedPath,
    openedAt: new Date().toISOString(),
    tree: await readDirectoryTree(resolvedPath),
    sync: {
      mode: 'offline-first',
      cloudConnected: Boolean(process.env.ECODE_CLOUD_URL),
      lastSyncedAt: existing?.sync?.lastSyncedAt || null,
    },
  };

  projects.projects = [project, ...projects.projects.filter((item) => item.path !== resolvedPath)].slice(0, 25);
  await writeJsonStore('local-projects', projects);
  return project;
}

async function detectDocker() {
  try {
    const [versionResult, infoResult] = await Promise.all([
      execFileAsync('docker', ['version', '--format', '{{json .}}'], { timeout: 5000 }),
      execFileAsync('docker', ['info', '--format', '{{json .}}'], { timeout: 5000 }),
    ]);
    return {
      available: true,
      runtime: 'docker',
      version: JSON.parse(versionResult.stdout),
      info: JSON.parse(infoResult.stdout),
    };
  } catch (error) {
    return {
      available: false,
      runtime: 'docker',
      error: error.message,
    };
  }
}

function encryptSecret(value) {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('OS keychain encryption is not available on this machine');
  }
  return safeStorage.encryptString(value).toString('base64');
}

function decryptSecret(value) {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('OS keychain encryption is not available on this machine');
  }
  return safeStorage.decryptString(Buffer.from(value, 'base64'));
}

async function loadApplication(window) {
  const explicitUrl = process.env.ECODE_DESKTOP_URL || process.env.VITE_DEV_SERVER_URL;

  if (explicitUrl) {
    await window.loadURL(explicitUrl);
    return;
  }

  if (fsSync.existsSync(appPaths.localIndex)) {
    await window.loadFile(appPaths.localIndex);
    return;
  }

  if (fsSync.existsSync(appPaths.offline)) {
    await window.loadFile(appPaths.offline);
    return;
  }

  await window.loadURL(CLOUD_URL);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    title: 'E-Code',
    backgroundColor: '#0a0a0a',
    icon: appPaths.icon512,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: appPaths.preload,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    flushStartupEvents();
  });

  loadApplication(mainWindow).catch(async (error) => {
    console.error('Failed to load desktop application:', error);
    if (fsSync.existsSync(appPaths.offline)) {
      await mainWindow.loadFile(appPaths.offline);
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.on('page-title-updated', (event) => event.preventDefault());
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function flushStartupEvents() {
  const parsed = parseStartupArgs(process.argv);
  if (parsed.deepLinks.length || parsed.folders.length) {
    sendToRenderer('desktop:cli-args', parsed);
    parsed.deepLinks.map(normalizeDeepLink).forEach((link) => sendToRenderer('desktop:deep-link', link));
  }
  pendingCliArgs.splice(0).forEach((args) => sendToRenderer('desktop:cli-args', args));
  pendingDeepLinks.splice(0).forEach((link) => sendToRenderer('desktop:deep-link', link));
}

function focusMainWindow() {
  if (!mainWindow) createWindow();
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
}

function emitMenuCommand(command, payload = {}) {
  focusMainWindow();
  sendToRenderer(`menu:${command}`, payload);
}

function createApplicationMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        { label: 'New Project', accelerator: 'CmdOrCtrl+N', click: () => emitMenuCommand('new-project') },
        { label: 'Open Cloud Project', accelerator: 'CmdOrCtrl+O', click: () => emitMenuCommand('open-project') },
        { label: 'Open Local Folder...', accelerator: 'CmdOrCtrl+Shift+O', click: () => emitMenuCommand('open-local-folder') },
        { type: 'separator' },
        { label: 'Save', accelerator: 'CmdOrCtrl+S', click: () => emitMenuCommand('save') },
        { label: 'Save All', accelerator: 'CmdOrCtrl+Shift+S', click: () => emitMenuCommand('save-all') },
        { type: 'separator' },
        { label: 'Settings', accelerator: 'CmdOrCtrl+,', click: () => emitMenuCommand('preferences') },
        { type: 'separator' },
        { role: process.platform === 'darwin' ? 'close' : 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
        { type: 'separator' },
        { label: 'Find', accelerator: 'CmdOrCtrl+F', click: () => emitMenuCommand('find') },
        { label: 'Replace', accelerator: 'CmdOrCtrl+Alt+F', click: () => emitMenuCommand('find-replace') },
      ],
    },
    {
      label: 'View',
      submenu: [
        { label: 'Quick Open', accelerator: 'CmdOrCtrl+P', click: () => emitMenuCommand('quick-open') },
        { label: 'Command Palette', accelerator: 'CmdOrCtrl+K', click: () => emitMenuCommand('command-palette') },
        { type: 'separator' },
        { label: 'Toggle Sidebar', accelerator: 'CmdOrCtrl+B', click: () => emitMenuCommand('toggle-sidebar') },
        { label: 'Toggle Terminal', accelerator: 'CmdOrCtrl+J', click: () => emitMenuCommand('toggle-terminal') },
        { label: 'Toggle AI Panel', accelerator: 'CmdOrCtrl+Shift+A', click: () => emitMenuCommand('toggle-ai') },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Run',
      submenu: [
        { label: 'Run Code', accelerator: 'F5', click: () => emitMenuCommand('run-code') },
        { label: 'Stop Execution', accelerator: 'Shift+F5', click: () => emitMenuCommand('stop-execution') },
        { label: 'New Terminal', accelerator: 'Ctrl+`', click: () => emitMenuCommand('new-terminal') },
        { label: 'Clear Terminal', accelerator: 'CmdOrCtrl+Shift+K', click: () => emitMenuCommand('clear-terminal') },
        { type: 'separator' },
        { label: 'Detect Docker Runtime', click: () => emitMenuCommand('detect-docker') },
      ],
    },
    {
      label: 'Window',
      submenu: [{ role: 'minimize' }, { role: 'zoom' }, { type: 'separator' }, { role: 'front' }],
    },
    {
      label: 'Help',
      submenu: [
        { label: 'Keyboard Shortcuts', accelerator: 'CmdOrCtrl+/', click: () => emitMenuCommand('show-shortcuts') },
        { label: 'Open Logs Folder', click: () => shell.openPath(app.getPath('logs')) },
        { label: 'Check for Updates', click: () => autoUpdater.checkForUpdates().catch((error) => sendToRenderer('desktop:update-error', error.message)) },
        { type: 'separator' },
        { label: 'E-Code Website', click: () => shell.openExternal(CLOUD_URL) },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createTray() {
  const image = nativeImage.createFromPath(appPaths.icon128).resize({ width: 18, height: 18 });
  tray = new Tray(image);
  tray.setToolTip('E-Code');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Show E-Code', click: focusMainWindow },
    { label: 'New Project', click: () => emitMenuCommand('new-project') },
    { label: 'Open Local Folder...', click: () => emitMenuCommand('open-local-folder') },
    { label: 'Settings', click: () => emitMenuCommand('preferences') },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  ]));
  tray.on('click', focusMainWindow);
}

function configureAutoUpdater() {
  autoUpdater.autoDownload = false;
  autoUpdater.on('checking-for-update', () => sendToRenderer('desktop:update-status', { status: 'checking' }));
  autoUpdater.on('update-available', (info) => sendToRenderer('desktop:update-status', { status: 'available', info }));
  autoUpdater.on('update-not-available', (info) => sendToRenderer('desktop:update-status', { status: 'not-available', info }));
  autoUpdater.on('download-progress', (progress) => sendToRenderer('desktop:update-status', { status: 'downloading', progress }));
  autoUpdater.on('update-downloaded', (info) => sendToRenderer('desktop:update-status', { status: 'downloaded', info }));
  autoUpdater.on('error', (error) => sendToRenderer('desktop:update-error', error.message));
}

function registerIpcHandlers() {
  ipcMain.handle('app:get-version', () => app.getVersion());
  ipcMain.handle('app:get-platform', () => process.platform);
  ipcMain.handle('app:get-path', (_event, name) => app.getPath(name));
  ipcMain.handle('app:is-dev', () => !app.isPackaged);
  ipcMain.handle('app:is-packaged', () => app.isPackaged);
  ipcMain.handle('theme:get-system', () => nativeTheme.shouldUseDarkColors ? 'dark' : 'light');
  ipcMain.handle('theme:set-source', (_event, source) => { nativeTheme.themeSource = source; });

  ipcMain.handle('dialog:save', (_event, options) => dialog.showSaveDialog(mainWindow, options));
  ipcMain.handle('dialog:open', (_event, options) => dialog.showOpenDialog(mainWindow, options));
  ipcMain.handle('dialog:message', (_event, options) => dialog.showMessageBox(mainWindow, options));

  ipcMain.handle('fs:read-file', async (_event, filePath) => fs.readFile(filePath, 'utf8'));
  ipcMain.handle('fs:write-file', async (_event, filePath, content) => {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, 'utf8');
    return true;
  });
  ipcMain.handle('fs:file-exists', async (_event, filePath) => fsSync.existsSync(filePath));
  ipcMain.handle('fs:read-directory', async (_event, dirPath) => {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries.map((entry) => ({ name: entry.name, isDirectory: entry.isDirectory(), isFile: entry.isFile() }));
  });
  ipcMain.handle('local-project:open-dialog', async () => {
    const result = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory', 'createDirectory'] });
    if (result.canceled || !result.filePaths[0]) return { canceled: true };
    return { canceled: false, project: await openLocalProject(result.filePaths[0]) };
  });
  ipcMain.handle('local-project:open-path', async (_event, folderPath) => openLocalProject(folderPath));
  ipcMain.handle('local-project:list', async () => readJsonStore('local-projects', { projects: [] }));

  ipcMain.handle('shell:open-external', (_event, url) => shell.openExternal(url));
  ipcMain.handle('shell:open-path', (_event, targetPath) => shell.openPath(targetPath));
  ipcMain.handle('shell:show-item-in-folder', (_event, targetPath) => shell.showItemInFolder(targetPath));

  ipcMain.handle('window:minimize', () => mainWindow?.minimize());
  ipcMain.handle('window:maximize', () => mainWindow?.isMaximized() ? mainWindow.unmaximize() : mainWindow?.maximize());
  ipcMain.handle('window:close', () => mainWindow?.close());
  ipcMain.handle('window:is-maximized', () => Boolean(mainWindow?.isMaximized()));
  ipcMain.handle('window:is-fullscreen', () => Boolean(mainWindow?.isFullScreen()));
  ipcMain.handle('window:set-fullscreen', (_event, flag) => mainWindow?.setFullScreen(Boolean(flag)));

  ipcMain.handle('store:get', async (_event, key, defaultValue) => {
    const store = await readJsonStore('desktop-store');
    return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : defaultValue;
  });
  ipcMain.handle('store:set', async (_event, key, value) => {
    const store = await readJsonStore('desktop-store');
    store[key] = value;
    await writeJsonStore('desktop-store', store);
  });
  ipcMain.handle('store:delete', async (_event, key) => {
    const store = await readJsonStore('desktop-store');
    delete store[key];
    await writeJsonStore('desktop-store', store);
  });

  ipcMain.handle('secrets:set', async (_event, key, value) => {
    const secrets = await readJsonStore('desktop-secrets');
    secrets[key] = encryptSecret(value);
    await writeJsonStore('desktop-secrets', secrets);
    return true;
  });
  ipcMain.handle('secrets:get', async (_event, key) => {
    const secrets = await readJsonStore('desktop-secrets');
    return secrets[key] ? decryptSecret(secrets[key]) : null;
  });
  ipcMain.handle('secrets:delete', async (_event, key) => {
    const secrets = await readJsonStore('desktop-secrets');
    delete secrets[key];
    await writeJsonStore('desktop-secrets', secrets);
    return true;
  });

  ipcMain.handle('clipboard:write-text', (_event, text) => clipboard.writeText(text));
  ipcMain.handle('clipboard:read-text', () => clipboard.readText());
  ipcMain.handle('notification:show', (_event, options) => {
    if (!Notification.isSupported()) return false;
    new Notification(options).show();
    return true;
  });
  ipcMain.handle('runtime:detect-docker', () => detectDocker());
  ipcMain.handle('sync:cloud-status', () => ({
    online: mainWindow?.webContents.getURL().startsWith('http') || Boolean(process.env.ECODE_CLOUD_URL),
    cloudUrl: CLOUD_URL,
    mode: 'offline-first',
  }));
  ipcMain.handle('updater:check', () => autoUpdater.checkForUpdates());
  ipcMain.handle('updater:download', () => autoUpdater.downloadUpdate());
  ipcMain.handle('updater:install', () => autoUpdater.quitAndInstall());
}

protocol.registerSchemesAsPrivileged([
  { scheme: APP_PROTOCOL, privileges: { standard: true, secure: true, supportFetchAPI: false } },
]);

app.on('second-instance', (_event, argv) => {
  focusMainWindow();
  const parsed = parseStartupArgs(argv);
  sendToRenderer('desktop:cli-args', parsed);
  parsed.deepLinks.map(normalizeDeepLink).forEach((link) => sendToRenderer('desktop:deep-link', link));
});

app.on('open-url', (event, url) => {
  event.preventDefault();
  focusMainWindow();
  sendToRenderer('desktop:deep-link', normalizeDeepLink(url));
});

app.whenReady().then(() => {
  ensureProtocolRegistration();
  registerIpcHandlers();
  configureAutoUpdater();
  createApplicationMenu();
  createTray();
  createWindow();

  nativeTheme.on('updated', () => {
    sendToRenderer('theme:changed', nativeTheme.shouldUseDarkColors ? 'dark' : 'light');
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else focusMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
