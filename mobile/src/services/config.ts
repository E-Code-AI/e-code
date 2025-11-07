import Constants from 'expo-constants';

/**
 * Environment types supported by the mobile app
 */
export type Environment = 'development' | 'staging' | 'production';

/**
 * Configuration interface for type safety
 */
export interface AppConfig {
  apiBaseUrl: string;
  environment: Environment;
  isProduction: boolean;
  isDevelopment: boolean;
  isStaging: boolean;
}

/**
 * Detect the current environment
 * Priority: EXPO_PUBLIC_ENV > __DEV__ > 'production'
 */
function detectEnvironment(): Environment {
  // Check explicit environment variable first
  const envVar = Constants.expoConfig?.extra?.environment as string | undefined;
  if (envVar === 'development' || envVar === 'staging' || envVar === 'production') {
    return envVar;
  }

  // Check Expo release channel (common in production builds)
  const releaseChannel = Constants.expoConfig?.extra?.releaseChannel as string | undefined;
  if (releaseChannel === 'staging') {
    return 'staging';
  }
  if (releaseChannel === 'production') {
    return 'production';
  }

  // Fall back to __DEV__ flag (development mode)
  if (__DEV__) {
    return 'development';
  }

  // Conservative default: assume production to enforce safety
  return 'production';
}

/**
 * Get environment-specific default API URLs
 */
function getDefaultApiUrl(env: Environment): string | null {
  switch (env) {
    case 'development':
      // Development: Allow localhost for testing
      return 'http://localhost:5000/api';
    
    case 'staging':
      // Staging: No safe default - must be configured
      return null;
    
    case 'production':
      // Production: NEVER default to localhost - must be configured
      return null;
  }
}

/**
 * Get the API base URL with environment awareness and validation
 * @throws {Error} If production/staging environment has no configured URL
 */
function getApiBaseUrl(): string {
  const env = detectEnvironment();
  
  // Try to get from Expo config first (highest priority)
  const configuredUrl = Constants.expoConfig?.extra?.apiBaseUrl as string | undefined;
  
  if (configuredUrl) {
    // Validate that production/staging URLs don't point to localhost
    if (env !== 'development' && isLocalhostUrl(configuredUrl)) {
      throw new Error(
        `[CONFIG ERROR] ${env.toUpperCase()} environment cannot use localhost URL. ` +
        `Found: ${configuredUrl}. ` +
        `Please set EXPO_PUBLIC_API_BASE to a valid production URL in your environment.`
      );
    }
    return configuredUrl;
  }
  
  // Get environment-specific default
  const defaultUrl = getDefaultApiUrl(env);
  
  if (!defaultUrl) {
    // Production/staging MUST have a configured URL
    throw new Error(
      `[CONFIG ERROR] No API base URL configured for ${env.toUpperCase()} environment. ` +
      `This is required for production builds. ` +
      `\n\nTo fix this, set one of:` +
      `\n  - EXPO_PUBLIC_API_BASE=https://your-api.example.com/api (recommended)` +
      `\n  - EXPO_PUBLIC_ENV=development (for local testing only)` +
      `\n\nCurrent environment: ${env}` +
      `\nDetected from: ${__DEV__ ? '__DEV__ flag' : 'production mode'}`
    );
  }
  
  return defaultUrl;
}

/**
 * Check if a URL points to localhost
 */
function isLocalhostUrl(url: string): boolean {
  const localhostPatterns = [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '::1',
    '10.0.2.2', // Android emulator localhost
  ];
  
  const lowerUrl = url.toLowerCase();
  return localhostPatterns.some(pattern => lowerUrl.includes(pattern));
}

/**
 * Create the application configuration
 * This will throw an error at app startup if misconfigured in production
 */
function createConfig(): AppConfig {
  const environment = detectEnvironment();
  const apiBaseUrl = getApiBaseUrl();
  
  // Log configuration in development for debugging
  if (__DEV__) {
    console.log('[Mobile Config]', {
      environment,
      apiBaseUrl,
      expoConfig: Constants.expoConfig?.extra
    });
  }
  
  return {
    apiBaseUrl,
    environment,
    isProduction: environment === 'production',
    isDevelopment: environment === 'development',
    isStaging: environment === 'staging'
  };
}

/**
 * Application configuration singleton
 * Will throw at module load time if misconfigured in production
 */
export const config: AppConfig = createConfig();

/**
 * Legacy export for backward compatibility
 * @deprecated Use config.apiBaseUrl instead
 */
export const API_BASE_URL: string = config.apiBaseUrl;

/**
 * Validate configuration at runtime
 * Call this from your app entry point to fail fast
 */
export function validateConfig(): void {
  if (!config.apiBaseUrl) {
    throw new Error('[CONFIG ERROR] API base URL is not configured');
  }
  
  if (config.isProduction && isLocalhostUrl(config.apiBaseUrl)) {
    throw new Error(
      '[CONFIG ERROR] Production build is configured with localhost URL. ' +
      'This will not work on real devices. ' +
      `Current URL: ${config.apiBaseUrl}`
    );
  }
  
  if (__DEV__) {
    console.log('[Config Validation] ✓ Configuration is valid', {
      environment: config.environment,
      apiBaseUrl: config.apiBaseUrl
    });
  }
}
