/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_NAME: string
  readonly VITE_APP_VERSION: string
  readonly VITE_API_BASE_URL: string
  readonly VITE_API_TIMEOUT_MS?: string
  readonly VITE_ENABLE_MOCKS?: string
  readonly VITE_SENTRY_DSN?: string
  readonly VITE_SENTRY_ENVIRONMENT?: string
  readonly VITE_FEATURE_FLAG_EXAMPLE?: string
  readonly VITE_BUILD_TIMESTAMP?: string
  readonly VITE_BUILD_COMMIT_SHA?: string
  readonly VITE_BUILD_BRANCH?: string
  // Add additional env variables here as needed, all must be prefixed with VITE_
  [key: string]: string | undefined
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/**
 * CSS Modules
 */
declare module '*.module.css' {
  const classes: { readonly [key: string]: string }
  export default classes
}

declare module '*.module.scss' {
  const classes: { readonly [key: string]: string }
  export default classes
}

declare module '*.module.sass' {
  const classes: { readonly [key: string]: string }
  export default classes
}

declare module '*.module.less' {
  const classes: { readonly [key: string]: string }
  export default classes
}

declare module '*.module.styl' {
  const classes: { readonly [key: string]: string }
  export default classes
}

/**
 * Global CSS (non-modules)
 */
declare module '*.css' {
  const css: string
  export default css
}

declare module '*.scss' {
  const scss: string
  export default scss
}

declare module '*.sass' {
  const sass: string
  export default sass
}

declare module '*.less' {
  const less: string
  export default less
}

declare module '*.styl' {
  const styl: string
  export default styl
}

/**
 * Image and asset modules
 */
declare module '*.svg' {
  const src: string
  export default src
}

declare module '*.svg?url' {
  const src: string
  export default src
}

declare module '*.svg?raw' {
  const src: string
  export default src
}

declare module '*.svg?component' {
  import type { FunctionalComponent, SVGAttributes } from 'vue'
  const component: FunctionalComponent<SVGAttributes>
  export default component
}

declare module '*.png' {
  const src: string
  export default src
}

declare module '*.jpg' {
  const src: string
  export default src
}

declare module '*.jpeg' {
  const src: string
  export default src
}

declare module '*.gif' {
  const src: string
  export default src
}

declare module '*.webp' {
  const src: string
  export default src
}

declare module '*.avif' {
  const src: string
  export default src
}

declare module '*.ico' {
  const src: string
  export default src
}

declare module '*.bmp' {
  const src: string
  export default src
}

/**
 * Media modules
 */
declare module '*.mp4' {
  const src: string
  export default src
}

declare module '*.webm' {
  const src: string
  export default src
}

declare module '*.ogg' {
  const src: string
  export default src
}

declare module '*.mp3' {
  const src: string
  export default src
}

declare module '*.wav' {
  const src: string
  export default src
}

declare module '*.flac' {
  const src: string
  export default src
}

declare module '*.aac' {
  const src: string
  export default src
}

/**
 * Font modules
 */
declare module '*.woff' {
  const src: string
  export default src
}

declare module '*.woff2' {
  const src: string
  export default src
}

declare module '*.eot' {
  const src: string
  export default src
}

declare module '*.ttf' {
  const src: string
  export default src
}

declare module '*.otf' {
  const src: string
  export default src
}

/**
 * JSON modules (if not using `resolveJsonModule` in tsconfig)
 */
declare module '*.json' {
  const value: any
  export default value
}