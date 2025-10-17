export default ({ config }) => ({
  ...config,
  name: 'E-Code Mobile',
  slug: 'ecode-mobile',
  version: '1.0.0',
  orientation: 'portrait',
  scheme: 'ecode',
  extra: {
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE ?? 'http://localhost:5000/api'
  },
  ios: {
    supportsTablet: true
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#0f172a'
    }
  },
  web: {
    bundler: 'metro'
  }
});
