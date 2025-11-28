# E-Code Desktop Application

Fortune 500-grade native desktop application for the E-Code platform, built with Electron.

## 🚀 Features

- **Native Desktop Experience** - Full native menu, keyboard shortcuts, and system integration
- **Offline Support** - Works with bundled frontend or connects to production server
- **Auto-Updates** - Automatic update checking and installation via electron-updater
- **Cross-Platform** - Builds for macOS, Windows, and Linux
- **Secure IPC** - Context isolation with secure API bridge
- **Native File System** - Read/write files, show save dialogs, open folders
- **System Theme** - Respects system dark/light mode preference
- **Window State** - Remembers window size, position, and maximized state

## 📋 Prerequisites

- Node.js 18.x or higher
- npm 10.x or higher
- Built web frontend (see instructions below)

## 🔧 Installation

```bash
cd desktop
npm install
```

## 🎨 Development Mode

### Option 1: Connect to Dev Server

```bash
# Terminal 1: Start the main development server (from project root)
npm run dev

# Terminal 2: Start Electron in dev mode (from desktop directory)
cd desktop
npm run dev
```

The Electron app will connect to `http://localhost:5000` (the Vite dev server).

### Option 2: Use Built Frontend

```bash
# Build the frontend (from project root)
npm run build

# Prepare renderer files
cd desktop
npm run prepare-renderer

# Start Electron
npm start
```

## 📦 Building for Distribution

### Quick Build (All Platforms)

```bash
cd desktop
node scripts/build-desktop.js --all
```

### Platform-Specific Builds

```bash
# macOS (DMG + ZIP)
node scripts/build-desktop.js --mac

# Windows (NSIS installer + Portable)
node scripts/build-desktop.js --win

# Linux (AppImage + deb + rpm)
node scripts/build-desktop.js --linux
```

### Build Options

```bash
node scripts/build-desktop.js [options]

Options:
  --mac           Build for macOS only
  --win           Build for Windows only
  --linux         Build for Linux only
  --all           Build for all platforms (default)
  --skip-frontend Skip frontend build (use existing dist)
  --skip-icons    Skip icon generation
  --verbose       Show detailed output
```

### Manual Build Process

```bash
# 1. Build the frontend (from project root)
npm run build

# 2. Prepare renderer files
cd desktop
npm run prepare-renderer

# 3. Generate icons (optional, requires sharp)
npm install sharp
node scripts/generate-icons.js

# 4. Build Electron app
npm run build
```

## 📁 Output Files

Build artifacts are in `desktop/dist/`:

### macOS
- `E-Code-1.0.0-x64.dmg` - Intel DMG installer
- `E-Code-1.0.0-arm64.dmg` - Apple Silicon DMG installer
- `E-Code-1.0.0-mac-x64.zip` - Intel ZIP archive
- `E-Code-1.0.0-mac-arm64.zip` - Apple Silicon ZIP archive

### Windows
- `E-Code-1.0.0-win-x64.exe` - 64-bit NSIS installer
- `E-Code-1.0.0-win-arm64.exe` - ARM64 NSIS installer
- `E-Code-1.0.0-portable.exe` - Portable version (no install)

### Linux
- `E-Code-1.0.0-x64.AppImage` - Universal Linux AppImage
- `e-code_1.0.0_amd64.deb` - Debian/Ubuntu package
- `e-code-1.0.0.x86_64.rpm` - Fedora/RHEL package
- `E-Code-1.0.0-x64.tar.gz` - Generic archive

## 🎛️ Keyboard Shortcuts

