# E-Code - Code, Create, and Learn Together

E-Code is where people create software, learn to code, and build their ideas. With zero setup and instant collaboration.

## Features

- 🚀 **Zero Setup**: Start coding immediately without installation
- 🤝 **Real-time Collaboration**: Work together with others in real-time
- 📱 **Progressive Web App**: Install as a native app with offline support
- 🎨 **Modern IDE**: Full-featured development environment
- 🔧 **Multi-language Support**: Support for various programming languages
- ☁️ **Cloud-based**: Access your projects from anywhere

## Progressive Web App (PWA) Support

E-Code is fully PWA-enabled, providing a native app-like experience with offline functionality.

### PWA Features

- **Installable**: Add E-Code to your home screen or desktop
- **Offline Support**: Continue working even without internet connection
- **Background Updates**: Automatic updates with user-friendly notifications
- **Native Experience**: Full-screen mode and app-like navigation
- **Fast Loading**: Intelligent caching for instant startup

### Installation

#### Desktop (Chrome/Edge/Safari)
1. Visit E-Code in your browser
2. Look for the "Install" button in the address bar or menu
3. Click "Install" to add E-Code to your desktop

#### Mobile (iOS/Android)
1. Open E-Code in your mobile browser
2. Tap the "Share" button (iOS) or menu (Android)
3. Select "Add to Home Screen"
4. E-Code will appear as a native app icon

### Development & Testing

#### Running in Development Mode
```bash
npm run dev
```
**Note**: Service worker is disabled in development mode to avoid caching issues during development.

#### Building for Production
```bash
npm run build
```
This will:
- Build the main application bundle
- Compile the service worker (`src/service-worker.ts`)
- Generate all PWA assets (manifest, icons, etc.)

#### Testing PWA Features

1. **Build and serve locally**:
   ```bash
   npm run build
   npm run start
   ```

2. **Test offline functionality**:
   - Visit the app and navigate around
   - Open browser DevTools → Application → Service Workers
   - Check "Offline" to simulate offline mode
   - Reload the page - it should still work

3. **Test installability**:
   - Open DevTools → Application → Manifest
   - Verify manifest is valid
   - Check for install prompt in supported browsers

#### PWA Development Tips

- **Service Worker Updates**: When updating the service worker, increment the `CACHE_VERSION` in `src/service-worker.ts`
- **Clear Caches**: Use DevTools → Application → Storage → Clear Storage for testing
- **Update Notifications**: The app automatically detects service worker updates and can show update prompts

#### Lighthouse PWA Audit

Run Lighthouse to validate PWA compliance:
```bash
# Using Chrome DevTools
# 1. Open DevTools
# 2. Go to Lighthouse tab
# 3. Select "Progressive Web App" category
# 4. Click "Generate report"

# Or using CLI
npx lighthouse https://your-domain.com --view
```

#### Troubleshooting

**Service Worker Not Updating**
```bash
# Force refresh to bypass cache
Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)

# Or clear all data
# DevTools → Application → Storage → Clear Storage
```

**PWA Not Installable**
- Ensure HTTPS is enabled (required for PWA)
- Check manifest.json is valid and accessible
- Verify service worker is registered successfully
- Ensure app meets PWA installability criteria

**Offline Mode Issues**
- Check service worker registration in DevTools
- Verify cache strategies are working correctly
- Test different network conditions using DevTools throttling

### PWA Architecture

#### Service Worker (`src/service-worker.ts`)
- **Precaching**: Core shell files (index.html, manifest, main CSS/JS)
- **Runtime Caching**:
  - Static assets: Cache-first strategy
  - API requests: Network-first with cache fallback
  - App chunks: Stale-while-revalidate

#### Caching Strategy
- **Static Cache**: Core shell files that rarely change
- **Dynamic Cache**: API responses and dynamic content  
- **Asset Cache**: Images, fonts, and other static resources

#### Update Flow
1. New service worker detected
2. Install in background
3. Notify user of available update
4. User can choose to activate update immediately

## Development

### Setup
```bash
npm install
npm run dev
```

### Building
```bash
npm run build
```

### Environment Variables
Create `.env` file with required configuration:
```env
# Database
DATABASE_URL=your_database_url

# Authentication
JWT_SECRET=your_jwt_secret

# Additional configuration...
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.
