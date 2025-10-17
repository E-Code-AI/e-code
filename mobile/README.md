# E-Code Mobile App

A React Native application built with Expo that lets you access your E-Code projects on the go. The app focuses on the most important workflows for mobile users:

- Authenticate with the platform and persist your session
- Browse your recent projects and inspect metadata
- Open a project, view and edit files, and save changes back to the server
- Execute code through the real mobile execution service and review terminal output

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
