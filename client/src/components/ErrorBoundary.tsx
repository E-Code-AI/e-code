// @ts-nocheck
import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { isLazyChunkLoadError, type LazyChunkLoadError } from '@/utils/instrumented-lazy';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  SentryErrorBoundary: React.ComponentType<any> | null;
}

const HARD_RELOAD_KEY = 'lazy-chunk-hard-reload-attempted';

function hardReload() {
  try {
    sessionStorage.setItem(HARD_RELOAD_KEY, String(Date.now()));
  } catch {}

  // Best-effort: clear the service worker / browser caches that might be
  // holding a stale chunk manifest, then reload with a cache-busting query
  // string so the browser re-fetches the entry document and module graph.
  const reloadWithBuster = () => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('_cb', Date.now().toString(36));
      window.location.replace(url.toString());
    } catch {
      window.location.reload();
    }
  };

  const tasks: Promise<unknown>[] = [];

  if ('caches' in window) {
    tasks.push(
      caches.keys()
        .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
        .catch(() => undefined)
    );
  }

  if ('serviceWorker' in navigator) {
    tasks.push(
      navigator.serviceWorker.getRegistrations()
        .then((regs) => Promise.all(regs.map((r) => r.unregister())))
        .catch(() => undefined)
    );
  }

  if (tasks.length === 0) {
    reloadWithBuster();
    return;
  }

  // Don't block the user if cache clearing hangs.
  const timeout = new Promise((resolve) => setTimeout(resolve, 1500));
  Promise.race([Promise.all(tasks), timeout]).finally(reloadWithBuster);
}

function ChunkLoadFallback({ error }: { error: LazyChunkLoadError }) {
  const attempts = error.retryAttempts ?? 0;
  const max = error.maxRetries ?? 0;

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-background"
      role="alert"
      aria-live="assertive"
    >
      <div className="max-w-md w-full px-6 py-8 text-center">
        <RefreshCw className="h-12 w-12 text-muted-foreground mx-auto mb-4" aria-hidden="true" />
        <h1 className="text-2xl font-bold mb-2">We couldn't finish loading this page</h1>
        <p className="text-muted-foreground mb-2">
          A piece of the page failed to download. This usually happens after an
          update or a brief network hiccup.
        </p>
        {max > 0 && (
          <p
            className="text-xs text-muted-foreground mb-4"
            data-testid="text-chunk-retry-count"
          >
            We already retried {attempts} of {max} time{max === 1 ? '' : 's'} automatically.
          </p>
        )}
        <div className="flex gap-2 justify-center">
          <Button onClick={hardReload} data-testid="button-chunk-reload">
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
            Reload page
          </Button>
        </div>
      </div>
    </div>
  );
}

function ErrorFallback({ error, onReset }: { error: Error | null; onReset: () => void }) {
  if (error && isLazyChunkLoadError(error)) {
    return <ChunkLoadFallback error={error} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background" role="alert" aria-live="assertive">
      <div className="max-w-md w-full px-6 py-8 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" aria-hidden="true" />
        <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
        <p className="text-muted-foreground mb-4">
          We encountered an unexpected error. Please try refreshing the page.
        </p>
        {error && (
          <pre className="text-[11px] text-left bg-muted p-3 rounded-md mb-4 overflow-auto max-h-32" aria-label="Error details">
            {error.message}
          </pre>
        )}
        <div className="flex gap-2 justify-center">
          <Button onClick={onReset} data-testid="button-error-retry">Try Again</Button>
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            data-testid="button-error-refresh"
          >
            Refresh Page
          </Button>
        </div>
      </div>
    </div>
  );
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null, SentryErrorBoundary: null };
  }

  componentDidMount() {
    import('@sentry/react').then((Sentry) => {
      if (Sentry.isInitialized()) {
        this.setState({ SentryErrorBoundary: Sentry.ErrorBoundary });
      }
    }).catch(() => {});
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    import('@sentry/react').then((Sentry) => {
      if (Sentry.isInitialized()) {
        Sentry.captureException(error, { extra: errorInfo });
      }
    }).catch(() => {});
    console.error('Error caught by boundary:', {
      message: error?.message || 'Unknown error',
      name: error?.name || 'Unknown',
      stack: error?.stack || 'No stack trace',
      errorInfo: errorInfo?.componentStack || 'No component stack',
      isChunkLoadError: isLazyChunkLoadError(error),
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} onReset={this.handleReset} />;
    }

    const { SentryErrorBoundary } = this.state;
    if (SentryErrorBoundary) {
      return (
        <SentryErrorBoundary
          fallback={({ error, resetError }: { error: Error; resetError: () => void }) => (
            <ErrorFallback error={error} onReset={resetError} />
          )}
        >
          {this.props.children}
        </SentryErrorBoundary>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
