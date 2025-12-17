# E-Code Mobile App

A React Native application built with Expo that lets you access your E-Code projects on the go. The app focuses on the most important workflows for mobile users:

- Authenticate with the platform and persist your session
- Browse your recent projects and inspect metadata
- Open a project, view and edit files, and save changes back to the server
- Execute code through the real mobile execution service and review terminal output

## EAS Build Pipeline (iOS & Android)

### Prerequisites for Production Builds

1. Install EAS CLI globally:
   ```bash
   npm install -g eas-cli
   ```

2. Log in to your Expo account:
   ```bash
   eas login
   ```

3. Configure your project (first time only):
   ```bash
   eas build:configure
   ```

### Build Commands

| Command | Description |
|---------|-------------|
| `npm run build:dev` | Development build (internal distribution) |
| `npm run build:preview` | Preview/staging build (APK for Android) |
| `npm run build:ios` | Production iOS build (.ipa) |
| `npm run build:android` | Production Android build (.aab) |
| `npm run build:all` | Production builds for both platforms |

### Submit to App Stores

| Command | Description |
|---------|-------------|
| `npm run submit:ios` | Submit to Apple App Store |
| `npm run submit:android` | Submit to Google Play Store |
| `npm run submit:all` | Submit to both stores |

### Required Secrets for Production

Set these in your EAS dashboard or as environment variables:

- `APPLE_ID` - Your Apple Developer account email
- `ASC_APP_ID` - App Store Connect App ID
- `APPLE_TEAM_ID` - Your Apple Team ID
- `google-services.json` - Google Play Console service account key

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
- Session tokens stored securely using `AsyncStorage`
- Automatic restoration of existing sessions on app launch

### Project dashboard
- Displays the list of recent projects returned by `/api/mobile/projects`
- Pull-to-refresh support to fetch the latest information
- Inline error handling with retry affordances
- Quick access to project language and activity statistics

### Project workspace
- Fetches project files from `/api/mobile/projects/:id/files`
- Select, edit, and save file contents back to the server
- Run the active file through `/api/mobile/projects/:id/run`
- Streamlined output viewer showing stdout, stderr, exit code, and execution time

## Project structure

```
mobile/
├── app.config.js        # Expo configuration (with API base URL)
├── App.tsx              # Navigation and session management
├── src/
│   ├── navigation/      # Navigation types
│   ├── screens/         # Login, home, and project screens
│   ├── services/        # API client and configuration helpers
│   └── types.ts         # Shared TypeScript interfaces
└── tsconfig.json        # React Native TypeScript configuration
```

## Testing the API locally

The mobile app relies on the backend mobile routes that are registered under `/api/mobile/*`. Start the main server (from the repository root):

```bash
npm install
npm run dev
```

With the server running you can sign in (default development credentials are `admin` / `admin`), browse your projects, edit files, and execute code directly from the device or emulator.
