/**
 * Expo configuration for E-Code Mobile
 * 
 * REQUIRED ENVIRONMENT VARIABLES FOR PRODUCTION:
 * - EXPO_PUBLIC_API_BASE: The base URL for the API (e.g., https://e-code.ai/api)
 * - EXPO_PUBLIC_ENV: Environment name (development|staging|production)
 * 
 * Example .env file:
 * ```
 * EXPO_PUBLIC_API_BASE=https://e-code.ai/api
 * EXPO_PUBLIC_ENV=production
 * ```
 * 
 * For local development, you can omit these and defaults will be used.
 */
export default ({ config }) => {
  const environment = process.env.EXPO_PUBLIC_ENV || 
    (process.env.NODE_ENV === 'production' ? 'production' : 'development');
  
  // Get API base URL from environment
  // Production/staging MUST set this - no fallback
  const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE;
  
  // Get release channel (for EAS builds)
  const releaseChannel = process.env.EXPO_PUBLIC_RELEASE_CHANNEL || environment;
  
  // Validate production configuration at build time
  if (environment === 'production' && !apiBaseUrl) {
    console.error('');
    console.error('═══════════════════════════════════════════════════════════');
    console.error('  CONFIGURATION ERROR: Missing Production API URL');
    console.error('═══════════════════════════════════════════════════════════');
    console.error('');
    console.error('  Production builds REQUIRE a valid API base URL.');
    console.error('  Please set EXPO_PUBLIC_API_BASE in your environment.');
    console.error('');
    console.error('  Example:');
    console.error('    EXPO_PUBLIC_API_BASE=https://e-code.ai/api');
    console.error('');
    console.error('  Current configuration:');
    console.error(`    Environment: ${environment}`);
    console.error(`    API URL: ${apiBaseUrl || 'NOT SET'}`);
    console.error('');
    console.error('═══════════════════════════════════════════════════════════');
    console.error('');
    throw new Error('Production build requires EXPO_PUBLIC_API_BASE environment variable');
  }
  
  // Log configuration in non-production
  if (environment !== 'production') {
    console.log('[Expo Config]', {
      environment,
      apiBaseUrl: apiBaseUrl || 'Using default (localhost)',
      releaseChannel
    });
  }
  
  return {
    ...config,
    name: 'E-Code',
    slug: 'ecodeai',
    version: '1.0.0',
    sdkVersion: '54.0.0',
    orientation: 'portrait',
    scheme: 'ecode',
    extra: {
      // Pass environment variables to the app
      apiBaseUrl,
      environment,
      releaseChannel,
      eas: {
        projectId: "17ae93ae-3912-48a0-97d1-05d9f7d0799a"
      }
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.ecode.mobile',
      infoPlist: {
        UIBackgroundModes: ['remote-notification'],
      },
      // Deep linking: Universal Links for iOS
      associatedDomains: ['applinks:e-code.ai', 'applinks:www.e-code.ai'],
    },
    android: {
      adaptiveIcon: {
        backgroundColor: '#0f172a'
      },
      package: 'com.ecode.mobile',
      useNextNotificationsApi: true,
      // Deep linking: Intent Filters for Android
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: true,
          data: [
            { scheme: 'https', host: 'e-code.ai', pathPrefix: '/project' },
            { scheme: 'https', host: 'e-code.ai', pathPrefix: '/ide' },
            { scheme: 'https', host: 'www.e-code.ai', pathPrefix: '/project' },
            { scheme: 'https', host: 'www.e-code.ai', pathPrefix: '/ide' },
          ],
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
    },
    plugins: [
      [
        'expo-notifications',
        {
          color: '#38bdf8',
          sounds: [],
        },
      ],
    ],
    web: {
      bundler: 'metro'
    }
  };
};
