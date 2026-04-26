import fs from 'fs';
import path from 'path';

const root = process.cwd();
const requiredFiles = [
  'electron/main.js',
  'electron/preload.js',
  'electron/offline.html',
  'electron/entitlements.mac.plist',
  'client/src/types/electron.d.ts',
];

const requiredMainCapabilities = [
  'requestSingleInstanceLock',
  'setAsDefaultProtocolClient',
  'new Tray',
  'autoUpdater',
  'safeStorage',
  'runtime:detect-docker',
  'local-project:open-dialog',
  'desktop:deep-link',
];

const requiredPreloadCapabilities = [
  'openLocalProjectDialog',
  'detectDockerRuntime',
  'secretSet',
  'checkForUpdates',
  'onDeepLink',
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

for (const file of requiredFiles) {
  assert(fs.existsSync(path.join(root, file)), `Missing required Electron file: ${file}`);
}

const mainSource = fs.readFileSync(path.join(root, 'electron/main.js'), 'utf8');
const preloadSource = fs.readFileSync(path.join(root, 'electron/preload.js'), 'utf8');
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

for (const token of requiredMainCapabilities) {
  assert(mainSource.includes(token), `Electron main missing capability token: ${token}`);
}

for (const token of requiredPreloadCapabilities) {
  assert(preloadSource.includes(token), `Electron preload missing capability token: ${token}`);
}

assert(packageJson.main === 'electron/main.js', 'package.json main must point to electron/main.js');
assert(packageJson.dependencies?.['electron-updater'], 'electron-updater dependency is required for signed auto-update');
assert(packageJson.build?.protocols?.some((entry) => entry.schemes?.includes('ecode')), 'ecode:// protocol is not registered in electron-builder config');
assert(packageJson.build?.linux?.target?.includes('AppImage'), 'Linux AppImage target missing');
assert(packageJson.build?.linux?.target?.includes('deb'), 'Linux deb target missing');
assert(packageJson.build?.mac?.target?.includes('dmg'), 'macOS dmg target missing');
assert(packageJson.build?.win?.target?.includes('nsis'), 'Windows NSIS target missing');

console.log('Electron desktop smoke PASS');
