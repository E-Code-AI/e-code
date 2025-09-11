# E-Code

A collaborative code editor and development platform where people create software, learn to code, and build their ideas with zero setup and instant collaboration.

## Progressive Web App (PWA) Features

E-Code is a fully-featured Progressive Web App that provides a native app-like experience with offline capabilities.

### PWA Capabilities

- **Installable**: Add E-Code to your home screen on mobile and desktop
- **Offline Support**: Core functionality works without internet connection
- **Fast Loading**: Intelligent caching for instant app startup
- **Native Integration**: Behaves like a native app when installed
- **Auto Updates**: Seamless updates with user notification

### Installation

#### Desktop (Chrome, Edge, Safari)
1. Visit [e-code.com](https://e-code.com)
2. Look for the install icon in the address bar
3. Click "Install E-Code" or "Add to Applications"

#### Mobile (iOS/Android)
1. Open [e-code.com](https://e-code.com) in your browser
2. **iOS**: Tap Share → "Add to Home Screen"
3. **Android**: Tap the menu → "Add to Home Screen" or "Install App"

### Development & Testing

#### Service Worker Development
The service worker is automatically disabled in development mode for better developer experience. To test PWA functionality:

```bash
# Build the production version
npm run build

# Serve the built files locally
npx serve dist/public

# Open in browser and test PWA features
```

#### Testing Offline Functionality
1. Load the app and navigate through a few pages
2. Open browser DevTools → Application → Service Workers
3. Check "Offline" to simulate offline condition
4. Refresh and navigate - core features should still work

#### Cache Management
The service worker implements intelligent caching strategies:
- **Static Assets**: Cache-first (JS, CSS, images, fonts)
- **API Requests**: Network-first with cache fallback
- **HTML Pages**: Stale-while-revalidate for fast loading

#### Updating the Service Worker
When you make changes that affect the service worker:

1. **Update the cache version** in `client/src/service-worker.ts`:
   ```typescript
   const CACHE_VERSION = 'v2'; // Increment version
   ```

2. **Test the update flow**:
   ```bash
   npm run build
   # Deploy or serve the new version
   # The app will show an update notification
   ```

3. **Force cache clear** (development):
   ```bash
   # In browser DevTools:
   # Application → Storage → Clear Storage → Clear site data
   ```

### Lighthouse PWA Audit

To validate PWA compliance:

1. Open Chrome DevTools
2. Go to Lighthouse tab
3. Select "Progressive Web App" category
4. Run audit
5. Should achieve 100% PWA score

#### Common Issues & Solutions

- **Manifest not detected**: Check that `/manifest.json` is accessible
- **Service worker not registering**: Verify HTTPS or localhost environment
- **Icons not loading**: Ensure icon files exist in `/icons/` directory
- **Offline mode not working**: Check service worker cache strategies

#### PWA Update Notifications

The app automatically detects service worker updates and dispatches a custom event:

```javascript
// Listen for PWA updates
window.addEventListener('pwa:update-available', (event) => {
  // Show update notification to user
  // Call applyServiceWorkerUpdate() to apply update
});
```

### Browser Support

- ✅ Chrome 67+
- ✅ Firefox 44+
- ✅ Safari 11.1+
- ✅ Edge 79+

### Files

PWA implementation includes:
- `client/public/manifest.json` - App manifest
- `client/public/icons/` - PWA icons (multiple sizes)
- `client/public/apple-touch-icon.svg` - Apple touch icon
- `client/src/service-worker.ts` - Service worker implementation
- `client/src/pwa/registerServiceWorker.ts` - Registration logic