| Action | macOS | Windows/Linux |
|--------|-------|---------------|
| New Project | ⌘N | Ctrl+N |
| Open Project | ⌘O | Ctrl+O |
| Save | ⌘S | Ctrl+S |
| Save All | ⌘⇧S | Ctrl+Shift+S |
| Preferences | ⌘, | Ctrl+, |
| Find | ⌘F | Ctrl+F |
| Find & Replace | ⌘H | Ctrl+H |
| Quick Open | ⌘P | Ctrl+P |
| Go to Line | ⌘G | Ctrl+G |
| Toggle Sidebar | ⌘B | Ctrl+B |
| Toggle Terminal | ⌘J | Ctrl+J |
| Toggle AI | ⌘⇧A | Ctrl+Shift+A |
| New Terminal | ⌘⇧` | Ctrl+Shift+` |
| Run Code | ⌘↵ | Ctrl+Enter |
| Full Screen | ⌘⌃F | F11 |

## 🔐 Security

The desktop app follows Electron security best practices:

- **Context Isolation** - Renderer process is isolated from Node.js
- **Node Integration Disabled** - No direct Node.js access in renderer
- **Sandbox Mode** - Enhanced security sandbox enabled
- **Web Security Enabled** - CORS and other web security measures
- **Secure IPC** - All communication via validated channels
- **No Webviews** - Webview tag is disabled for security

## 📱 React Integration

Use the `useElectron` hook to integrate with desktop features:

```tsx
import { useElectron, isElectron } from '@/hooks/useElectron';

function MyComponent() {
  const { 
    isDesktop,
    platform,
    appVersion,
    showSaveDialog,
    showOpenDialog,
    openExternal,
    copyToClipboard,
  } = useElectron();

  const handleSave = async () => {
    if (!isDesktop) {
      // Web fallback
      return;
    }

    const result = await showSaveDialog({
      filters: [{ name: 'Text Files', extensions: ['txt'] }]
    });

    if (!result.canceled && result.filePath) {
      // Save file...
    }
  };

  return (
    <div>
      {isDesktop && <span>Desktop v{appVersion}</span>}
      <button onClick={handleSave}>Save</button>
    </div>
  );
}
```

### Menu Event Handling

```tsx
import { useElectronMenuEvents } from '@/hooks/useElectron';

function Editor() {
  useElectronMenuEvents({
    onSave: () => saveCurrentFile(),
    onFind: () => openSearchDialog(),
    onNewTerminal: () => createTerminal(),
  });

  return <MonacoEditor />;
}
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the desktop directory:

```env
# Development server URL
DEV_SERVER_URL=http://localhost:5000

# Production URL (fallback if no bundled renderer)
PRODUCTION_URL=https://e-code.replit.app

# Enable dev tools in production (optional)
ENABLE_DEV_TOOLS=false
```

### electron-builder Configuration

The `build` section in `package.json` contains the complete electron-builder configuration. Key options:

- `appId` - Application identifier
- `productName` - Display name
- `files` - Files to include in the package
- `mac/win/linux` - Platform-specific settings
- `publish` - Auto-update server configuration

## 🔄 Auto-Updates

The app automatically checks for updates on startup (production only). Updates are downloaded in the background and installed on restart.

### Publishing Updates

1. Increment version in `package.json`
2. Build the application
3. Push to your update server (configured in `publish` settings)
4. Users will be notified automatically

## 🐛 Troubleshooting

### App doesn't start
- Ensure renderer files exist in `renderer/` directory
- Run `npm run prepare-renderer` if missing
- Check that `node_modules` is installed

### Icons not showing
- Run `node scripts/generate-icons.js`
- Ensure `resources/` contains icon files
- For icns/ico files, use online converters

### Connection errors
- Check that the backend server is running
- Verify `DEV_SERVER_URL` or `PRODUCTION_URL`
- Check CORS settings on the backend

### Build fails
- Clear build cache: `npm run clean`
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Check Node.js version (requires 18+)

## 📚 Resources

- [Electron Documentation](https://www.electronjs.org/docs)
- [electron-builder Documentation](https://www.electron.build/)
- [E-Code Platform Documentation](../docs/README.md)

## 📄 License

MIT License - See LICENSE file at project root
