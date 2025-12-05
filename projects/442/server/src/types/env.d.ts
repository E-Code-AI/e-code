declare namespace NodeJS {
  interface ProcessEnv {
    readonly NODE_ENV: 'development' | 'test' | 'production';
    readonly PORT?: string;

    readonly LOG_LEVEL?: 'error' | 'warn' | 'info' | 'http' | 'verbose' | 'debug' | 'silly';

    readonly DATABASE_URL: string;
    readonly DATABASE_SSL?: 'true' | 'false';

    readonly REDIS_URL?: string;
    readonly REDIS_HOST?: string;
    readonly REDIS_PORT?: string;
    readonly REDIS_PASSWORD?: string;

    readonly JWT_ACCESS_SECRET: string;
    readonly JWT_REFRESH_SECRET: string;
    readonly JWT_ACCESS_EXPIRES_IN?: string;
    readonly JWT_REFRESH_EXPIRES_IN?: string;

    readonly CORS_ORIGIN?: string;
    readonly CORS_ALLOWED_METHODS?: string;
    readonly CORS_ALLOWED_HEADERS?: string;

    readonly RATE_LIMIT_WINDOW_MS?: string;
    readonly RATE_LIMIT_MAX_REQUESTS?: string;

    readonly SMTP_HOST?: string;
    readonly SMTP_PORT?: string;
    readonly SMTP_SECURE?: 'true' | 'false';
    readonly SMTP_USER?: string;
    readonly SMTP_PASSWORD?: string;
    readonly SMTP_FROM_EMAIL?: string;

    readonly APP_URL?: string;
    readonly FRONTEND_URL?: string;

    readonly SENTRY_DSN?: string;
    readonly SENTRY_ENVIRONMENT?: string;

    readonly AWS_ACCESS_KEY_ID?: string;
    readonly AWS_SECRET_ACCESS_KEY?: string;
    readonly AWS_REGION?: string;
    readonly AWS_S3_BUCKET?: string;

    readonly SESSION_SECRET?: string;

    readonly ENABLE_SWAGGER?: 'true' | 'false';
    readonly ENABLE_METRICS?: 'true' | 'false';

    readonly BCRYPT_SALT_ROUNDS?: string;

    readonly OAUTH_GOOGLE_CLIENT_ID?: string;
    readonly OAUTH_GOOGLE_CLIENT_SECRET?: string;
    readonly OAUTH_GOOGLE_REDIRECT_URI?: string;

    readonly OAUTH_GITHUB_CLIENT_ID?: string;
    readonly OAUTH_GITHUB_CLIENT_SECRET?: string;
    readonly OAUTH_GITHUB_REDIRECT_URI?: string;
  }
}

export {};