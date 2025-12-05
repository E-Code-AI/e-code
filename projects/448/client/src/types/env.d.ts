/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_APP_ENV: 'development' | 'staging' | 'production' | 'test'
  readonly VITE_SENTRY_DSN?: string
  readonly VITE_ENABLE_MOCKS?: 'true' | 'false'
  readonly VITE_FEATURE_FLAG_EXAMPLE?: 'on' | 'off'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      readonly VITE_API_BASE_URL?: string
      readonly VITE_APP_ENV?: 'development' | 'staging' | 'production' | 'test'
      readonly VITE_SENTRY_DSN?: string
      readonly VITE_ENABLE_MOCKS?: 'true' | 'false'
      readonly VITE_FEATURE_FLAG_EXAMPLE?: 'on' | 'off'
    }
  }

  // Allow process.env style access in client code when using polyfills/shims
  // Note: In Vite, prefer import.meta.env, but this helps with shared code.
  // eslint-disable-next-line no-var
  var process: {
    env: NodeJS.ProcessEnv
  }
}

export {}