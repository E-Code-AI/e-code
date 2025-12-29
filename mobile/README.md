# E-Code Mobile App

A React Native application built with Expo SDK 54 that lets you access your E-Code projects on the go. The app focuses on the most important workflows for mobile users:

- Authenticate with the platform and persist your session
- Browse your recent projects and inspect metadata
- Open a project, view and edit files, and save changes back to the server
- Execute code through the real mobile execution service and review terminal output

## EAS Build Pipeline (iOS & Android)

### Prerequisites for Production Builds

1. **Install EAS CLI globally:**
   ```bash
   npm install -g eas-cli@latest
   ```

2. **Create an Expo account** at https://expo.dev (required for EAS builds)

3. **Log in to your Expo account:**
   ```bash
   eas login
   ```

4. **Configure your project (first time only):**
   ```bash
   cd mobile
   eas build:configure
   ```

### Build Profiles

The project includes three build profiles in `eas.json`:

| Profile | Purpose | Output | OTA Channel |
|---------|---------|--------|-------------|
| `development` | Local debugging with expo-dev-client | APK (debug) | development |
| `preview` | Internal testing/QA | APK (release) | preview |
| `production` | App Store/Play Store release | AAB/IPA | production |

### Build Commands

| Command | Description |
|---------|-------------|
| `npm run build:dev` | Development build with expo-dev-client (internal) |
| `npm run build:preview` | Preview/staging APK build for testing |
| `npm run build:ios` | Production iOS build (.ipa) |
| `npm run build:android` | Production Android build (.aab) |
| `npm run build:all` | Production builds for both platforms |

### Step-by-Step Build Process

#### For Android APK (Testing/Preview)
```bash
cd mobile
npm install
eas build --profile preview --platform android
```

#### For Android AAB (Production - Play Store)
```bash
cd mobile
npm install
eas build --profile production --platform android
```

#### For iOS (Production - App Store)
```bash
cd mobile
npm install
eas build --profile production --platform ios
```

### Submit to App Stores

| Command | Description |
|---------|-------------|
| `npm run submit:ios` | Submit to Apple App Store |
| `npm run submit:android` | Submit to Google Play Store |
| `npm run submit:all` | Submit to both stores |

### Required Credentials

#### iOS (Apple App Store)

