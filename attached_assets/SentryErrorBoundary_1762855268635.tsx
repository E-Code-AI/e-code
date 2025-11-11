/**
 * ============================================================================
 * SENTRY ERROR BOUNDARY - Fortune 500 Grade
 * ============================================================================
 * Wrapper around Sentry's ErrorBoundary with custom fallback UI
 * Catches all React component errors and reports them to Sentry
 */

import React from "react";
import * as Sentry from "@sentry/react";
import { ErrorFallbackUI } from "./ErrorFallbackUI";

interface SentryErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<any>;
  showDialog?: boolean;
  dialogOptions?: any;
  level?: "error" | "warning" | "info";
  beforeCapture?: (scope: Sentry.Scope) => void;
}

/**
 * Main Error Boundary component
 * 
 * Usage:
 * ```tsx
 * <SentryErrorBoundary>
 *   <App />
 * </SentryErrorBoundary>
 * ```
 * 
 * With custom fallback:
 * ```tsx
 * <SentryErrorBoundary fallback={CustomErrorUI}>
 *   <MyComponent />
 * </SentryErrorBoundary>
 * ```
 */
export function SentryErrorBoundary({
  children,
  fallback,
  showDialog = false,
  dialogOptions,
  level = "error",
  beforeCapture,
}: SentryErrorBoundaryProps) {
  return (
    <Sentry.ErrorBoundary
      fallback={(errorData) => {
        // Use custom fallback or default ErrorFallbackUI
        const FallbackComponent = fallback || ErrorFallbackUI;
        return <FallbackComponent {...errorData} />;
      }}
      showDialog={showDialog}
      dialogOptions={dialogOptions}
      beforeCapture={(scope, error, componentStack) => {
        // Add custom context
        scope.setLevel(level);
        scope.setTag("error_boundary", "react");
        scope.setContext("component", {
          componentStack,
        });

        // Allow custom before capture logic
        if (beforeCapture) {
          beforeCapture(scope);
        }
      }}
      onError={(error, componentStack, eventId) => {
        // Custom error logging
        console.error("[Sentry Error Boundary] Caught error:", {
          error,
          componentStack,
          eventId,
        });

        // Track error in analytics (if available)
        if (typeof window !== "undefined" && (window as any).gtag) {
          (window as any).gtag("event", "exception", {
            description: error.message,
            fatal: true,
          });
        }
      }}
      onReset={() => {
        console.log("[Sentry Error Boundary] Error boundary reset");
      }}
    >
      {children}
    </Sentry.ErrorBoundary>
  );
}

/**
 * HOC to wrap a component with error boundary
 * 
 * Usage:
 * ```tsx
 * const SafeComponent = withErrorBoundary(MyComponent);
 * ```
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryOptions?: Partial<SentryErrorBoundaryProps>
) {
  const WrappedComponent = (props: P) => (
    <SentryErrorBoundary {...errorBoundaryOptions}>
      <Component {...props} />
    </SentryErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name || "Component"})`;

  return WrappedComponent;
}

/**
 * Error boundary for specific sections (e.g., IDE panels)
 * Uses a simpler fallback for better UX
 */
export function SectionErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <Sentry.ErrorBoundary
      fallback={({ error, resetError }) => (
        <div className="flex items-center justify-center h-full p-4">
          <div className="text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Impossible de charger cette section
            </p>
            <button
              onClick={resetError}
              className="text-sm text-primary hover:underline"
            >
              Réessayer
            </button>
          </div>
        </div>
      )}
      beforeCapture={(scope) => {
        scope.setTag("error_boundary", "section");
      }}
    >
      {children}
    </Sentry.ErrorBoundary>
  );
}

// Export Sentry's Error Boundary for advanced use cases
export { ErrorBoundary as BaseSentryErrorBoundary } from "@sentry/react";
