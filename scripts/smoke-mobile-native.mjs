import fs from 'fs';
import path from 'path';

const root = process.cwd();

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const files = [
  'capacitor.config.ts',
  'client/src/pages/MobileWorkspace.tsx',
  'client/src/components/mobile/ReplitBottomTabs.tsx',
  'client/src/components/mobile/EnhancedMobileCodeEditor.tsx',
  'client/src/components/mobile/MobileTerminal.tsx',
  'client/src/components/mobile/MobileProjectsPanel.tsx',
  'client/src/lib/mobile-native.ts',
  'ios/App/App/Info.plist',
  'android/app/src/main/AndroidManifest.xml',
];

for (const file of files) {
  assert(fs.existsSync(path.join(root, file)), `Missing mobile file: ${file}`);
}

const workspace = read('client/src/pages/MobileWorkspace.tsx');
const tabs = read('client/src/components/mobile/ReplitBottomTabs.tsx');
const editor = read('client/src/components/mobile/EnhancedMobileCodeEditor.tsx');
const terminal = read('client/src/components/mobile/MobileTerminal.tsx');
const nativeRuntime = read('client/src/lib/mobile-native.ts');
const plist = read('ios/App/App/Info.plist');
const manifest = read('android/app/src/main/AndroidManifest.xml');

for (const token of ['phone-landscape', 'tablet', 'MobileProjectsPanel', 'offlineStorage.addPendingOperation', 'initializeNativeMobileRuntime']) {
  assert(workspace.includes(token), `Mobile workspace missing capability: ${token}`);
}

for (const token of ['Projects', 'Editor', 'AI', 'Terminal', 'Settings']) {
  assert(tabs.includes(token), `Mobile tabs missing label: ${token}`);
}

for (const token of ['CM6Editor', 'wrapSelection', 'pinchDistanceRef', 'keydown', '=>']) {
  assert(editor.includes(token), `Mobile editor missing capability: ${token}`);
}

for (const token of ['xterm', 'Ctrl', 'Esc', 'Tab', 'buildShellWebSocketUrl']) {
  assert(terminal.includes(token), `Mobile terminal missing capability: ${token}`);
}

for (const token of ['PushNotifications', 'Network', 'appUrlOpen']) {
  assert(nativeRuntime.includes(token), `Native runtime missing capability: ${token}`);
}

for (const token of ['NSCameraUsageDescription', 'NSMicrophoneUsageDescription', 'NSPhotoLibraryUsageDescription', 'remote-notification']) {
  assert(plist.includes(token), `iOS Info.plist missing capability: ${token}`);
}

for (const token of ['POST_NOTIFICATIONS', 'RECORD_AUDIO', 'READ_MEDIA_IMAGES', 'resizeableActivity', 'ecode']) {
  assert(manifest.includes(token), `Android manifest missing capability: ${token}`);
}

console.log('Mobile native smoke PASS');