Set these in EAS secrets (https://expo.dev/accounts/[username]/projects/[project]/secrets):

| Secret | Description | How to Get |
|--------|-------------|------------|
| `EXPO_APPLE_ID` | Apple Developer account email | Your Apple ID email |
| `EXPO_APPLE_APP_SPECIFIC_PASSWORD` | App-specific password | https://appleid.apple.com/account/manage |
| `EXPO_APPLE_TEAM_ID` | 10-character Team ID | Apple Developer Portal → Membership |
| `ASC_APP_ID` | App Store Connect App ID | App Store Connect → App → General → App Information |

#### Android (Google Play Store)

| Credential | Description | How to Get |
|------------|-------------|------------|
| `google-services.json` | Service account key | Google Cloud Console → IAM & Admin → Service Accounts |

Place `google-services.json` in the `mobile/` directory or configure via EAS secrets.

### OTA Updates

The app supports Over-The-Air updates via expo-updates:

```bash
# Push an update to all users on the production channel
eas update --branch production --message "Bug fixes and improvements"

# Push to preview channel for testing
eas update --branch preview --message "Testing new feature"
```

## Shared Code Integration

This mobile app shares types and utilities with the main E-Code platform via `@shared/*` imports:

```typescript
import { User, Project, AI_MODELS } from '@shared/mobile-types';
```

The `shared/mobile-types.ts` file exports React Native-compatible types that avoid Drizzle ORM dependencies.

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) 18 or newer
- [Expo CLI](https://docs.expo.dev/) (`npm install -g expo-cli`) – optional but recommended
- An E-Code API server running locally on `http://localhost:5000`

### Installation

```bash
cd mobile
npm install
```

### Running the app

```bash
npm start
```

Expo will open an interactive dashboard where you can:

- Press `i` to launch the iOS simulator
- Press `a` to launch the Android emulator
- Scan the displayed QR code with the Expo Go app on your device

The application reads the API base URL from the Expo configuration. You can override it by setting `EXPO_PUBLIC_API_BASE` before starting Expo:

```bash
EXPO_PUBLIC_API_BASE="https://your-domain.com/api" npm start
```

## Feature overview

### Authentication
- Username/password login against the `/api/mobile/auth/login` endpoint
- **OAuth Support**: Google, GitHub, Twitter/X, Apple via deep linking (`ecode://` scheme)
- Session tokens stored securely using `AsyncStorage`
- Automatic restoration of existing sessions on app launch

### Command Palette (Ctrl+K equivalent)
- **Triple-tap gesture** or shake device to open
- Fuzzy search across all commands using Fuse.js
- Recent commands tracking
- Categories: File, AI, Navigation, System
- Actions: New File, Open File, Ask Agent, Generate Code, Search, Settings

### AI Agent Integration
- **Multi-provider support**: OpenAI, Anthropic, Gemini, xAI, Moonshot
- Model selector with provider icons and descriptions
- Real-time streaming chat with SSE
- Code explanation, bug fixing, refactoring actions
- Context-aware prompts with project files

### Push Notifications
- Expo Notifications integration for iOS and Android
- Server-side token registration at `/api/mobile/notifications/register`
- Notification tap handling with deep navigation to projects

### Offline Support
- **AsyncStorage-backed cache** with TTL and stale-while-revalidate
- Automatic caching of projects, files, and user data
- Network status detection via `@react-native-community/netinfo`
- Background sync for pending changes

### OTA Updates
- Expo Updates integration for instant app updates
- Manual and automatic update checking
- Graceful fallback with reload prompts

### Project Dashboard
- Displays the list of recent projects returned by `/api/mobile/projects`
- Pull-to-refresh support to fetch the latest information
- Inline error handling with retry affordances
- Quick access to project language and activity statistics

### Project Workspace
- Fetches project files from `/api/mobile/projects/:id/files`
- Select, edit, and save file contents back to the server
- Run the active file through `/api/mobile/projects/:id/run`
- Streamlined output viewer showing stdout, stderr, exit code, and execution time

## Project structure

```
mobile/
├── app.config.js           # Expo configuration (environment-aware API URLs)
├── App.tsx                 # Navigation, auth, notifications, command palette
├── eas.json                # EAS Build profiles (dev/preview/production)
├── src/
│   ├── components/         # Reusable UI components
│   │   ├── CodeEditor.tsx
│   │   ├── CommandPalette.tsx
│   │   ├── CommandPaletteGestureWrapper.tsx
│   │   ├── FileExplorer.tsx
│   │   ├── KeyboardToolbar.tsx
│   │   ├── ModelSelector.tsx
│   │   ├── ProjectCard.tsx
│   │   ├── StatusBar.tsx
│   │   ├── SwipeableRow.tsx
│   │   └── Terminal.tsx
│   ├── hooks/              # Custom React hooks
│   │   ├── useCommandPalette.ts
│   │   ├── useProjectContext.ts
│   │   └── useStreamingChat.ts
│   ├── lib/                # Utilities
│   │   └── agentApiClient.ts
│   ├── navigation/         # Navigation types
│   │   ├── AppNavigator.tsx
│   │   └── types.ts
│   ├── screens/            # 15 app screens
│   │   ├── AgentScreen.tsx
│   │   ├── CollaborationScreen.tsx
│   │   ├── DeploymentsScreen.tsx
│   │   ├── EditorScreen.tsx
│   │   ├── FileManagerScreen.tsx
│   │   ├── HelpScreen.tsx
│   │   ├── HomeScreen.tsx
│   │   ├── LoginScreen.tsx
│   │   ├── NotificationsScreen.tsx
│   │   ├── ProfileScreen.tsx
│   │   ├── ProjectScreen.tsx
│   │   ├── SearchScreen.tsx
│   │   ├── SettingsScreen.tsx
│   │   ├── TemplatesScreen.tsx
│   │   └── TerminalScreen.tsx
│   ├── services/           # Business logic services
│   │   ├── ai-provider.ts      # Multi-provider AI config
│   │   ├── api.ts              # HTTP client
│   │   ├── auth.ts             # Authentication helpers
│   │   ├── background-sync.ts  # Expo background tasks
│   │   ├── command-registry.ts # Command palette commands
│   │   ├── config.ts           # Environment-aware configuration
│   │   ├── haptics.ts          # Platform-specific haptic feedback
│   │   ├── notifications.ts    # Push notification service
│   │   ├── oauth.ts            # OAuth deep link handling
│   │   ├── offline-cache.ts    # AsyncStorage cache with TTL
│   │   ├── ota-updates.ts      # Expo Updates service
│   │   ├── project-context.ts  # Project state management
│   │   ├── storage.ts          # Persistent storage wrapper
│   │   └── websocket.ts        # Real-time collaboration
│   └── types.ts            # TypeScript interfaces
└── tsconfig.json           # React Native TypeScript configuration
```

## Testing the API locally

The mobile app relies on the backend mobile routes that are registered under `/api/mobile/*`. Start the main server (from the repository root):

```bash
npm install
npm run dev
```

With the server running you can sign in (default development credentials are `admin` / `admin`), browse your projects, edit files, and execute code directly from the device or emulator.
